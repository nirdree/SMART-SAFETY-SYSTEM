// lib/mqtt-broker.ts
// Server-side singleton MQTT TCP client
// Connects once to broker, stores latest values, streams to SSE clients

import mqtt from 'mqtt';

export interface SensorData {
  temperature: number | null;
  humidity: number | null;
  gas: number | null;
  flame: number | null; // 0 = fire detected (LOW), 1 = no fire
  timestamp: number;
}

export interface AlertThresholds {
  mq7Alert: number;
  tempAlert: number;
  humidityAlert: number;
  fireEnable: boolean;
}

export interface AlertRecord {
  id: string;
  type: 'fire' | 'gas' | 'temperature' | 'humidity';
  message: string;
  value: string;
  timestamp: number;
  acknowledged: boolean;
}

// Historical data storage (in-memory, up to 10,000 points per sensor)
const MAX_HISTORY = 10000;

export interface HistoryPoint {
  timestamp: number;
  value: number;
}

interface BrokerState {
  client: mqtt.MqttClient | null;
  latest: SensorData;
  thresholds: AlertThresholds;
  history: {
    temperature: HistoryPoint[];
    humidity: HistoryPoint[];
    gas: HistoryPoint[];
    flame: HistoryPoint[];
  };
  alerts: AlertRecord[];
  subscribers: Set<(data: string) => void>;
  alertSubscribers: Set<(data: string) => void>;
  lastEmailSent: number;
  connected: boolean;
}

// Global singleton (persists across hot reloads in dev)
const g = global as typeof global & { __mqttBroker?: BrokerState };

function getState(): BrokerState {
  if (!g.__mqttBroker) {
    g.__mqttBroker = {
      client: null,
      latest: {
        temperature: null,
        humidity: null,
        gas: null,
        flame: null,
        timestamp: Date.now(),
      },
      thresholds: {
        mq7Alert: 500,
        tempAlert: 40,
        humidityAlert: 80,
        fireEnable: true,
      },
      history: {
        temperature: [],
        humidity: [],
        gas: [],
        flame: [],
      },
      alerts: [],
      subscribers: new Set(),
      alertSubscribers: new Set(),
      lastEmailSent: 0,
      connected: false,
    };
  }
  return g.__mqttBroker!;
}

function pushHistory(key: keyof BrokerState['history'], value: number, timestamp: number) {
  const state = getState();
  const arr = state.history[key];
  arr.push({ timestamp, value });
  if (arr.length > MAX_HISTORY) arr.shift();
}

function broadcast(state: BrokerState) {
  const payload = JSON.stringify({
    type: 'sensor',
    data: state.latest,
    thresholds: state.thresholds,
    connected: state.connected,
  });
  state.subscribers.forEach((fn) => {
    try { fn(payload); } catch {}
  });
}

function broadcastAlert(alert: AlertRecord) {
  const state = getState();
  const payload = JSON.stringify({ type: 'alert', data: alert });
  state.alertSubscribers.forEach((fn) => {
    try { fn(payload); } catch {}
  });
}

function checkAlerts(state: BrokerState) {
  const { latest, thresholds } = state;
  const now = Date.now();
  const newAlerts: AlertRecord[] = [];

  if (thresholds.fireEnable && latest.flame === 0) {
    newAlerts.push({
      id: `fire-${now}`,
      type: 'fire',
      message: 'FLAME DETECTED by sensor',
      value: 'ACTIVE',
      timestamp: now,
      acknowledged: false,
    });
  }

  if (latest.gas !== null && latest.gas > thresholds.mq7Alert) {
    newAlerts.push({
      id: `gas-${now}`,
      type: 'gas',
      message: `CO gas level exceeded threshold (${thresholds.mq7Alert})`,
      value: `${latest.gas}`,
      timestamp: now,
      acknowledged: false,
    });
  }

  if (latest.temperature !== null && latest.temperature > thresholds.tempAlert) {
    newAlerts.push({
      id: `temp-${now}`,
      type: 'temperature',
      message: `Temperature exceeded threshold (${thresholds.tempAlert}°C)`,
      value: `${latest.temperature.toFixed(1)}°C`,
      timestamp: now,
      acknowledged: false,
    });
  }

  if (latest.humidity !== null && latest.humidity > thresholds.humidityAlert) {
    newAlerts.push({
      id: `hum-${now}`,
      type: 'humidity',
      message: `Humidity exceeded threshold (${thresholds.humidityAlert}%)`,
      value: `${latest.humidity.toFixed(1)}%`,
      timestamp: now,
      acknowledged: false,
    });
  }

  if (newAlerts.length > 0) {
    state.alerts.unshift(...newAlerts);
    if (state.alerts.length > 500) state.alerts = state.alerts.slice(0, 500);
    newAlerts.forEach(broadcastAlert);

    // Trigger email if cooldown elapsed
    const cooldown = parseInt(process.env.ALERT_EMAIL_COOLDOWN || '300000', 10);
    if (now - state.lastEmailSent > cooldown) {
      state.lastEmailSent = now;
      triggerEmail(newAlerts).catch(console.error);
    }
  }
}

