import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ImplementationTarget, DiagramState, DiagramNode as DiagramNodeType } from '@/types/diagram';
import { DiagramNode } from './DiagramNode';
import { DiagramEdge } from './DiagramEdge';
import { FlowControls } from './FlowControls';
import { DiagramContextHUD } from './DiagramContextHUD';
import { resolveDiagramHighlight } from './highlight';
import { Maximize2, Info } from 'lucide-react';
import styles from './ArchitectureDiagram.module.css';

interface ArchitectureDiagramProps {
  diagramState: DiagramState;
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  activeFlowSequenceId?: string;
  /**
   * Node IDs the current lesson step wants to draw attention to, from
   * `LessonStep.highlightedNodes`. Precedence, highest first:
   *
   * 1. Manual node selection — exclusive; step and flow highlights are ignored.
   * 2. The active flow event's `highlightNodeIds` / `edgeIds`.
   * 3. These step highlights, unioned with (2) so the components a step is about stay
   *    emphasized while the flow animates, across flow reset and flow switching.
   *
   * Step highlights only ever emphasize nodes, never edges. IDs that do not exist in the
   * current diagram state are ignored, so a stale id cannot dim the whole canvas.
   */
  highlightedNodes?: readonly string[];
  onInspectNode?: (conceptId?: string, node?: DiagramNodeType) => void;
  onAskAIAboutNode?: (conceptId?: string) => void;
  onClearNodeSelection?: () => void;
  className?: string;
  children?: (parts: { Canvas: React.ReactNode; Controls: React.ReactNode }) => React.ReactNode;
}

