import React from 'react';
import { DiagramEdge as DiagramEdgeType } from '@/types/diagram';
import styles from './DiagramEdge.module.css';

interface DiagramEdgeProps {
  edge: DiagramEdgeType;
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  highlighted: boolean;
  dimmed: boolean;
  hasReverseEdge?: boolean;
}

export const DiagramEdge: React.FC<DiagramEdgeProps> = ({
  edge,
  fromPos,
  toPos,
  highlighted,
  dimmed,
  hasReverseEdge = false,
}) => {
  // Vector between node centers
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Offset to not draw over the node rect
  const offset = 58;
  
  // If nodes are too close, don't draw edge
  if (distance < offset * 2) return null;
  
  const angle = Math.atan2(dy, dx);
  const startX = fromPos.x + Math.cos(angle) * offset;
  const startY = fromPos.y + Math.sin(angle) * offset;
  
  const endX = toPos.x - Math.cos(angle) * offset;
  const endY = toPos.y - Math.sin(angle) * offset;
  
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const t = edge.labelPosition ?? 0.5;

  let pathD: string;
  let labelX: number;
  let labelY: number;

  if (hasReverseEdge) {
    // Normal perpendicular to line of travel (points to the left side of direction of travel)
    const nx = dy / distance;
    const ny = -dx / distance;
    const curveAmount = 26;
    const ctrlX = midX + nx * (curveAmount * 2);
    const ctrlY = midY + ny * (curveAmount * 2);

    pathD = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
    
    // Position label along quadratic bezier at parameter t
    const oneMinusT = 1 - t;
    labelX = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * ctrlX + t * t * endX;
    labelY = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * ctrlY + t * t * endY;
  } else {
    pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
    labelX = startX + (endX - startX) * t;
    labelY = startY + (endY - startY) * t - 10;
  }

  const strokeColor = highlighted ? '#2563EB' : '#A3A3A3';
  const strokeWidth = highlighted ? 3 : 2;
  const opacity = dimmed ? 0.55 : 1;
  const isDashed = edge.style === 'dashed';
  
  const markerId = `arrowhead-${edge.id}-${highlighted ? 'highlight' : 'default'}`;

  return (
    <g style={{ opacity, transition: 'opacity 0.2s ease' }}>
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} />
        </marker>
      </defs>
      
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={highlighted ? "6,4" : isDashed ? "5,5" : "none"}
        markerEnd={`url(#${markerId})`}
        className={highlighted ? styles.highlightedEdge : ''}
        style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
      />
      
      {edge.label && (
        <g transform={`translate(${labelX}, ${labelY})`} className={styles.labelGroup}>
          <rect
            x={-edge.label.length * 4 - 8}
            y="-10"
            width={edge.label.length * 8 + 16}
            height="20"
            fill="white"
            rx="4"
            stroke="#E5E5E5"
            strokeWidth="0.75"
          />
          <text
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize="11"
            fontWeight="500"
            fill="#404040"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            {edge.label}
          </text>
        </g>
      )}
    </g>
  );
};