async function triggerEmail(alerts: AlertRecord[]) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/send-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alerts }),
    });
  } catch (e) {
    console.error('Email trigger failed:', e);
  }
}

export function getMqttState() {
  return getState();
}

export function initMqtt() {
  const state = getState();
  if (state.client) return state; // Already initialized

  const broker = `mqtt://${process.env.MQTT_BROKER || 'dev.coppercloud.in'}`;
  const port = parseInt(process.env.MQTT_PORT || '1883', 10);
  const prefix = process.env.MQTT_TOPIC_PREFIX || 'ajinkya/fire';

  console.log(`[MQTT] Connecting to ${broker}:${port}`);

  const client = mqtt.connect(broker, {
    port,
    clientId: `nextjs_dashboard_${Math.random().toString(16).slice(2)}`,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 3000,
  });

  state.client = client;

  client.on('connect', () => {
    console.log('[MQTT] Connected');
    state.connected = true;
    client.subscribe([
      `${prefix}/temp`,
      `${prefix}/humidity`,
      `${prefix}/gas`,
      `${prefix}/flame`,
    ], (err) => {
      if (err) console.error('[MQTT] Subscribe error:', err);
      else console.log('[MQTT] Subscribed to sensor topics');
    });
    broadcast(state);
  });

  client.on('disconnect', () => {
    console.log('[MQTT] Disconnected');
    state.connected = false;
    broadcast(state);
  });

  client.on('offline', () => {
    state.connected = false;
    broadcast(state);
  });

  client.on('error', (err) => {
    console.error('[MQTT] Error:', err.message);
    state.connected = false;
  });

  client.on('message', (topic, message) => {
    const val = parseFloat(message.toString());
    const now = Date.now();

    if (topic === `${prefix}/temp`) {
      state.latest.temperature = val;
      pushHistory('temperature', val, now);
    } else if (topic === `${prefix}/humidity`) {
      state.latest.humidity = val;
      pushHistory('humidity', val, now);
    } else if (topic === `${prefix}/gas`) {
      state.latest.gas = val;
      pushHistory('gas', val, now);
    } else if (topic === `${prefix}/flame`) {
      state.latest.flame = val;
      pushHistory('flame', val, now);
    }

    state.latest.timestamp = now;
    checkAlerts(state);
    broadcast(state);
  });

  return state;
}

export function publishMqtt(topic: string, message: string) {
  const state = getState();
  if (!state.client || !state.connected) {
    throw new Error('MQTT not connected');
  }
  return new Promise<void>((resolve, reject) => {
    state.client!.publish(topic, message, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function subscribeSSE(fn: (data: string) => void) {
  const state = getState();
  state.subscribers.add(fn);
  return () => state.subscribers.delete(fn);
}

export function subscribeAlertSSE(fn: (data: string) => void) {
  const state = getState();
  state.alertSubscribers.add(fn);
  return () => state.alertSubscribers.delete(fn);
}

export function acknowledgeAlert(id: string) {
  const state = getState();
  const alert = state.alerts.find((a) => a.id === id);
  if (alert) alert.acknowledged = true;
}
