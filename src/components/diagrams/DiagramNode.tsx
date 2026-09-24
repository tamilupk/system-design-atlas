import React, { KeyboardEvent } from 'react';
import { DiagramNode as DiagramNodeType, DiagramNodeRole, ImplementationTarget } from '@/types/diagram';
import styles from './DiagramNode.module.css';

interface DiagramNodeProps {
  node: DiagramNodeType;
  implementationTarget?: ImplementationTarget | null;
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
      return (
        <g>
          {/* Client Workstation Display */}
          <rect
            x="-11"
            y="-13"
            width="22"
            height="14"
            rx="2"
            fill={color}
            fillOpacity="0.08"
            stroke={color}
            strokeWidth="1.75"
          />
          {/* Browser / Terminal line accent */}
          <line
            x1="-7"
            y1="-6.5"
            x2="7"
            y2="-6.5"
            stroke={color}
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.45"
          />
          {/* Stand neck & base */}
          <line x1="0" y1="1" x2="0" y2="4.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
          <line x1="-6" y1="4.5" x2="6" y2="4.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
        </g>
      );

    case 'service':
      return (
        <g>
          {/* Top Server Blade */}
          <rect
            x="-11"
            y="-11"
            width="22"
            height="8"
            rx="2"
            fill={color}
            fillOpacity="0.08"
            stroke={color}
            strokeWidth="1.75"
          />
          <circle cx="-7" cy="-7" r="1.2" fill={color} />
          <line x1="-3" y1="-7" x2="2" y2="-7" stroke={color} strokeWidth="1.25" strokeLinecap="round" opacity="0.6" />
          <line x1="4.5" y1="-7" x2="7.5" y2="-7" stroke={color} strokeWidth="1.25" strokeLinecap="round" opacity="0.6" />

          {/* Bottom Server Blade */}
          <rect
            x="-11"
            y="-1"
            width="22"
            height="8"
            rx="2"
            fill={color}
            fillOpacity="0.08"
            stroke={color}
            strokeWidth="1.75"
          />
          <circle cx="-7" cy="3" r="1.2" fill={color} />
          <line x1="-3" y1="3" x2="2" y2="3" stroke={color} strokeWidth="1.25" strokeLinecap="round" opacity="0.6" />
          <line x1="4.5" y1="3" x2="7.5" y2="3" stroke={color} strokeWidth="1.25" strokeLinecap="round" opacity="0.6" />
        </g>
      );

    case 'database':
      return (
        <g>
          {/* Top Cylinder Cap */}
          <ellipse
            cx="0"
            cy="-8"
            rx="9.5"
            ry="3.2"
            fill={color}
            fillOpacity="0.12"
            stroke={color}
            strokeWidth="1.75"
          />
          {/* Cylinder Walls & Bottom Cap */}
          <path
            d="M -9.5 -8 V 8 A 9.5 3.2 0 0 0 9.5 8 V -8"
            fill="none"
            stroke={color}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          {/* Tier 1 Disk Platter Divider */}
          <path
            d="M -9.5 -3 A 9.5 3.2 0 0 0 9.5 -3"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Tier 2 Disk Platter Divider */}
          <path
            d="M -9.5 2.5 A 9.5 3.2 0 0 0 9.5 2.5"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      );

    case 'cache':
      return (
        <path
          d="M1,-13 L-7,-1 L-1,-1 L-3,11 L7,-1 L1,-1 Z"
          fill={color}
          fillOpacity="0.14"
          stroke={color}
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );

    case 'loadbalancer':
      return (
        <g>
          {/* Ingress Line & Hub */}
          <line x1="0" y1="-12" x2="0" y2="-5" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="0" cy="-4" r="2.2" fill={color} />
          {/* Balanced Egress Branches */}
          <path d="M-2,-2 C-6,1 -8,4 -8,8" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
          <path d="M-10.5,5.5 L-8,8.5 L-5.5,5.5" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="0" y1="-2" x2="0" y2="8.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
          <path d="M-2.5,6 L0,8.5 L2.5,6" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2,-2 C6,1 8,4 8,8" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
          <path d="M5.5,5.5 L8,8.5 L10.5,5.5" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );

    case 'queue':
      return (
        <g>
          <rect
            x="-11"
            y="-6"
            width="22"
            height="12"
            rx="2"
            fill={color}
            fillOpacity="0.08"
            stroke={color}
            strokeWidth="1.75"
          />
          <line x1="-3.5" y1="-6" x2="-3.5" y2="6" stroke={color} strokeWidth="1.2" strokeDasharray="1.5 2" opacity="0.6" />
          <line x1="4" y1="-6" x2="4" y2="6" stroke={color} strokeWidth="1.2" strokeDasharray="1.5 2" opacity="0.6" />
          <circle cx="-7.5" cy="0" r="1.5" fill={color} />
          <circle cx="0.25" cy="0" r="1.5" fill={color} />
          <circle cx="7.5" cy="0" r="1.5" fill={color} />
        </g>
      );

    case 'external':
      return (
        <path
          d="M-6,2 C-10,2 -10,-4 -6,-4 C-6,-8.5 2,-8.5 4.5,-4 C8.5,-4 8.5,2 4.5,2 Z"
          fill={color}
          fillOpacity="0.08"
          stroke={color}
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );

    default:
      return <rect x="-6" y="-8" width="12" height="12" rx="2" fill="none" stroke={color} strokeWidth="1.75" />;
  }
};

export const DiagramNode: React.FC<DiagramNodeProps> = ({
  node,
  implementationTarget,
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

  const example = implementationTarget ? node.implementationExamples?.[implementationTarget] : undefined;
  const hasExamples = Boolean(node.implementationExamples);
  const isDashed = node.role === 'external';

  return (
    <g
      className={`${styles.node} ${selected ? styles.selected : ''} ${highlighted ? styles.highlighted : ''} ${dimmed ? styles.dimmed : ''}`}
      transform={`translate(${node.x}, ${node.y})`}
      data-node-id={node.id}
      onClick={() => onClick(node.id)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${node.label} ${node.role}${example ? `; ${implementationTarget?.toUpperCase()} example: ${example.name}` : ''}`}
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
      
      <g transform={hasExamples ? "translate(0, -14)" : "translate(0, -5)"}>
        {renderIcon(node.role, colors.border)}
      </g>
      
      <text
        x="0"
        y={hasExamples ? 10 : 22}
        textAnchor="middle"
        fill={colors.text}
        className={styles.label}
        fontSize="12"
        fontWeight="600"
      >
        {node.label}
      </text>
      {example && (
        <text x="0" y="29" textAnchor="middle" className={styles.cloudExample}>
          <title>{example.name}: {example.note}</title>
          {example.shortLabel}
        </text>
      )}
    </g>
  );
};
