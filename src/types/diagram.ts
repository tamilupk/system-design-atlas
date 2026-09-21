export type DiagramNodeRole = 'client' | 'service' | 'database' | 'cache' | 'loadbalancer' | 'queue' | 'external';

export interface DiagramNode {
  readonly id: string;
  readonly label: string;
  readonly role: DiagramNodeRole;
  readonly x: number;
  readonly y: number;
  readonly conceptId?: string;
  readonly description?: string;
}

export interface DiagramEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly style?: 'solid' | 'dashed';
}

export interface FlowEvent {
  readonly label: string;
  readonly edgeIds: readonly string[];
  readonly highlightNodeIds: readonly string[];
  readonly description: string;
}

export interface FlowSequence {
  readonly id: string;
  readonly title: string;
  readonly events: readonly FlowEvent[];
}

export interface DiagramState {
  readonly id: string;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
  readonly flowSequences: readonly FlowSequence[];
}

export interface DiagramDefinition {
  readonly states: Record<string, DiagramState>;
}
