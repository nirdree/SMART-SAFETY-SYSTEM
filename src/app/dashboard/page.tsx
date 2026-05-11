'use client';

import { useState, useEffect } from 'react';
import { useMqttData } from '@/hooks/useMqttData';
import Gauge from '@/components/Gauge';
import AlertBanner from '@/components/AlertBanner';
import ConnectionStatus from '@/components/ConnectionStatus';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { sensorData, thresholds, alertConditions, connected, sseConnected, alerts, unacknowledgedCount } = useMqttData();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const flameStatus = sensorData.flame === null
    ? { label: 'UNKNOWN', color: '#475569', bg: '#1e2d4a' }
    : sensorData.flame === 0
    ? { label: 'DETECTED', color: '#ff3366', bg: 'rgba(255,51,102,0.1)' }
    : { label: 'CLEAR', color: '#00ff94', bg: 'rgba(0,255,148,0.1)' };

  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-100 tracking-wider uppercase">
            Live Dashboard
          </h1>
          <p className="font-mono text-xs text-slate-500 mt-1" suppressHydrationWarning>
            {new Date(now).toLocaleString()} · Refreshing every 2s
          </p>
        </div>
        <ConnectionStatus
          mqttConnected={connected}
          sseConnected={sseConnected}
          lastUpdate={sensorData.timestamp}
        />
      </div>

      {/* Alert Banner */}
      <AlertBanner conditions={alertConditions} />

      {/* Gauges Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Temperature Gauge */}
        <div className={`hud-card p-5 flex flex-col items-center justify-start min-h-fit ${alertConditions.tempDetected ? 'glow-red border-accent-red/40' : ''}`}>
          <div className="w-full flex justify-between items-center mb-2">
            <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Temp</span>
            {alertConditions.tempDetected && (
              <span className="text-xs font-mono text-accent-red animate-blink">● ALERT</span>
            )}
          </div>
          <Gauge
            value={sensorData.temperature}
            min={0}
            max={80}
            label="Temperature"
            unit="°C"
            color="#00d4ff"
            alertThreshold={thresholds.tempAlert}
            alertColor="#ff3366"
          />
          <div className="mt-1 font-mono text-xs text-slate-500">
            Threshold: <span className="text-accent-orange">{thresholds.tempAlert}°C</span>
          </div>
        </div>

        {/* Humidity Gauge */}
        <div className={`hud-card p-5 flex flex-col items-center justify-start min-h-fit ${alertConditions.humidityDetected ? 'glow-orange border-accent-orange/40' : ''}`}>
          <div className="w-full flex justify-between items-center mb-2">
            <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Humidity</span>
            {alertConditions.humidityDetected && (
              <span className="text-xs font-mono text-accent-orange animate-blink">● ALERT</span>
            )}
          </div>
          <Gauge
            value={sensorData.humidity}
            min={0}
            max={100}
            label="Humidity"
            unit="%"
            color="#a855f7"
            alertThreshold={thresholds.humidityAlert}
            alertColor="#ff8c00"
          />
          <div className="mt-1 font-mono text-xs text-slate-500">
            Threshold: <span className="text-accent-orange">{thresholds.humidityAlert}%</span>
          </div>
        </div>

        {/* Gas Gauge */}
        <div className={`hud-card p-5 flex flex-col items-center justify-start min-h-fit ${alertConditions.gasDetected ? 'glow-orange border-accent-orange/40' : ''}`}>
          <div className="w-full flex justify-between items-center mb-2">
            <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">CO Gas</span>
            {alertConditions.gasDetected && (
              <span className="text-xs font-mono text-accent-orange animate-blink">● ALERT</span>
            )}
          </div>
          <Gauge
            value={sensorData.gas}
            min={0}
            max={2000}
            label="MQ-7 CO"
            unit="ADC"
            color="#ffd700"
            alertThreshold={thresholds.mq7Alert}
            alertColor="#ff8c00"
          />
          <div className="mt-1 font-mono text-xs text-slate-500">
            Threshold: <span className="text-accent-orange">{thresholds.mq7Alert}</span>
          </div>
        </div>

        {/* Flame Status Card */}
        <div
          className={`hud-card p-5 flex flex-col items-center justify-start min-h-fit gap-4 ${alertConditions.fireDetected ? 'alert-pulse glow-red border-accent-red/40' : ''}`}
        >
          <div className="w-full flex justify-between items-center">
            <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Flame</span>
            {!thresholds.fireEnable && (
              <span className="text-xs font-mono text-slate-500">DISABLED</span>
            )}
          </div>

          <div
            className="w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-500"
            style={{
              borderColor: flameStatus.color,
              backgroundColor: flameStatus.bg,
              boxShadow: alertConditions.fireDetected
                ? `0 0 30px ${flameStatus.color}60, 0 0 60px ${flameStatus.color}30`
                : 'none',
            }}
          >
            <span className="text-4xl">
              {sensorData.flame === 0 ? '🔥' : sensorData.flame === 1 ? '✓' : '?'}
            </span>
          </div>

          <div>
            <div
              className="font-display text-lg font-bold tracking-widest text-center"
              style={{ color: flameStatus.color }}
            >
              {flameStatus.label}
            </div>
            <div className="font-mono text-xs text-slate-500 text-center mt-1">
              Sensor: {sensorData.flame === null ? 'N/A' : sensorData.flame === 0 ? 'LOW (Fire!)' : 'HIGH (Safe)'}
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'TEMPERATURE',
            value: sensorData.temperature !== null ? `${sensorData.temperature.toFixed(1)}°C` : '--',
            sub: `Alert at ${thresholds.tempAlert}°C`,
            color: alertConditions.tempDetected ? '#ff3366' : '#00d4ff',
            icon: '🌡️',
          },
          {
            label: 'HUMIDITY',
            value: sensorData.humidity !== null ? `${sensorData.humidity.toFixed(1)}%` : '--',
            sub: `Alert at ${thresholds.humidityAlert}%`,
            color: alertConditions.humidityDetected ? '#ff8c00' : '#a855f7',
            icon: '💧',
          },
          {
            label: 'GAS (ADC)',
            value: sensorData.gas !== null ? sensorData.gas.toString() : '--',
            sub: `Alert at ${thresholds.mq7Alert}`,
            color: alertConditions.gasDetected ? '#ff8c00' : '#ffd700',
            icon: '☁️',
          },
          {
            label: 'ALERTS TODAY',
            value: unacknowledgedCount.toString(),
            sub: `${alerts.length} total recorded`,
            color: unacknowledgedCount > 0 ? '#ff3366' : '#00ff94',
            icon: '⚠️',
          },
        ].map((card) => (
          <div key={card.label} className="hud-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-slate-500 tracking-wider">{card.label}</span>
              <span className="text-lg">{card.icon}</span>
            </div>
            <div
              className="font-display text-3xl font-bold"
              style={{ color: card.color, textShadow: `0 0 20px ${card.color}60` }}
            >
              {card.value}
            </div>
            <div className="font-mono text-xs text-slate-600 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom Row: LED Status + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Device Status */}
        <div className="hud-card p-5">
          <h3 className="font-display text-sm font-semibold text-slate-400 tracking-wider uppercase mb-4">
            Device Status
          </h3>
          <div className="space-y-4">
            {[
              {
                label: 'Green LED',
                active: !alertConditions.anyAlert,
                activeLabel: 'ON — Safe',
                inactiveLabel: 'OFF — Alert mode',
                activeColor: '#00ff94',
              },
              {
                label: 'Red LED',
                active: alertConditions.anyAlert,
                activeLabel: 'ON — Alert active',
                inactiveLabel: 'OFF — Normal',
                activeColor: '#ff3366',
              },
              {
                label: 'Buzzer',
                active: alertConditions.anyAlert,
                activeLabel: 'SOUNDING',
                inactiveLabel: 'SILENT',
                activeColor: '#ff8c00',
              },
              {
                label: 'Fire Sensor',
                active: thresholds.fireEnable,
                activeLabel: 'ENABLED',
                inactiveLabel: 'DISABLED',
                activeColor: '#00d4ff',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-400">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${item.active ? 'animate-pulse' : ''}`}
                    style={{
                      backgroundColor: item.active ? item.activeColor : '#1e2d4a',
                      boxShadow: item.active ? `0 0 8px ${item.activeColor}` : 'none',
                    }}
                  />
                  <span
                    className="font-mono text-xs font-semibold"
                    style={{ color: item.active ? item.activeColor : '#475569' }}
                  >
                    {item.active ? item.activeLabel : item.inactiveLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* MQTT Status */}
          <div className="mt-4 pt-4 border-t border-bg-border">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-slate-400">MQTT Broker</span>
              <span className={`font-mono text-xs font-semibold ${connected ? 'text-accent-green' : 'text-accent-red'}`}>
                {connected ? '● CONNECTED' : '● OFFLINE'}
              </span>
            </div>
            <div className="font-mono text-xs text-slate-600 mt-1">
              dev.coppercloud.in:1883
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="hud-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-semibold text-slate-400 tracking-wider uppercase">
              Recent Alerts
            </h3>
            <a href="/alerts" className="font-mono text-xs text-accent-blue hover:text-accent-blue/80 transition-colors">
              View All →
            </a>
          </div>

          {recentAlerts.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-slate-600 font-mono text-sm">
              No alerts recorded
            </div>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((alert) => {
                const colors: Record<string, string> = {
                  fire: '#ff3366',
                  gas: '#ff8c00',
                  temperature: '#ffd700',
                  humidity: '#a855f7',
                };
                const icons: Record<string, string> = {
                  fire: '🔥', gas: '☁️', temperature: '🌡️', humidity: '💧',
                };
                const c = colors[alert.type] || '#fff';
                return (
                  <div
                    key={alert.id}
                    className="flex items-center gap-3 px-3 py-2 rounded border"
                    style={{
                      borderColor: `${c}25`,
                      backgroundColor: `${c}08`,
                      opacity: alert.acknowledged ? 0.5 : 1,
                    }}
                  >
                    <span>{icons[alert.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-semibold" style={{ color: c }}>
                        {alert.message}
                      </p>
                      <p className="font-mono text-xs text-slate-500">
                        {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold shrink-0" style={{ color: c }}>
                      {alert.value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
