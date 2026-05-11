'use client';

import { useState } from 'react';
import { useMqttData, publishAction } from '@/hooks/useMqttData';

function SettingCard({
  title,
  description,
  icon,
  color,
  children,
}: {
  title: string;
  description: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hud-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-display font-semibold tracking-wider uppercase" style={{ color }}>
            {title}
          </h3>
          <p className="font-mono text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ThresholdInput({
  label,
  currentValue,
  unit,
  min,
  max,
  step,
  color,
  action,
  onSuccess,
}: {
  label: string;
  currentValue: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  color: string;
  action: string;
  onSuccess: (msg: string) => void;
}) {
  const [value, setValue] = useState(currentValue.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const num = parseFloat(value);
    if (isNaN(num) || num < min || num > max) {
      setError(`Value must be between ${min} and ${max}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await publishAction(action, num);
      if (res.ok) onSuccess(res.message);
      else setError(res.error || 'Failed');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block font-mono text-xs text-slate-400 uppercase tracking-wider">
        {label}
      </label>

      {/* Slider */}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${((parseFloat(value) - min) / (max - min)) * 100}%, #1e2d4a ${((parseFloat(value) - min) / (max - min)) * 100}%, #1e2d4a 100%)`,
          }}
        />
        <div
          className="flex items-center gap-1 border rounded px-2 py-1 font-mono text-sm font-bold w-28"
          style={{ borderColor: `${color}40`, color }}
        >
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => setValue(e.target.value)}
            className="w-16 bg-transparent outline-none text-right"
          />
          <span className="text-slate-500 text-xs">{unit}</span>
        </div>
      </div>

      {error && <p className="font-mono text-xs text-accent-red">{error}</p>}

      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-slate-600">Current: {currentValue} {unit}</span>
        <button
          onClick={handleSave}
          disabled={loading}
          className="ml-auto px-4 py-1.5 rounded font-mono text-xs font-semibold transition-all"
          style={{
            backgroundColor: loading ? '#1e2d4a' : `${color}20`,
            color: loading ? '#475569' : color,
            border: `1px solid ${color}40`,
          }}
        >
          {loading ? 'PUBLISHING...' : 'PUBLISH TO ESP32'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { thresholds, connected } = useMqttData();
  const [successMsg, setSuccessMsg] = useState('');
  const [emailTestStatus, setEmailTestStatus] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleFireToggle = async (enable: boolean) => {
    const res = await publishAction(enable ? 'fireOn' : 'fireOff');
    if (res.ok) showSuccess(res.message);
  };

  const handleTestEmail = async () => {
    setEmailTestStatus('Sending...');
    try {
      const res = await fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alerts: [
            {
              id: 'test-1',
              type: 'fire',
              message: 'TEST — This is a test alert from Settings page',
              value: 'TEST',
              timestamp: Date.now(),
              acknowledged: false,
            },
          ],
        }),
      });
      const data = await res.json();
      setEmailTestStatus(data.ok ? '✓ Email sent! Check your inbox.' : `✗ Failed: ${data.error}`);
    } catch {
      setEmailTestStatus('✗ Network error');
    }
    setTimeout(() => setEmailTestStatus(''), 5000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-100 tracking-wider uppercase">
          Settings
        </h1>
        <p className="font-mono text-xs text-slate-500 mt-1">
          Threshold changes are published to MQTT and picked up by ESP32 in real time
        </p>
      </div>

      {/* Connection Warning */}
      {!connected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-accent-red/30 bg-accent-red/5">
          <span className="text-accent-red">⚠</span>
          <p className="font-mono text-xs text-accent-red">
            MQTT disconnected — changes will be published once reconnected
          </p>
        </div>
      )}

      {/* Success Toast */}
      {successMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-accent-green/30 bg-accent-green/5">
          <span className="text-accent-green">✓</span>
          <p className="font-mono text-xs text-accent-green">{successMsg}</p>
        </div>
      )}

      {/* Threshold Cards */}
      <SettingCard
        title="Temperature Alert"
        description="Triggers alert + buzzer + email when exceeded"
        icon="🌡️"
        color="#00d4ff"
      >
        <ThresholdInput
          label="Temperature Threshold"
          currentValue={thresholds.tempAlert}
          unit="°C"
          min={20}
          max={80}
          step={0.5}
          color="#00d4ff"
          action="setTempAlert"
          onSuccess={showSuccess}
        />
      </SettingCard>

      <SettingCard
        title="Humidity Alert"
        description="Triggers alert when relative humidity exceeds this value"
        icon="💧"
        color="#a855f7"
      >
        <ThresholdInput
          label="Humidity Threshold"
          currentValue={thresholds.humidityAlert}
          unit="%"
          min={30}
          max={100}
          step={1}
          color="#a855f7"
          action="setHumidityAlert"
          onSuccess={showSuccess}
        />
      </SettingCard>

      <SettingCard
        title="CO Gas Alert (MQ-7)"
        description="ADC value from 0–4095. Higher = more CO gas"
        icon="☁️"
        color="#ffd700"
      >
        <ThresholdInput
          label="Gas ADC Threshold"
          currentValue={thresholds.mq7Alert}
          unit="ADC"
          min={100}
          max={4000}
          step={10}
          color="#ffd700"
          action="setMq7Alert"
          onSuccess={showSuccess}
        />
        <div className="mt-3 p-3 rounded border border-bg-border bg-bg-primary/50">
          <p className="font-mono text-xs text-slate-500">
            💡 <strong className="text-slate-400">ADC Reference:</strong> Clean air ~100–300 · Light smoke ~400–600 · Heavy CO ~800+
          </p>
        </div>
      </SettingCard>

      <SettingCard
        title="Flame Sensor"
        description="Enable or disable the flame detector alarm system"
        icon="🔥"
        color="#ff3366"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs text-slate-400">
              Current: <span className={thresholds.fireEnable ? 'text-accent-green font-semibold' : 'text-accent-red font-semibold'}>
                {thresholds.fireEnable ? 'ENABLED' : 'DISABLED'}
              </span>
            </p>
            <p className="font-mono text-xs text-slate-600 mt-1">
              When enabled, LOW signal on GPIO 27 triggers fire alert
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleFireToggle(true)}
              className="px-4 py-2 rounded font-mono text-xs font-semibold border transition-all"
              style={{
                backgroundColor: thresholds.fireEnable ? '#00ff9420' : 'transparent',
                borderColor: thresholds.fireEnable ? '#00ff94' : '#1e2d4a',
                color: thresholds.fireEnable ? '#00ff94' : '#475569',
              }}
            >
              ENABLE
            </button>
            <button
              onClick={() => handleFireToggle(false)}
              className="px-4 py-2 rounded font-mono text-xs font-semibold border transition-all"
              style={{
                backgroundColor: !thresholds.fireEnable ? '#ff336620' : 'transparent',
                borderColor: !thresholds.fireEnable ? '#ff3366' : '#1e2d4a',
                color: !thresholds.fireEnable ? '#ff3366' : '#475569',
              }}
            >
              DISABLE
            </button>
          </div>
        </div>
      </SettingCard>

      {/* Email Settings */}
      <SettingCard
        title="Email Notifications"
        description="Gmail SMTP via Nodemailer — configure in .env.local"
        icon="✉️"
        color="#00d4ff"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'GMAIL_USER', value: 'your_email@gmail.com' },
              { label: 'GMAIL_APP_PASSWORD', value: '16-char app password' },
              { label: 'ALERT_EMAIL_TO', value: 'recipient@gmail.com' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded border border-bg-border bg-bg-primary/50">
                <p className="font-mono text-xs text-accent-blue font-semibold">{item.label}</p>
                <p className="font-mono text-xs text-slate-500 mt-1">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="p-3 rounded border border-bg-border bg-bg-primary/50">
            <p className="font-mono text-xs text-slate-400 mb-1">
              ℹ️ <strong>Gmail App Password:</strong> Go to Google Account → Security → 2-Step Verification → App Passwords → Generate one for "Mail"
            </p>
            <p className="font-mono text-xs text-slate-500">
              Cooldown: <span className="text-accent-blue">5 minutes</span> between emails (configurable via ALERT_EMAIL_COOLDOWN in ms)
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTestEmail}
              className="px-4 py-2 rounded font-mono text-xs font-semibold border border-accent-blue/40 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-all"
            >
              SEND TEST EMAIL
            </button>
            {emailTestStatus && (
              <span className={`font-mono text-xs ${emailTestStatus.startsWith('✓') ? 'text-accent-green' : emailTestStatus === 'Sending...' ? 'text-accent-blue' : 'text-accent-red'}`}>
                {emailTestStatus}
              </span>
            )}
          </div>
        </div>
      </SettingCard>

      {/* MQTT Info */}
      <SettingCard
        title="MQTT Configuration"
        description="Read-only — configure in .env.local"
        icon="📡"
        color="#475569"
      >
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Broker', value: 'dev.coppercloud.in' },
            { label: 'Port', value: '1883 (TCP)' },
            { label: 'Subscribe Topic', value: 'ajinkya/fire/#' },
            { label: 'Control Topic', value: 'ajinkya/fire/control' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5">
              <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">{item.label}</span>
              <span className="font-mono text-xs text-slate-200 font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </SettingCard>
    </div>
  );
}