export const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({
  diagramState,
  selectedNodeId,
  onNodeClick,
  activeFlowSequenceId,
  highlightedNodes,
  onInspectNode,
  onAskAIAboutNode,
  onClearNodeSelection,
  className = '',
  children,
}) => {
  const { nodes, edges, flowSequences } = diagramState;
  const [implementationTarget, setImplementationTarget] = useState<ImplementationTarget | null>(null);
  const implementationTargets = (['tech', 'aws', 'gcp'] as const).filter(provider =>
    nodes.some(node => node.implementationExamples?.[provider]),
  );

  const [selectedFlowId, setSelectedFlowId] = useState<string | undefined>(activeFlowSequenceId);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const didMoveRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setSelectedFlowId(activeFlowSequenceId || (flowSequences && flowSequences[0]?.id));
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [activeFlowSequenceId, flowSequences]);

  const activeFlowSequence = useMemo(() => 
    flowSequences?.find(seq => seq.id === (selectedFlowId || activeFlowSequenceId)),
    [flowSequences, selectedFlowId, activeFlowSequenceId]
  );

  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [flowRunId, setFlowRunId] = useState(0);

  // Touch pad / wheel zoom
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.ctrlKey ? 0.015 : 0.002;
      const delta = -e.deltaY * factor;
      setZoom(prev => {
        const next = Math.max(0.4, Math.min(3.0, prev * (1 + delta)));
        return +next.toFixed(2);
      });
    };

    svgEl.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      svgEl.removeEventListener('wheel', onWheel);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | SVGElement;
    if (target.closest('[data-node-id]') || target.closest('button')) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
    didMoveRef.current = false;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOriginRef.current = { ...pan };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning || !svgRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      didMoveRef.current = true;
    }
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const baseWidth = Math.max(760, nodes.length ? 760 : 800);
    const scaleFactor = (baseWidth / zoom) / rect.width;
    setPan({
      x: panOriginRef.current.x + dx * scaleFactor,
      y: panOriginRef.current.y + dy * scaleFactor,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsPanning(false);
    if (!didMoveRef.current && onClearNodeSelection) {
      onClearNodeSelection();
    }
  };

  const handleFitToPanel = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

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

  const handlePlayFlow = useCallback(() => {
    onClearNodeSelection?.();
    if (activeFlowSequence && currentEventIndex >= activeFlowSequence.events.length - 1) {
      setCurrentEventIndex(0);
    }
    setIsPlaying(true);
    setFlowRunId(prev => prev + 1);
  }, [onClearNodeSelection, activeFlowSequence, currentEventIndex]);

  const handleSelectAndPlayFlow = useCallback((seqId: string) => {
    onClearNodeSelection?.();
    setSelectedFlowId(seqId);
    setCurrentEventIndex(0);
    setIsPlaying(true);
    setFlowRunId(prev => prev + 1);
  }, [onClearNodeSelection]);

  const handleNextFlow = useCallback(() => {
    onClearNodeSelection?.();
    handleNext();
  }, [onClearNodeSelection, handleNext]);

  const handleResetFlow = useCallback(() => {
    setIsPlaying(false);
    setCurrentEventIndex(0);
  }, []);

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
  }, [isPlaying, activeFlowSequence, flowRunId]);

  const currentEvent = activeFlowSequence?.events[currentEventIndex];

  // Single source of truth for emphasis; see `resolveDiagramHighlight` for precedence.
  const { nodeIds: highlightedNodeIds, edgeIds: highlightedEdgeIds, hasHighlight } = resolveDiagramHighlight({
    nodes,
    edges,
    selectedNodeId,
    currentFlowEvent: currentEvent,
    stepHighlightedNodes: highlightedNodes,
  });

  // Calculate viewBox
  const viewBox = useMemo(() => {
    if (nodes.length === 0) return '0 0 800 600';
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach(n => {
      minX = Math.min(minX, n.x - 80);
      minY = Math.min(minY, n.y - 65);
      maxX = Math.max(maxX, n.x + 80);
      maxY = Math.max(maxY, n.y + 65);
    });

    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;

    const width = Math.max(760, boundsWidth);
    const height = Math.max(220, boundsHeight);

    const centeredMinX = minX - (width - boundsWidth) / 2;
    const centeredMinY = minY - (height - boundsHeight) / 2;

    const scaledWidth = width / zoom;
    const scaledHeight = height / zoom;
    const cx = centeredMinX + width / 2 - pan.x;
    const cy = centeredMinY + height / 2 - pan.y;

    return `${cx - scaledWidth / 2} ${cy - scaledHeight / 2} ${scaledWidth} ${scaledHeight}`;
  }, [nodes, zoom, pan]);

  const Canvas = (
    <div className={`${styles.svgWrapper} ${implementationTargets.length ? styles.withImplementationExamples : ''}`}>
      {flowSequences && flowSequences.length > 1 && (
        <div 
          className={styles.flowTabsFloating} 
          role="tablist" 
          aria-label="Architecture flows"
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          <span className={styles.flowTabLabel}>Flows:</span>
          {flowSequences.map(seq => (
            <button
              key={seq.id}
              role="tab"
              aria-selected={seq.id === activeFlowSequence?.id}
              className={`${styles.flowTab} ${seq.id === activeFlowSequence?.id ? styles.flowTabActive : ''}`}
              onClick={() => handleSelectAndPlayFlow(seq.id)}
            >
              {seq.title}
            </button>
          ))}
        </div>
      )}

      <div className={styles.canvasToolbarFloating} aria-label="Diagram view controls">
        <button
          className={styles.toolButton}
          onClick={handleFitToPanel}
          title="Fit to panel"
          aria-label="Fit to panel"
        >
          <Maximize2 size={15} />
        </button>
      </div>

      <div className={styles.description} aria-live="polite">
        Architecture diagram showing {nodes.length} nodes and {edges.length} edges.
        {nodes.map(n => `Node ${n.label} (${n.role}). `).join('')}
      </div>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className={`${styles.svg} ${isPanning ? styles.svgPanning : ''}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="System architecture diagram"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Render edges first */}
        <g>
          {edges.map(edge => {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            
            const isHighlighted = highlightedEdgeIds.has(edge.id);
            const isDimmed = hasHighlight && !isHighlighted;
            const hasReverseEdge = edges.some(e => e.from === edge.to && e.to === edge.from);
            
            return (
              <DiagramEdge
                key={edge.id}
                edge={edge}
                fromPos={{ x: fromNode.x, y: fromNode.y }}
                toPos={{ x: toNode.x, y: toNode.y }}
                highlighted={isHighlighted}
                dimmed={isDimmed}
                hasReverseEdge={hasReverseEdge}
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
                implementationTarget={implementationTarget}
                selected={isSelected}
                highlighted={isHighlighted}
                dimmed={isDimmed}
                onClick={onNodeClick}
              />
            );
          })}
        </g>
      </svg>

      {implementationTargets.length > 0 && (
        <div className={styles.implementationExamples} role="group" aria-label="Implementation examples">
          <span>Examples</span>
          {implementationTargets.map(provider => (
            <button
              key={provider}
              type="button"
              aria-label={`Show ${(provider === 'tech' ? 'Tech' : provider.toUpperCase())} examples`}
              aria-pressed={implementationTarget === provider}
              title={provider === 'tech' ? 'Cloud-agnostic implementation examples; inspect a component for details' : `Toggle ${provider.toUpperCase()} service examples; inspect a component for details`}
              onClick={() => setImplementationTarget(current => current === provider ? null : provider)}
            >
              {(provider === 'tech' ? 'Tech' : provider.toUpperCase())}
            </button>
          ))}
        </div>
      )}

      {/* Floating help tooltip icon in bottom-left */}
      <div className={styles.floatingHelp}>
        <button
          type="button"
          className={styles.floatingHelpBtn}
          title="Click any component in the diagram to explore its role, trade-offs, and failure modes."
          aria-label="Diagram help: Click any component to explore"
        >
          <Info size={15} />
        </button>
        <div className={styles.floatingHelpTooltip} role="tooltip">
          Click any component in the diagram to explore its role, trade-offs, and failure modes.
        </div>
      </div>
    </div>
  );

  const Controls = (
    <div className={styles.controlsWrapper}>
      {activeFlowSequence && (
        <FlowControls
          flowSequence={activeFlowSequence}
          currentEventIndex={currentEventIndex}
          isPlaying={isPlaying}
          onPlay={handlePlayFlow}
          onPause={() => setIsPlaying(false)}
          onNext={handleNextFlow}
          onReset={handleResetFlow}
        />
      )}

      <DiagramContextHUD
        selectedNode={nodes.find(n => n.id === selectedNodeId) || null}
        onInspect={onInspectNode}
        onAskAI={onAskAIAboutNode}
        onClose={onClearNodeSelection}
      />
    </div>
  );

  if (children) {
    return <>{children({ Canvas, Controls })}</>;
  }

  return (
    <div className={`${styles.container} ${className}`}>
      {Canvas}
      {Controls}
    </div>
  );
};
