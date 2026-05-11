// app/api/mqtt-stream/route.ts
import { NextRequest } from 'next/server';
import { initMqtt, subscribeSSE, getMqttState } from '@/lib/mqtt-broker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const state = initMqtt();

  const stream = new ReadableStream({
    start(controller) {
      // Send current state immediately
      const initial = JSON.stringify({
        type: 'sensor',
        data: state.latest,
        thresholds: state.thresholds,
        connected: state.connected,
        history: state.history,
        alerts: state.alerts.slice(0, 50),
      });
      controller.enqueue(`data: ${initial}\n\n`);

      // Subscribe to live updates
      const unsub = subscribeSSE((data) => {
        try {
          controller.enqueue(`data: ${data}\n\n`);
        } catch {
          unsub();
        }
      });

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`: heartbeat\n\n`);
        } catch {
          clearInterval(heartbeat);
          unsub();
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsub();
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
