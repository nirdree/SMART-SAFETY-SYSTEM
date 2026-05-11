#!/usr/bin/env node
// ======================================================
//   TEST PUBLISHER — Simulates ESP32 sensor data
//   Usage: node scripts/test-publisher.js
//   Or:    npm run test-publisher
// ======================================================

const mqtt = require('mqtt');

const BROKER  = 'mqtt://dev.coppercloud.in';
const PORT    = 1883;
const PREFIX  = 'ajinkya/fire';
const INTERVAL = 2000; // ms — same as ESP32 delay(2000)

// Simulated sensor state
let state = {
  temperature: 28.5,
  humidity: 55.0,
  gas: 280,
  flame: 1, // 1 = no fire, 0 = fire
};

// Simulation mode flags
let simulateAlert = false;
let alertTimer = 0;

console.log(`\n${'='.repeat(55)}`);
console.log('  ESP32 TEST PUBLISHER — Smart Safety System');
console.log(`${'='.repeat(55)}`);
console.log(`  Broker  : ${BROKER}:${PORT}`);
console.log(`  Topics  : ${PREFIX}/temp|humidity|gas|flame`);
console.log(`  Interval: ${INTERVAL}ms\n`);
console.log('  Commands (type in terminal + Enter):');
console.log('    alert   — trigger a fire/gas/temp alert');
console.log('    normal  — return to normal values');
console.log('    fire    — simulate flame detection');
console.log('    nofire  — clear flame');
console.log('    quit    — exit\n');
console.log(`${'='.repeat(55)}\n`);

const client = mqtt.connect(BROKER, {
  port: PORT,
  clientId: `test_publisher_${Math.random().toString(16).slice(2)}`,
  clean: true,
  connectTimeout: 10000,
  reconnectPeriod: 3000,
});

client.on('connect', () => {
  console.log('[MQTT] Connected to broker ✓');
  console.log('[MQTT] Starting to publish...\n');
  startPublishing();
});

client.on('error', (err) => {
  console.error('[MQTT] Error:', err.message);
});

client.on('close', () => {
  console.log('[MQTT] Disconnected');
});

// Subscribe to control topic to see ESP32 responses
client.on('connect', () => {
  client.subscribe(`${PREFIX}/control`, (err) => {
    if (!err) console.log(`[MQTT] Also listening on ${PREFIX}/control\n`);
  });
});

client.on('message', (topic, message) => {
  console.log(`\n[CONTROL] Received: "${message.toString()}" on ${topic}`);
});

function randomWalk(current, min, max, step) {
  const delta = (Math.random() - 0.5) * step * 2;
  return Math.min(max, Math.max(min, current + delta));
}

function getSimulatedValues() {
  if (simulateAlert) {
    alertTimer++;
    // Alert mode: high values
    return {
      temperature: 42 + Math.random() * 3,
      humidity: 82 + Math.random() * 5,
      gas: 600 + Math.random() * 200,
      flame: state.flame,
    };
  }

  // Normal mode: gentle random walk
  return {
    temperature: randomWalk(state.temperature, 20, 38, 0.5),
    humidity:    randomWalk(state.humidity,    40, 75, 1.0),
    gas:         randomWalk(state.gas,         100, 450, 15),
    flame:       state.flame,
  };
}

function startPublishing() {
  setInterval(() => {
    const values = getSimulatedValues();

    // Update state
    state.temperature = values.temperature;
    state.humidity    = values.humidity;
    state.gas         = values.gas;

    // Publish
    const pub = (subtopic, value) => {
      client.publish(`${PREFIX}/${subtopic}`, String(Math.round(value * 10) / 10));
    };

    pub('temp',     values.temperature);
    pub('humidity', values.humidity);
    pub('gas',      values.gas);
    pub('flame',    values.flame);

    const mode = simulateAlert ? '🚨 ALERT' : '✅ SAFE ';
    const flame = values.flame === 0 ? '🔥 FIRE!' : '✓ Clear';

    process.stdout.write(
      `\r${mode} | Temp: ${values.temperature.toFixed(1)}°C | ` +
      `Hum: ${values.humidity.toFixed(1)}% | ` +
      `Gas: ${Math.round(values.gas)} | ` +
      `Flame: ${flame}   `
    );
  }, INTERVAL);
}

// CLI Commands
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.setEncoding('utf8');

let inputBuffer = '';

process.stdin.on('data', (key) => {
  if (key === '\u0003') process.exit(); // Ctrl-C

  if (key === '\r' || key === '\n') {
    const cmd = inputBuffer.trim().toLowerCase();
    inputBuffer = '';
    console.log(''); // newline

    switch (cmd) {
      case 'alert':
        simulateAlert = true;
        console.log('\n[CMD] 🚨 Alert mode ON — publishing high sensor values');
        break;
      case 'normal':
        simulateAlert = false;
        state = { temperature: 28.5, humidity: 55, gas: 280, flame: 1 };
        console.log('\n[CMD] ✅ Normal mode — values returning to safe range');
        break;
      case 'fire':
        state.flame = 0;
        console.log('\n[CMD] 🔥 Flame sensor TRIGGERED (GPIO LOW)');
        break;
      case 'nofire':
        state.flame = 1;
        console.log('\n[CMD] ✓ Flame sensor cleared (GPIO HIGH)');
        break;
      case 'quit':
      case 'exit':
        console.log('\n[CMD] Exiting...');
        client.end();
        process.exit(0);
        break;
      default:
        if (cmd) console.log(`\n[CMD] Unknown command: "${cmd}"`);
    }
  } else {
    inputBuffer += key;
  }
});

process.on('SIGINT', () => {
  console.log('\n\n[INFO] Shutting down...');
  client.end();
  process.exit(0);
});
