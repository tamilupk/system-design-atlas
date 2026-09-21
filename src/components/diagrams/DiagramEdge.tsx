import React from 'react';
import { DiagramEdge as DiagramEdgeType } from '@/types/diagram';

interface DiagramEdgeProps {
  edge: DiagramEdgeType;
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  highlighted: boolean;
  dimmed: boolean;
}

export const DiagramEdge: React.FC<DiagramEdgeProps> = ({
  edge,
  fromPos,
  toPos,
  highlighted,
  dimmed
}) => {
  // Simple straight line calculation
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  
  // Angle
  const angle = Math.atan2(dy, dx);
  
  // Offset to not draw over the node
  const offset = 55;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // If nodes are too close, don't draw edge
  if (distance < offset * 2) return null;
  
  const startX = fromPos.x + Math.cos(angle) * offset;
  const startY = fromPos.y + Math.sin(angle) * offset;
  
  const endX = toPos.x - Math.cos(angle) * offset;
  const endY = toPos.y - Math.sin(angle) * offset;
  
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const strokeColor = highlighted ? '#2563EB' : '#A3A3A3';
  const strokeWidth = highlighted ? 3 : 2;
  const opacity = dimmed ? 0.2 : 1;
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
      
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isDashed ? "5,5" : "none"}
        markerEnd={`url(#${markerId})`}
        style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
      />
      
      {edge.label && (
        <g transform={`translate(${midX}, ${midY - 10})`}>
          <rect
            x={-edge.label.length * 4 - 4}
            y="-10"
            width={edge.label.length * 8 + 8}
            height="18"
            fill="white"
            rx="4"
          />
          <text
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize="11"
            fill="#525252"
            fontFamily="system-ui, sans-serif"
          >
            {edge.label}
          </text>
        </g>
      )}
    </g>
  );
};
