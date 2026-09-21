import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DiagramState } from '@/types/diagram';
import { DiagramNode } from './DiagramNode';
import { DiagramEdge } from './DiagramEdge';
import { FlowControls } from './FlowControls';
import styles from './ArchitectureDiagram.module.css';

interface ArchitectureDiagramProps {
  diagramState: DiagramState;
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  activeFlowSequenceId?: string;
  className?: string;
}

export const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({
  diagramState,
  selectedNodeId,
  onNodeClick,
  activeFlowSequenceId,
  className = ''
}) => {
  const { nodes, edges, flowSequences } = diagramState;
  
  const activeFlowSequence = useMemo(() => 
    flowSequences?.find(seq => seq.id === activeFlowSequenceId),
    [flowSequences, activeFlowSequenceId]
  );

  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Reset state when flow sequence changes
  useEffect(() => {
    setCurrentEventIndex(0);
    setIsPlaying(false);
  }, [activeFlowSequenceId]);

  const handleNext = useCallback(() => {
    if (!activeFlowSequence) return;
    setCurrentEventIndex(prev => {
      const next = prev + 1;
      if (next >= activeFlowSequence.events.length) {
        setIsPlaying(false);
        return prev;
      }
      return next;
    });
  }, [activeFlowSequence]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (isPlaying && activeFlowSequence) {
      intervalId = setInterval(() => {
        setCurrentEventIndex(prev => {
          const next = prev + 1;
          if (next >= activeFlowSequence.events.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, 1500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, activeFlowSequence]);

  const currentEvent = activeFlowSequence?.events[currentEventIndex];
  
  const highlightedNodeIds = new Set<string>();
  const highlightedEdgeIds = new Set<string>();
  let hasHighlight = false;

  if (activeFlowSequence && currentEvent) {
    hasHighlight = true;
    currentEvent.highlightNodeIds?.forEach((id: string) => highlightedNodeIds.add(id));
    currentEvent.edgeIds?.forEach(id => highlightedEdgeIds.add(id));
  } else if (selectedNodeId && !activeFlowSequence) {
    hasHighlight = true;
    highlightedNodeIds.add(selectedNodeId);
    edges.forEach(edge => {
      if (edge.from === selectedNodeId || edge.to === selectedNodeId) {
        highlightedEdgeIds.add(edge.id);
        highlightedNodeIds.add(edge.from);
        highlightedNodeIds.add(edge.to);
      }
    });
  }

  // Calculate viewBox
  const viewBox = useMemo(() => {
    if (nodes.length === 0) return '0 0 800 600';
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach(n => {
      minX = Math.min(minX, n.x - 100);
      minY = Math.min(minY, n.y - 100);
      maxX = Math.max(maxX, n.x + 100);
      maxY = Math.max(maxY, n.y + 100);
    });

    const width = Math.max(800, maxX - minX);
    const height = Math.max(600, maxY - minY);
    return `${minX} ${minY} ${width} ${height}`;
  }, [nodes]);

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.svgWrapper}>
        <div className={styles.description} aria-live="polite">
          Architecture diagram showing {nodes.length} nodes and {edges.length} edges.
          {nodes.map(n => `Node ${n.label} (${n.role}). `).join('')}
        </div>
        <svg
          viewBox={viewBox}
          className={styles.svg}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="System architecture diagram"
        >
          {/* Render edges first */}
          <g>
            {edges.map(edge => {
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              
              const isHighlighted = highlightedEdgeIds.has(edge.id);
              const isDimmed = hasHighlight && !isHighlighted;
              
              return (
                <DiagramEdge
                  key={edge.id}
                  edge={edge}
                  fromPos={{ x: fromNode.x, y: fromNode.y }}
                  toPos={{ x: toNode.x, y: toNode.y }}
                  highlighted={isHighlighted}
                  dimmed={isDimmed}
                />
              );
            })}
          </g>
          
          {/* Render nodes */}
          <g>
            {nodes.map(node => {
              const isSelected = node.id === selectedNodeId;
              const isHighlighted = highlightedNodeIds.has(node.id);
              const isDimmed = hasHighlight && !isHighlighted && !isSelected;
              
              return (
                <DiagramNode
                  key={node.id}
                  node={node}
                  selected={isSelected}
                  highlighted={isHighlighted}
                  dimmed={isDimmed}
                  onClick={onNodeClick}
                />
              );
            })}
          </g>
        </svg>
      </div>
      
      {activeFlowSequence && (
        <FlowControls
          flowSequence={activeFlowSequence}
          currentEventIndex={currentEventIndex}
          isPlaying={isPlaying}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onNext={handleNext}
          onReset={() => {
            setIsPlaying(false);
            setCurrentEventIndex(0);
          }}
        />
      )}
    </div>
  );
};
