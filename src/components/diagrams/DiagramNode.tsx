import React, { KeyboardEvent } from 'react';
import { DiagramNode as DiagramNodeType, DiagramNodeRole } from '@/types/diagram';
import styles from './DiagramNode.module.css';

interface DiagramNodeProps {
  node: DiagramNodeType;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  onClick: (nodeId: string) => void;
}

const ROLE_COLORS: Record<DiagramNodeRole, { bg: string; border: string; text: string }> = {
  client: { bg: '#FFFFFF', border: '#171717', text: '#171717' },
  service: { bg: '#EFF6FF', border: '#2563EB', text: '#1E40AF' },
  database: { bg: '#F0FDFA', border: '#0D9488', text: '#115E59' },
  cache: { bg: '#FFFBEB', border: '#D97706', text: '#92400E' },
  loadbalancer: { bg: '#F5F3FF', border: '#7C3AED', text: '#5B21B6' },
  queue: { bg: '#F5F5F5', border: '#737373', text: '#404040' },
  external: { bg: '#FFFFFF', border: '#A3A3A3', text: '#525252' },
};

const renderIcon = (role: DiagramNodeRole, color: string) => {
  switch (role) {
    case 'client':
      return <rect x="-10" y="-12" width="20" height="16" rx="2" fill="none" stroke={color} strokeWidth="2" />;
    case 'service':
      return <circle cx="0" cy="-4" r="8" fill="none" stroke={color} strokeWidth="2" />;
    case 'database':
      return (
        <path d="M-8,-8 C-8,-12 8,-12 8,-8 L8,0 C8,4 -8,4 -8,0 Z M-8,-8 C-8,-4 8,-4 8,-8" fill="none" stroke={color} strokeWidth="2" />
      );
    case 'cache':
      return <path d="M2,-12 L-6,0 L0,0 L-2,12 L6,0 L0,0 Z" fill="none" stroke={color} strokeWidth="2" />;
    case 'loadbalancer':
      return <path d="M0,-10 L0,2 M0,2 L-6,8 M0,2 L6,8 M-8,-6 L8,-6" fill="none" stroke={color} strokeWidth="2" />;
    case 'queue':
      return <path d="M-8,-10 L8,-10 M-8,-4 L8,-4 M-8,2 L8,2" fill="none" stroke={color} strokeWidth="2" />;
    case 'external':
      return <path d="M-6,0 C-10,0 -10,-6 -6,-6 C-6,-10 2,-10 4,-6 C8,-6 8,0 4,0 Z" fill="none" stroke={color} strokeWidth="2" />;
    default:
      return <rect x="-6" y="-8" width="12" height="12" fill="none" stroke={color} strokeWidth="2" />;
  }
};

export const DiagramNode: React.FC<DiagramNodeProps> = ({
  node,
  selected,
  highlighted,
  dimmed,
  onClick
}) => {
  const colors = ROLE_COLORS[node.role] || ROLE_COLORS.service;
  
  const handleKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(node.id);
    }
  };

  const isDashed = node.role === 'external';

  return (
    <g
      className={`${styles.node} ${selected ? styles.selected : ''} ${highlighted ? styles.highlighted : ''} ${dimmed ? styles.dimmed : ''}`}
      transform={`translate(${node.x}, ${node.y})`}
      onClick={() => onClick(node.id)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${node.label} ${node.role}`}
    >
      <rect
        x="-60"
        y="-40"
        width="120"
        height="80"
        rx="8"
        fill={colors.bg}
        stroke={colors.border}
        strokeWidth={selected || highlighted ? 3 : 2}
        strokeDasharray={isDashed ? "4 4" : "none"}
        className={styles.rect}
      />
      
      <g transform="translate(0, -5)">
        {renderIcon(node.role, colors.border)}
      </g>
      
      <text
        x="0"
        y="22"
        textAnchor="middle"
        fill={colors.text}
        className={styles.label}
        fontSize="12"
        fontWeight="600"
      >
        {node.label}
      </text>
    </g>
  );
};
