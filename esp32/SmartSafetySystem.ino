/*
 * ======================================================
 *           SMART SAFETY SYSTEM — ESP32
 *     MQ7 + FLAME + DHT11 + MQTT + BUZZER + LEDs
 * ======================================================
 *
 * MQTT Topics:
 *   Publish   : ajinkya/fire/temp
 *               ajinkya/fire/humidity
 *               ajinkya/fire/gas
 *               ajinkya/fire/flame
 *
 *   Subscribe : ajinkya/fire/control
 *     Commands: mq7alert<value>      e.g. mq7alert500
 *               tempalert<value>     e.g. tempalert40
 *               humidityalert<value> e.g. humidityalert80
 *               fireon
 *               fireoff
 *
 * Libraries required (install via Arduino Library Manager):
 *   - PubSubClient by Nick O'Leary
 *   - DHT sensor library by Adafruit
 *   - Adafruit Unified Sensor
 * ======================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// =====================================================
//                  CONFIGURATION
// =====================================================

// --- WiFi ---
const char* ssid     = "iPhone";
const char* password = "87654321";

// --- MQTT ---
const char* mqtt_server = "dev.coppercloud.in";
const int   mqtt_port   = 1883;
const char* mqtt_client_id = "ESP32_SMART_SAFETY";

// --- Topics ---
const char* TOPIC_TEMP     = "ajinkya/fire/temp";
const char* TOPIC_HUMIDITY = "ajinkya/fire/humidity";
const char* TOPIC_GAS      = "ajinkya/fire/gas";
const char* TOPIC_FLAME    = "ajinkya/fire/flame";
const char* TOPIC_CONTROL  = "ajinkya/fire/control";

// =====================================================
//                   PIN DEFINITIONS
// =====================================================

#define DHTPIN      4
#define DHTTYPE     DHT11
#define MQ7_PIN     34
#define FLAME_PIN   27
#define GREEN_LED   18
#define RED_LED     19
#define BUZZER      23

// =====================================================
//                   ALERT THRESHOLDS
// =====================================================

int   mq7Alert       = 500;
float tempAlert      = 40.0;
float humidityAlert  = 80.0;
bool  fireEnable     = true;

// =====================================================
//               SENSOR VALUES
// =====================================================

int   gasValue    = 0;
int   flameValue  = 0;
float temperature = 0.0;
float humidity    = 0.0;

// =====================================================
//               OBJECTS
// =====================================================

DHT          dht(DHTPIN, DHTTYPE);
WiFiClient   espClient;
PubSubClient client(espClient);

// =====================================================
//               MQTT CALLBACK
// =====================================================

void callback(char* topic, byte* payload, unsigned int length) {

  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();

  Serial.print("[MQTT] Received: ");
  Serial.println(message);

  // --- MQ7 Alert ---
  if (message.startsWith("mq7alert")) {
    mq7Alert = message.substring(8).toInt();
    Serial.print("[CTRL] MQ7 Alert → ");
    Serial.println(mq7Alert);
  }

  // --- Temp Alert ---
  else if (message.startsWith("tempalert")) {
    tempAlert = message.substring(9).toFloat();
    Serial.print("[CTRL] Temp Alert → ");
    Serial.println(tempAlert);
  }

  // --- Humidity Alert ---
  else if (message.startsWith("humidityalert")) {
    humidityAlert = message.substring(13).toFloat();
    Serial.print("[CTRL] Humidity Alert → ");
    Serial.println(humidityAlert);
  }

  // --- Fire Enable/Disable ---
  else if (message == "fireon") {
    fireEnable = true;
    Serial.println("[CTRL] Fire Alarm ENABLED");
  }
  else if (message == "fireoff") {
    fireEnable = false;
    Serial.println("[CTRL] Fire Alarm DISABLED");
  }
}

// =====================================================
//               WIFI SETUP
// =====================================================

void setup_wifi() {
  delay(10);
  Serial.print("\n[WiFi] Connecting to: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (++attempts > 40) {
      Serial.println("\n[WiFi] Failed! Restarting...");
      ESP.restart();
    }
  }

  Serial.println("\n[WiFi] Connected!");
  Serial.print("[WiFi] IP: ");
  Serial.println(WiFi.localIP());
}

// =====================================================
//               MQTT RECONNECT
// =====================================================

void reconnect() {
  while (!client.connected()) {
    Serial.print("[MQTT] Connecting...");

    // Unique client ID per attempt
    String clientId = String(mqtt_client_id) + "_" + String(random(0xffff), HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println(" Connected!");
      client.subscribe(TOPIC_CONTROL);
      Serial.print("[MQTT] Subscribed to: ");
      Serial.println(TOPIC_CONTROL);
    } else {
      Serial.print(" Failed (rc=");
      Serial.print(client.state());
      Serial.println(") — retrying in 3s");
      delay(3000);
    }
  }
}

// =====================================================
//               SETUP
// =====================================================

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("\n=======================================");
  Serial.println("    SMART SAFETY SYSTEM — ESP32");
  Serial.println("=======================================\n");

  // Sensor init
  dht.begin();
  pinMode(FLAME_PIN, INPUT);

  // LED + Buzzer
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED,   OUTPUT);
  pinMode(BUZZER,    OUTPUT);

  // Startup flash
  for (int i = 0; i < 3; i++) {
    digitalWrite(GREEN_LED, HIGH);
    delay(200);
    digitalWrite(GREEN_LED, LOW);
    delay(200);
  }

  // WiFi + MQTT
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  Serial.println("\n[INFO] System ready. Publishing every 2s.");
}

// =====================================================
//               LOOP
// =====================================================

void loop() {
  // Keep MQTT alive
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // ─── Read Sensors ────────────────────────────────

  float newTemp = dht.readTemperature();
  float newHum  = dht.readHumidity();

  // Validate DHT readings (NaN check)
  if (!isnan(newTemp)) temperature = newTemp;
  if (!isnan(newHum))  humidity    = newHum;

  gasValue   = analogRead(MQ7_PIN);
  flameValue = digitalRead(FLAME_PIN);

  // ─── Serial Monitor ──────────────────────────────

  Serial.println("─────────────────────────────────");
  Serial.printf("[DHT]   Temp:  %.1f °C\n",  temperature);
  Serial.printf("[DHT]   Humid: %.1f %%\n",  humidity);
  Serial.printf("[MQ7]   Gas:   %d ADC\n",   gasValue);
  Serial.printf("[FLAME] Value: %d (%s)\n",  flameValue, flameValue == LOW ? "FIRE!" : "Clear");

  // ─── MQTT Publish ────────────────────────────────

  char buf[16];

  snprintf(buf, sizeof(buf), "%.1f", temperature);
  client.publish(TOPIC_TEMP, buf);

  snprintf(buf, sizeof(buf), "%.1f", humidity);
  client.publish(TOPIC_HUMIDITY, buf);

  snprintf(buf, sizeof(buf), "%d", gasValue);
  client.publish(TOPIC_GAS, buf);

  snprintf(buf, sizeof(buf), "%d", flameValue);
  client.publish(TOPIC_FLAME, buf);

  // ─── Alert Evaluation ────────────────────────────

  bool fireDetected     = (flameValue == LOW) && fireEnable;
  bool gasDetected      = gasValue    > mq7Alert;
  bool tempDetected     = temperature > tempAlert;
  bool humidityDetected = humidity    > humidityAlert;
  bool anyAlert         = fireDetected || gasDetected || tempDetected || humidityDetected;

  // ─── Alert Output ────────────────────────────────

  if (anyAlert) {
    digitalWrite(RED_LED,   HIGH);
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(BUZZER,    HIGH);

    Serial.println("[ALERT] ⚠ DANGER DETECTED ⚠");
    if (fireDetected)     Serial.println("         → FLAME");
    if (gasDetected)      Serial.printf("         → GAS (%d > %d)\n", gasValue, mq7Alert);
    if (tempDetected)     Serial.printf("         → TEMP (%.1f > %.1f)\n", temperature, tempAlert);
    if (humidityDetected) Serial.printf("         → HUMIDITY (%.1f > %.1f)\n", humidity, humidityAlert);

  } else {
    digitalWrite(RED_LED,   LOW);
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(BUZZER,    LOW);

    Serial.println("[STATUS] SAFE ✓");
  }

  delay(2000);
}
