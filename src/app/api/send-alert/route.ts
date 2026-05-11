// app/api/send-alert/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { alerts } = body;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const alertTo = process.env.ALERT_EMAIL_TO;

  if (!gmailUser || !gmailPass || !alertTo) {
    console.warn('[EMAIL] Gmail credentials not configured in .env.local');
    return NextResponse.json({ ok: false, error: 'Email not configured' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const alertTypeColors: Record<string, string> = {
    fire: '#ff3366',
    gas: '#ff8c00',
    temperature: '#ffd700',
    humidity: '#a855f7',
  };

  const alertIcons: Record<string, string> = {
    fire: '🔥',
    gas: '☁️',
    temperature: '🌡️',
    humidity: '💧',
  };

  const alertRows = alerts
    .map(
      (a: any) => `
      <tr style="border-bottom: 1px solid #1e2d4a;">
        <td style="padding: 12px 16px; color: ${alertTypeColors[a.type] || '#fff'}; font-weight: bold;">
          ${alertIcons[a.type] || '⚠'} ${a.type.toUpperCase()}
        </td>
        <td style="padding: 12px 16px; color: #e2e8f0;">${a.message}</td>
        <td style="padding: 12px 16px; color: ${alertTypeColors[a.type] || '#fff'}; font-family: monospace; font-weight: bold;">${a.value}</td>
        <td style="padding: 12px 16px; color: #64748b; font-size: 12px;">${new Date(a.timestamp).toLocaleString()}</td>
      </tr>
    `
    )
    .join('');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>Safety Alert</title>
  </head>
  <body style="margin:0; padding:0; background:#0a0e1a; font-family: 'Segoe UI', sans-serif;">
    <div style="max-width: 640px; margin: 40px auto; background: #131929; border-radius: 12px; overflow: hidden; border: 1px solid #1e2d4a;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #ff3366 0%, #ff8c00 100%); padding: 32px 32px 24px; position: relative;">
        <div style="font-size: 28px; font-weight: 800; color: #fff; letter-spacing: 2px; text-transform: uppercase;">
          ⚠ SAFETY ALERT
        </div>
        <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-top: 6px;">
          Smart Safety System — ESP32 Monitor
        </div>
      </div>

      <!-- Alert Count Banner -->
      <div style="background: rgba(255,51,102,0.1); border-bottom: 1px solid #1e2d4a; padding: 16px 32px; display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 32px; font-weight: 700; color: #ff3366;">${alerts.length}</span>
        <span style="color: #e2e8f0; font-size: 14px;">alert${alerts.length !== 1 ? 's' : ''} triggered — immediate attention required</span>
      </div>

      <!-- Alerts Table -->
      <div style="padding: 24px 32px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 2px solid #1e2d4a;">
              <th style="text-align:left; padding: 8px 16px; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Type</th>
              <th style="text-align:left; padding: 8px 16px; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Description</th>
              <th style="text-align:left; padding: 8px 16px; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Value</th>
              <th style="text-align:left; padding: 8px 16px; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Time</th>
            </tr>
          </thead>
          <tbody>
            ${alertRows}
          </tbody>
        </table>
      </div>

      <!-- Action Button -->
      <div style="padding: 0 32px 32px; text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard" 
           style="display: inline-block; background: linear-gradient(135deg, #00d4ff, #a855f7); color: #0a0e1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; font-size: 13px;">
          View Dashboard →
        </a>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #1e2d4a; padding: 16px 32px; background: #0f1528;">
        <p style="margin: 0; color: #475569; font-size: 11px; text-align: center;">
          Smart Safety System · Powered by ESP32 + MQTT · Auto-generated alert
        </p>
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Safety System 🚨" <${gmailUser}>`,
      to: alertTo,
      subject: `🚨 [ALERT] ${alerts.length} Safety Alert${alerts.length !== 1 ? 's' : ''} — ESP32 System`,
      html,
    });

    console.log(`[EMAIL] Alert sent to ${alertTo}`);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[EMAIL] Send failed:', err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
