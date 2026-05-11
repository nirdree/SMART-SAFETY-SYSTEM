'use client';

import { AlertConditions } from '@/hooks/useMqttData';

const ALERT_INFO = {
  fireDetected: { icon: '🔥', label: 'FLAME DETECTED', color: '#ff3366' },
  gasDetected:  { icon: '☁️', label: 'CO GAS ALERT',  color: '#ff8c00' },
  tempDetected: { icon: '🌡️', label: 'HIGH TEMP',     color: '#ffd700' },
  humidityDetected: { icon: '💧', label: 'HIGH HUMIDITY', color: '#a855f7' },
};

export default function AlertBanner({ conditions }: { conditions: AlertConditions }) {
  const active = (Object.keys(ALERT_INFO) as Array<keyof typeof ALERT_INFO>)
    .filter((k) => conditions[k]);

  if (active.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-accent-green/20 bg-accent-green/5 mb-6">
        <span className="text-accent-green text-lg">✓</span>
        <div>
          <p className="font-display font-semibold text-accent-green text-sm tracking-wider">ALL SYSTEMS NOMINAL</p>
          <p className="font-mono text-xs text-slate-500 mt-0.5">No active alerts — monitoring continues</p>
        </div>
        <div className="ml-auto">
          <span className="w-2 h-2 rounded-full bg-accent-green inline-block animate-pulse-slow"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent-red/40 bg-accent-red/5 mb-6 alert-pulse overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-accent-red/20">
        <span className="text-2xl animate-blink">⚠</span>
        <div>
          <p className="font-display font-bold text-accent-red text-sm tracking-widest">
            {active.length} ACTIVE ALERT{active.length > 1 ? 'S' : ''} — IMMEDIATE ATTENTION REQUIRED
          </p>
          <p className="font-mono text-xs text-slate-400 mt-0.5">Email notification sent to configured address</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-4 py-3">
        {active.map((key) => {
          const info = ALERT_INFO[key];
          return (
            <div
              key={key}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-semibold"
              style={{
                borderColor: `${info.color}40`,
                color: info.color,
                backgroundColor: `${info.color}10`,
              }}
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
