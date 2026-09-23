import type { DiagramEdge, DiagramNode, FlowEvent } from '@/types/diagram';

/**
 * Resolution of which nodes and edges the diagram should emphasize, and whether anything
 * is emphasized at all (when nothing is, no element is dimmed).
 */
export interface DiagramHighlight {
  readonly nodeIds: ReadonlySet<string>;
  readonly edgeIds: ReadonlySet<string>;
  readonly hasHighlight: boolean;
}

export interface DiagramHighlightInput {
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
  /** Node the reader clicked, if any. */
  readonly selectedNodeId?: string | null;
  /** The flow event currently being shown, if the active flow sequence has one. */
  readonly currentFlowEvent?: FlowEvent;
  /** `LessonStep.highlightedNodes` for the step being displayed. */
  readonly stepHighlightedNodes?: readonly string[];
}

/**
 * Single source of truth for diagram emphasis. Precedence, highest first:
 *
 * 1. **Manual node selection** — exclusive. The selected node plus every node and edge
 *    touching it are highlighted, and step/flow highlights are ignored entirely.
 * 2. **The active flow event** — its `highlightNodeIds` and `edgeIds`.
 * 3. **Step highlights** — unioned with (2), so the components a step is about stay
 *    emphasized while the flow animates, and remain so across flow reset and flow
 *    switching. Step highlights only ever emphasize nodes, never edges.
 *
 * IDs that do not exist in the current diagram state are dropped rather than reported as
 * errors — `validateArchetypeModule` already fails the build on those — so a stale id can
 * never set `hasHighlight` and dim the whole canvas.
 */
export function resolveDiagramHighlight(input: DiagramHighlightInput): DiagramHighlight {
  const { nodes, edges, selectedNodeId, currentFlowEvent, stepHighlightedNodes } = input;
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  if (selectedNodeId) {
    nodeIds.add(selectedNodeId);
    for (const edge of edges) {
      if (edge.from === selectedNodeId || edge.to === selectedNodeId) {
        edgeIds.add(edge.id);
        nodeIds.add(edge.from);
        nodeIds.add(edge.to);
      }
    }
    return { nodeIds, edgeIds, hasHighlight: true };
  }

  const knownNodeIds = new Set(nodes.map((node) => node.id));
  const knownEdgeIds = new Set(edges.map((edge) => edge.id));

  if (currentFlowEvent) {
    for (const nodeId of currentFlowEvent.highlightNodeIds) {
      if (knownNodeIds.has(nodeId)) nodeIds.add(nodeId);
    }
    for (const edgeId of currentFlowEvent.edgeIds) {
      if (knownEdgeIds.has(edgeId)) edgeIds.add(edgeId);
    }
  }

  for (const nodeId of stepHighlightedNodes ?? []) {
    if (knownNodeIds.has(nodeId)) nodeIds.add(nodeId);
  }

  return { nodeIds, edgeIds, hasHighlight: nodeIds.size > 0 || edgeIds.size > 0 };
}
