import type { 
  DiagramNode, 
  DiagramEdge, 
  DiagramNodeRole, 
  NodeSpecification,
  ImplementationTarget,
  ImplementationExample,
  FlowSequence, 
  FlowEvent, 
  DiagramState 
} from '@/types/diagram';

/**
 * Creates a strongly typed diagram node with optional concept link and FAANG component spec.
 */
export function createNode(params: {
  id: string;
  label: string;
  role: DiagramNodeRole;
  x: number;
  y: number;
  conceptId?: string;
  description?: string;
  spec?: NodeSpecification;
  implementationExamples?: Partial<Record<ImplementationTarget, ImplementationExample>>;
}): DiagramNode {
  return params;
}

/**
 * Creates a directed edge between two diagram nodes with auto-generated stable ID.
 */
export function createEdge(
  from: string,
  to: string,
  label?: string,
  options?: {
    id?: string;
    style?: 'solid' | 'dashed';
    labelPosition?: number;
  }
): DiagramEdge {
  const edgeId = options?.id || `${from}->${to}${label ? `:${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : ''}`;
  return {
    id: edgeId,
    from,
    to,
    label,
    style: options?.style || 'solid',
    labelPosition: options?.labelPosition,
  };
}

/**
 * Creates an event in an animated flow sequence.
 */
export function createFlowEvent(params: {
  label: string;
  description: string;
  edgeIds: readonly string[];
  highlightNodeIds: readonly string[];
}): FlowEvent {
  return params;
}

/**
 * Bundles a titled animated sequence of events.
 */
export function createFlowSequence(
  id: string, 
  title: string, 
  events: readonly FlowEvent[]
): FlowSequence {
  return { id, title, events };
}

/**
 * Combines nodes, edges, and optional animated flow sequences into a diagram state.
 */
export function createDiagramState(
  id: string,
  nodes: readonly DiagramNode[],
  edges: readonly DiagramEdge[],
  flowSequences: readonly FlowSequence[] = []
): DiagramState {
  return { id, nodes, edges, flowSequences };
}
