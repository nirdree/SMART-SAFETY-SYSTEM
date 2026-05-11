'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface SensorData {
  temperature: number | null;
  humidity: number | null;
  gas: number | null;
  flame: number | null;
  timestamp: number;
}

export interface AlertThresholds {
  mq7Alert: number;
  tempAlert: number;
  humidityAlert: number;
  fireEnable: boolean;
}

export interface HistoryPoint {
  timestamp: number;
  value: number;
}

export interface AlertRecord {
  id: string;
  type: 'fire' | 'gas' | 'temperature' | 'humidity';
  message: string;
  value: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface AlertConditions {
  fireDetected: boolean;
  gasDetected: boolean;
  tempDetected: boolean;
  humidityDetected: boolean;
  anyAlert: boolean;
}

export function useMqttData() {
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: null,
    humidity: null,
    gas: null,
    flame: null,
    timestamp: Date.now(),
  });
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    mq7Alert: 500,
    tempAlert: 40,
    humidityAlert: 80,
    fireEnable: true,
  });
  const [history, setHistory] = useState<{
    temperature: HistoryPoint[];
    humidity: HistoryPoint[];
    gas: HistoryPoint[];
    flame: HistoryPoint[];
  }>({
    temperature: [],
    humidity: [],
    gas: [],
    flame: [],
  });
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    function connect() {
      if (esRef.current) {
        esRef.current.close();
      }

      const es = new EventSource('/api/mqtt-stream');
      esRef.current = es;

      es.onopen = () => setSseConnected(true);

      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);

          if (msg.type === 'sensor') {
            setSensorData(msg.data);
            setThresholds(msg.thresholds);
            setConnected(msg.connected);

            // Initial load includes history and alerts
            if (msg.history) setHistory(msg.history);
            if (msg.alerts) setAlerts(msg.alerts);
          } else if (msg.type === 'alert') {
            setAlerts((prev) => {
              const exists = prev.find((a) => a.id === msg.data.id);
              if (exists) return prev;
              return [msg.data, ...prev].slice(0, 500);
            });
          }
        } catch {}
      };

      es.onerror = () => {
        setSseConnected(false);
        setConnected(false);
        es.close();
        // Reconnect after 3s
        setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      esRef.current?.close();
    };
  }, []);

  // Refresh history periodically (every 30s to get new points not in SSE stream)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/mqtt-publish');
        const data = await res.json();
        if (data.history) setHistory(data.history);
        if (data.alerts) setAlerts(data.alerts);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const alertConditions: AlertConditions = {
    fireDetected: thresholds.fireEnable && sensorData.flame === 0,
    gasDetected: sensorData.gas !== null && sensorData.gas > thresholds.mq7Alert,
    tempDetected: sensorData.temperature !== null && sensorData.temperature > thresholds.tempAlert,
    humidityDetected: sensorData.humidity !== null && sensorData.humidity > thresholds.humidityAlert,
    get anyAlert() {
      return this.fireDetected || this.gasDetected || this.tempDetected || this.humidityDetected;
    },
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return {
    sensorData,
    thresholds,
    history,
    alerts,
    connected,
    sseConnected,
    alertConditions,
    unacknowledgedCount,
  };
}

export async function publishAction(action: string, value?: string | number, alertId?: string) {
  const res = await fetch('/api/mqtt-publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, value: String(value ?? ''), alertId }),
  });
  return res.json();
}
