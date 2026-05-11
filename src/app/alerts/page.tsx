'use client';

import { useState } from 'react';
import { useMqttData, publishAction } from '@/hooks/useMqttData';
import { format } from 'date-fns';

const TYPE_CONFIG = {
  fire: { icon: '🔥', color: '#ff3366', label: 'FIRE' },
  gas: { icon: '☁️', color: '#ff8c00', label: 'GAS' },
  temperature: { icon: '🌡️', color: '#ffd700', label: 'TEMP' },
  humidity: { icon: '💧', color: '#a855f7', label: 'HUMIDITY' },
};

export default function AlertsPage() {
  const { alerts, unacknowledgedCount } = useMqttData();
  const [filter, setFilter] = useState<'all' | 'active' | 'fire' | 'gas' | 'temperature' | 'humidity'>('all');
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const filtered = alerts.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !a.acknowledged;
    return a.type === filter;
  });

  const handleAcknowledge = async (id: string) => {
    setAcknowledging(id);
    await publishAction('acknowledgeAlert', undefined, id);
    setAcknowledging(null);
  };

  const handleAcknowledgeAll = async () => {
    for (const alert of alerts.filter((a) => !a.acknowledged)) {
      await publishAction('acknowledgeAlert', undefined, alert.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-100 tracking-wider uppercase">
            Alert Log
          </h1>
          <p className="font-mono text-xs text-slate-500 mt-1">
            {alerts.length} total · {unacknowledgedCount} unacknowledged
          </p>
        </div>
        {unacknowledgedCount > 0 && (
          <button
            onClick={handleAcknowledgeAll}
            className="px-4 py-2 rounded font-mono text-xs font-semibold border border-accent-green/30 bg-accent-green/5 text-accent-green hover:bg-accent-green/10 transition-all"
          >
            ACKNOWLEDGE ALL
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const count = alerts.filter((a) => a.type === type).length;
          return (
            <div
              key={type}
              className="hud-card p-4 cursor-pointer transition-all"
              style={{ borderColor: filter === type ? `${cfg.color}60` : undefined }}
              onClick={() => setFilter(filter === type ? 'all' : type as any)}
            >
              <div className="flex items-center gap-2">
                <span>{cfg.icon}</span>
                <span className="font-mono text-xs text-slate-500">{cfg.label}</span>
              </div>
              <div
                className="font-display text-2xl font-bold mt-2"
                style={{ color: count > 0 ? cfg.color : '#334155' }}
              >
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'active', 'fire', 'gas', 'temperature', 'humidity'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded font-mono text-xs transition-all border"
            style={{
              backgroundColor: filter === f ? '#00d4ff20' : 'transparent',
              borderColor: filter === f ? '#00d4ff40' : '#1e2d4a',
              color: filter === f ? '#00d4ff' : '#475569',
            }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="hud-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
            <span className="text-4xl">✓</span>
            <p className="font-mono text-sm">No alerts in this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bg-border">
                  {['Type', 'Message', 'Value', 'Time', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-mono text-xs text-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((alert) => {
                  const cfg = TYPE_CONFIG[alert.type];
                  return (
                    <tr
                      key={alert.id}
                      className="border-b border-bg-border/50 hover:bg-white/2 transition-colors"
                      style={{ opacity: alert.acknowledged ? 0.5 : 1 }}
                    >
                      <td className="px-4 py-3">
                        <div
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-xs font-semibold border"
                          style={{
                            color: cfg.color,
                            borderColor: `${cfg.color}30`,
                            backgroundColor: `${cfg.color}10`,
                          }}
                        >
                          {cfg.icon} {cfg.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300 max-w-xs">
                        {alert.message}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-sm font-bold"
                        style={{ color: cfg.color }}
                      >
                        {alert.value}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        <div>{format(alert.timestamp, 'HH:mm:ss')}</div>
                        <div className="text-slate-600">{format(alert.timestamp, 'dd MMM yyyy')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="font-mono text-xs"
                          style={{ color: alert.acknowledged ? '#475569' : cfg.color }}
                        >
                          {alert.acknowledged ? 'ACK' : '● ACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!alert.acknowledged && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={acknowledging === alert.id}
                            className="px-3 py-1 rounded font-mono text-xs border border-bg-border text-slate-400 hover:border-accent-green/40 hover:text-accent-green transition-all"
                          >
                            {acknowledging === alert.id ? '...' : 'ACK'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
