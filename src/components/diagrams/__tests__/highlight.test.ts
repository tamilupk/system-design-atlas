import { describe, expect, it } from 'vitest';

import type { DiagramEdge, DiagramNode, FlowEvent } from '@/types/diagram';
import { resolveDiagramHighlight } from '../highlight';

function node(id: string): DiagramNode {
  return { id, label: id, role: 'service', x: 0, y: 0 };
}

function edge(id: string, from: string, to: string): DiagramEdge {
  return { id, from, to };
}

function flowEvent(highlightNodeIds: string[], edgeIds: string[]): FlowEvent {
  return { label: 'step', description: 'desc', highlightNodeIds, edgeIds };
}

const NODES = [node('client'), node('app'), node('cache'), node('db')];
const EDGES = [edge('e1', 'client', 'app'), edge('e2', 'app', 'cache'), edge('e3', 'app', 'db')];

describe('resolveDiagramHighlight', () => {
  it('highlights and dims nothing when there is no selection, flow event, or step highlight', () => {
    const result = resolveDiagramHighlight({ nodes: NODES, edges: EDGES });

    expect(result.hasHighlight).toBe(false);
    expect(result.nodeIds.size).toBe(0);
    expect(result.edgeIds.size).toBe(0);
  });

  it('highlights only the step nodes and never any edge', () => {
    const result = resolveDiagramHighlight({
      nodes: NODES,
      edges: EDGES,
      stepHighlightedNodes: ['cache'],
    });

    expect(result.hasHighlight).toBe(true);
    expect([...result.nodeIds]).toEqual(['cache']);
    expect(result.edgeIds.size).toBe(0);
  });

  it('unions step highlights with the active flow event', () => {
    const result = resolveDiagramHighlight({
      nodes: NODES,
      edges: EDGES,
      currentFlowEvent: flowEvent(['client', 'app'], ['e1']),
      stepHighlightedNodes: ['cache'],
    });

    expect(result.hasHighlight).toBe(true);
    expect([...result.nodeIds].sort()).toEqual(['app', 'cache', 'client']);
    expect([...result.edgeIds]).toEqual(['e1']);
  });

  it('keeps step highlights while a flow event highlights nothing', () => {
    const result = resolveDiagramHighlight({
      nodes: NODES,
      edges: EDGES,
      currentFlowEvent: flowEvent([], []),
      stepHighlightedNodes: ['cache'],
    });

    expect(result.hasHighlight).toBe(true);
    expect([...result.nodeIds]).toEqual(['cache']);
  });

  it('lets manual selection win over flow-event and step highlights', () => {
    const result = resolveDiagramHighlight({
      nodes: NODES,
      edges: EDGES,
      selectedNodeId: 'db',
      currentFlowEvent: flowEvent(['client', 'app'], ['e1']),
      stepHighlightedNodes: ['cache'],
    });

    expect(result.hasHighlight).toBe(true);
    // 'db' plus the node on the other side of e3; the flow event and step focus are ignored.
    expect([...result.nodeIds].sort()).toEqual(['app', 'db']);
    expect([...result.edgeIds]).toEqual(['e3']);
  });

  it('still highlights a selected node that has no edges', () => {
    const result = resolveDiagramHighlight({
      nodes: [node('lonely')],
      edges: EDGES,
      selectedNodeId: 'lonely',
    });

    expect(result.hasHighlight).toBe(true);
    expect([...result.nodeIds]).toEqual(['lonely']);
    expect(result.edgeIds.size).toBe(0);
  });

  it('ignores unknown ids so a stale reference cannot dim the whole canvas', () => {
    const result = resolveDiagramHighlight({
      nodes: NODES,
      edges: EDGES,
      currentFlowEvent: flowEvent(['ghost-node'], ['ghost-edge']),
      stepHighlightedNodes: ['another-ghost'],
    });

    expect(result.hasHighlight).toBe(false);
    expect(result.nodeIds.size).toBe(0);
    expect(result.edgeIds.size).toBe(0);
  });

  it('drops unknown step ids while keeping the known ones', () => {
    const result = resolveDiagramHighlight({
      nodes: NODES,
      edges: EDGES,
      stepHighlightedNodes: ['cache', 'ghost'],
    });

    expect([...result.nodeIds]).toEqual(['cache']);
  });

  it('treats an empty step highlight list as no highlight', () => {
    const result = resolveDiagramHighlight({
      nodes: NODES,
      edges: EDGES,
      stepHighlightedNodes: [],
    });

    expect(result.hasHighlight).toBe(false);
  });

  it('is stable across repeated flow resets on the same step', () => {
    const input = {
      nodes: NODES,
      edges: EDGES,
      currentFlowEvent: flowEvent(['client', 'app'], ['e1']),
      stepHighlightedNodes: ['cache'],
    };

    const first = resolveDiagramHighlight(input);
    const afterReset = resolveDiagramHighlight(input);

    expect([...afterReset.nodeIds].sort()).toEqual([...first.nodeIds].sort());
    expect(afterReset.hasHighlight).toBe(first.hasHighlight);
  });
});
