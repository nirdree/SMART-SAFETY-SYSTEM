'use client';

import React from 'react';

interface GaugeProps {
  value: number | null;
  min: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  alertThreshold?: number;
  alertColor?: string;
}

export default function Gauge({
  value,
  min,
  max,
  label,
  unit,
  color,
  alertThreshold,
  alertColor = '#ff3366',
}: GaugeProps) {
  const viewBoxWidth = 200;
  const viewBoxHeight = 170;
  const radius = 70;
  const strokeWidth = 10;
  const cx = viewBoxWidth / 2;
  const cy = viewBoxHeight / 2 + 10;
  const startAngle = -220;
  const endAngle = 40;
  const totalAngle = endAngle - startAngle;

  const pct = value !== null ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const alertPct = alertThreshold !== undefined ? Math.min(1, Math.max(0, (alertThreshold - min) / (max - min))) : null;

  const isAlert = alertThreshold !== undefined && value !== null && value > alertThreshold;
  const activeColor = isAlert ? alertColor : color;

  function polarToXY(angle: number, r: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function arcPath(startDeg: number, endDeg: number, r: number) {
    const s = polarToXY(startDeg, r);
    const e = polarToXY(endDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const trackPath = arcPath(startAngle, endAngle, radius);
  const valueDeg = startAngle + totalAngle * pct;
  const valuePath = value !== null ? arcPath(startAngle, valueDeg, radius) : '';

  const alertDeg = alertPct !== null ? startAngle + totalAngle * alertPct : null;

  // Needle
  const needleAngle = startAngle + totalAngle * pct;
  const needleRad = ((needleAngle - 90) * Math.PI) / 180;
  const needleLen = radius - 8;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  return (
    <div className="flex flex-col items-center gap-0.5 w-full h-full">
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full max-w-xs h-auto"
        style={{ aspectRatio: `${viewBoxWidth} / ${viewBoxHeight}` }}
      >
        <defs>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="#1e2d4a"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Alert threshold tick */}
        {alertDeg !== null && (
          <line
            x1={polarToXY(alertDeg, radius - 16).x}
            y1={polarToXY(alertDeg, radius - 16).y}
            x2={polarToXY(alertDeg, radius + 4).x}
            y2={polarToXY(alertDeg, radius + 4).y}
            stroke={alertColor}
            strokeWidth={2}
            opacity={0.8}
          />
        )}

        {/* Value arc */}
        {value !== null && pct > 0 && (
          <path
            d={valuePath}
            fill="none"
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter={`url(#glow-${label})`}
            style={{ transition: 'all 0.5s ease' }}
          />
        )}

        {/* Needle */}
        {value !== null && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={nx}
              y2={ny}
              stroke={activeColor}
              strokeWidth={2}
              strokeLinecap="round"
              style={{ transition: 'all 0.5s ease' }}
            />
            <circle cx={cx} cy={cy} r={5} fill={activeColor} />
            <circle cx={cx} cy={cy} r={3} fill="#0a0e1a" />
          </>
        )}

        {/* Min / Max labels */}
        <text
          x={polarToXY(startAngle, radius + 16).x}
          y={polarToXY(startAngle, radius + 16).y}
          fill="#475569"
          fontSize="9"
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
        >
          {min}
        </text>
        <text
          x={polarToXY(endAngle, radius + 16).x}
          y={polarToXY(endAngle, radius + 16).y}
          fill="#475569"
          fontSize="9"
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
        >
          {max}
        </text>

        {/* Center value */}
        <text
          x={cx}
          y={cy + 8}
          fill={value !== null ? activeColor : '#334155'}
          fontSize={value !== null ? '22' : '16'}
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
          style={{ transition: 'fill 0.3s ease' }}
        >
          {value !== null ? (Number.isInteger(value) ? value : value.toFixed(1)) : '--'}
        </text>
        <text
          x={cx}
          y={cy + 22}
          fill="#475569"
          fontSize="10"
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
        >
          {unit}
        </text>

        {/* Alert indicator */}
        {isAlert && (
          <circle cx={cx + 28} cy={cy - 28} r={5} fill={alertColor} className="animate-pulse" />
        )}
      </svg>
      <div
        className="font-display text-xs font-semibold tracking-widest uppercase"
        style={{ color: isAlert ? alertColor : '#64748b' }}
      >
        {label}
      </div>
    </div>
  );
}
