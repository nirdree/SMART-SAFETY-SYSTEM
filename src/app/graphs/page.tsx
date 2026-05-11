'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Brush,
} from 'recharts';
import { useMqttData, HistoryPoint } from '@/hooks/useMqttData';
import { format } from 'date-fns';

const SENSORS = [
  {
    key: 'temperature' as const,
    label: 'Temperature',
    unit: '°C',
    color: '#00d4ff',
    alertColor: '#ff3366',
    min: 0,
    max: 80,
    thresholdKey: 'tempAlert' as const,
    icon: '🌡️',
  },
  {
    key: 'humidity' as const,
    label: 'Humidity',
    unit: '%',
    color: '#a855f7',
    alertColor: '#ff8c00',
    min: 0,
    max: 100,
    thresholdKey: 'humidityAlert' as const,
    icon: '💧',
  },
  {
    key: 'gas' as const,
    label: 'CO Gas (MQ-7)',
    unit: 'ADC',
    color: '#ffd700',
    alertColor: '#ff8c00',
    min: 0,
    max: 4095,
    thresholdKey: 'mq7Alert' as const,
    icon: '☁️',
  },
  {
    key: 'flame' as const,
    label: 'Flame Sensor',
    unit: 'Signal',
    color: '#ff3366',
    alertColor: '#ff3366',
    min: 0,
    max: 1,
    thresholdKey: null,
    icon: '🔥',
  },
];

const TIME_RANGES = [
  { label: '5m', ms: 5 * 60 * 1000 },
  { label: '30m', ms: 30 * 60 * 1000 },
  { label: '1h', ms: 60 * 60 * 1000 },
  { label: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: 'All', ms: 0 },
];

function SensorChart({
  sensor,
  data,
  threshold,
}: {
  sensor: typeof SENSORS[0];
  data: HistoryPoint[];
  threshold?: number;
}) {
  const [timeRange, setTimeRange] = useState(0); // 0 = All

  const filtered = useMemo(() => {
    if (!timeRange) return data;
    const cutoff = Date.now() - timeRange;
    return data.filter((p) => p.timestamp > cutoff);
  }, [data, timeRange]);

  const chartData = useMemo(
    () => filtered.map((p) => ({ t: p.timestamp, v: p.value })),
    [filtered]
  );

  const latest = data[data.length - 1]?.value ?? null;
  const isAlert = threshold !== undefined && latest !== null && latest > threshold;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-bg-card border border-bg-border rounded-lg px-3 py-2 font-mono text-xs">
        <p className="text-slate-400">{format(label, 'HH:mm:ss · dd MMM')}</p>
        <p style={{ color: sensor.color }} className="font-bold text-sm mt-1">
          {payload[0].value?.toFixed(2)} {sensor.unit}
        </p>
        {threshold !== undefined && (
          <p className="text-slate-500 mt-0.5">Threshold: {threshold} {sensor.unit}</p>
        )}
      </div>
    );
  };

  return (
    <div className="hud-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{sensor.icon}</span>
          <div>
            <h3
              className="font-display text-base font-semibold tracking-wider uppercase"
              style={{ color: isAlert ? sensor.alertColor : sensor.color }}
            >
              {sensor.label}
            </h3>
            <p className="font-mono text-xs text-slate-500 mt-0.5">
              {chartData.length} data points
              {threshold !== undefined && ` · Alert at ${threshold} ${sensor.unit}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Current value */}
          <div
            className="font-mono text-xl font-bold px-3 py-1 rounded border"
            style={{
              color: isAlert ? sensor.alertColor : sensor.color,
              borderColor: `${isAlert ? sensor.alertColor : sensor.color}30`,
              backgroundColor: `${isAlert ? sensor.alertColor : sensor.color}10`,
            }}
          >
            {latest !== null ? latest.toFixed(sensor.key === 'gas' ? 0 : 1) : '--'} {sensor.unit}
          </div>

          {/* Time range selector */}
          <div className="flex rounded-lg overflow-hidden border border-bg-border">
            {TIME_RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setTimeRange(r.ms)}
                className="px-2 py-1 font-mono text-xs transition-colors"
                style={{
                  backgroundColor: timeRange === r.ms ? `${sensor.color}20` : 'transparent',
                  color: timeRange === r.ms ? sensor.color : '#475569',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 200 }}>
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 font-mono text-sm">
            No data yet — waiting for ESP32...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${sensor.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={sensor.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={sensor.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
              <XAxis
                dataKey="t"
                tickFormatter={(t) => format(t, 'HH:mm')}
                tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#1e2d4a' }}
                tickLine={false}
              />
              <YAxis
                domain={[sensor.min, sensor.max]}
                tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#1e2d4a' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {threshold !== undefined && (
                <ReferenceLine
                  y={threshold}
                  stroke={sensor.alertColor}
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{
                    value: `⚠ ${threshold}`,
                    fill: sensor.alertColor,
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                    position: 'insideTopRight',
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="v"
                stroke={sensor.color}
                strokeWidth={2}
                fill={`url(#grad-${sensor.key})`}
                dot={false}
                activeDot={{ r: 4, fill: sensor.color }}
                isAnimationActive={false}
              />
              {/* Zoom brush - only for All time */}
              {timeRange === 0 && chartData.length > 20 && (
                <Brush
                  dataKey="t"
                  height={24}
                  stroke={sensor.color}
                  fill="#0a0e1a"
                  travellerWidth={8}
                  tickFormatter={(t) => format(t, 'HH:mm')}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function GraphsPage() {
  const { history, thresholds } = useMqttData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-100 tracking-wider uppercase">
          Sensor Graphs
        </h1>
        <p className="font-mono text-xs text-slate-500 mt-1">
          All-time historical data · Drag the bottom brush to zoom · Up to 10,000 points per sensor
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {SENSORS.map((sensor) => (
          <SensorChart
            key={sensor.key}
            sensor={sensor}
            data={history[sensor.key]}
            threshold={
              sensor.thresholdKey
                ? thresholds[sensor.thresholdKey] as number
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
