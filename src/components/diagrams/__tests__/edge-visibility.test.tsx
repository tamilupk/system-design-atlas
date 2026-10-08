import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArchitectureDiagram } from '../ArchitectureDiagram';
import type { DiagramState } from '@/types/diagram';

const diagram: DiagramState = {
  id: 'example',
  edgeLabelVisibility: 'selected-flow',
  nodes: [
    { id: 'app', label: 'App', role: 'service', x: 0, y: 0 },
    { id: 'db', label: 'DB', role: 'database', x: 300, y: 0 },
    { id: 'replica', label: 'Replica', role: 'database', x: 300, y: 200 },
  ],
  edges: [
    { id: 'write', from: 'app', to: 'db', label: 'Write' },
    { id: 'reply', from: 'db', to: 'app', label: 'ACK', visibility: 'active-event' },
    { id: 'read', from: 'app', to: 'replica', label: 'Read', style: 'dashed' },
  ],
  flowSequences: [
    { id: 'create', title: 'Create', events: [
      { label: 'Write', description: 'Persist', edgeIds: ['write'], highlightNodeIds: ['db'] },
      { label: 'Reply', description: 'Acknowledge', edgeIds: ['reply'], highlightNodeIds: ['app'] },
    ] },
    { id: 'lookup', title: 'Lookup', events: [
      { label: 'Lookup', description: 'Resolve', edgeIds: ['read'], highlightNodeIds: ['replica'] },
    ] },
  ],
};

describe('opt-in diagram decluttering', () => {
  it('reveals directed responses at their event and updates labels on flow switching', () => {
    const { container } = render(<ArchitectureDiagram diagramState={diagram} selectedNodeId={null} onNodeClick={() => {}} />);
    const edge = (id: string) => container.querySelector(`[data-edge-id="${id}"]`);
    expect(edge('reply')).toBeNull();
    expect(edge('write')).toHaveTextContent('Write');
    expect(edge('read')).not.toBeNull(); // Dashed reads are not mistaken for responses.
    expect(edge('read')).not.toHaveTextContent('Read');
    fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
    expect(edge('reply')).toHaveTextContent('ACK');
    fireEvent.click(screen.getByRole('button', { name: 'Reset flow' }));
    expect(edge('reply')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Lookup' }));
    expect(edge('write')).not.toHaveTextContent('Write');
    expect(edge('read')).toHaveTextContent('Read');
    expect(edge('reply')).toBeNull();
  });

  it('preserves existing diagrams and labels when there is no selected flow', () => {
    const { container } = render(<ArchitectureDiagram
      diagramState={{ ...diagram, flowSequences: [], edges: diagram.edges.map(edge => ({ ...edge, visibility: undefined })) }}
      selectedNodeId={null} onNodeClick={() => {}}
    />);
    expect(container.querySelectorAll('[data-edge-id]')).toHaveLength(3);
    expect(screen.getByText('Write')).toBeVisible();
    expect(screen.getByText('Read')).toBeVisible();
    expect(screen.getByText('ACK')).toBeVisible();
  });
});
