'use client';

export default function ConnectionStatus({
  mqttConnected,
  sseConnected,
  lastUpdate,
}: {
  mqttConnected: boolean;
  sseConnected: boolean;
  lastUpdate: number;
}) {
  const secondsAgo = Math.floor((Date.now() - lastUpdate) / 1000);
  const fresh = secondsAgo < 10;

  return (
    <div className="flex items-center gap-4 font-mono text-xs">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-accent-blue animate-pulse' : 'bg-slate-600'}`}
        />
        <span className={sseConnected ? 'text-accent-blue' : 'text-slate-600'}>
          SSE {sseConnected ? 'CONNECTED' : 'OFFLINE'}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${mqttConnected ? 'bg-accent-green animate-pulse' : 'bg-accent-red animate-pulse'}`}
        />
        <span className={mqttConnected ? 'text-accent-green' : 'text-accent-red'}>
          MQTT {mqttConnected ? 'LIVE' : 'DISCONNECTED'}
        </span>
      </div>
      <div className="text-slate-600">
        {fresh ? `${secondsAgo}s ago` : `${secondsAgo}s — check ESP32`}
      </div>
    </div>
  );
}
