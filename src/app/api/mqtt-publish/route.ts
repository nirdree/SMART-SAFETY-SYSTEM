// app/api/mqtt-publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { initMqtt, publishMqtt, getMqttState, acknowledgeAlert } from '@/lib/mqtt-broker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, value, alertId } = body;

  initMqtt();
  const state = getMqttState();
  const prefix = process.env.MQTT_TOPIC_PREFIX || 'ajinkya/fire';
  const controlTopic = `${prefix}/control`;

  try {
    switch (action) {
      case 'setMq7Alert': {
        const v = parseInt(value, 10);
        if (isNaN(v)) return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
        await publishMqtt(controlTopic, `mq7alert${v}`);
        state.thresholds.mq7Alert = v;
        return NextResponse.json({ ok: true, message: `MQ7 alert set to ${v}` });
      }

      case 'setTempAlert': {
        const v = parseFloat(value);
        if (isNaN(v)) return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
        await publishMqtt(controlTopic, `tempalert${v}`);
        state.thresholds.tempAlert = v;
        return NextResponse.json({ ok: true, message: `Temp alert set to ${v}°C` });
      }

      case 'setHumidityAlert': {
        const v = parseFloat(value);
        if (isNaN(v)) return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
        await publishMqtt(controlTopic, `humidityalert${v}`);
        state.thresholds.humidityAlert = v;
        return NextResponse.json({ ok: true, message: `Humidity alert set to ${v}%` });
      }

      case 'fireOn': {
        await publishMqtt(controlTopic, 'fireon');
        state.thresholds.fireEnable = true;
        return NextResponse.json({ ok: true, message: 'Fire alarm ENABLED' });
      }

      case 'fireOff': {
        await publishMqtt(controlTopic, 'fireoff');
        state.thresholds.fireEnable = false;
        return NextResponse.json({ ok: true, message: 'Fire alarm DISABLED' });
      }

      case 'acknowledgeAlert': {
        if (!alertId) return NextResponse.json({ error: 'No alertId' }, { status: 400 });
        acknowledgeAlert(alertId);
        return NextResponse.json({ ok: true });
      }

      case 'getHistory': {
        return NextResponse.json({ ok: true, history: state.history });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  initMqtt();
  const state = getMqttState();
  return NextResponse.json({
    connected: state.connected,
    latest: state.latest,
    thresholds: state.thresholds,
    alertCount: state.alerts.filter((a) => !a.acknowledged).length,
    alerts: state.alerts.slice(0, 100),
    history: state.history,
  });
}
