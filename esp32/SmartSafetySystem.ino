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
 *
 * FLAME SENSOR LOGIC:
 *   LOW  = Fire Detected  → RED LED ON  + Buzzer ON  → MQTT "0"
 *   HIGH = No Fire        → GREEN LED ON + Buzzer OFF → MQTT "1"
 * ======================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// =====================================================
//                  WIFI CONFIG
// =====================================================

const char* ssid     = "iPhone";
const char* password = "87654321";

// =====================================================
//                  MQTT CONFIG
// =====================================================

const char* mqtt_server   = "dev.coppercloud.in";
const int   mqtt_port     = 1883;
const char* mqtt_client_id = "ESP32_SMART_SAFETY";

// =====================================================
//                  MQTT TOPICS
// =====================================================

const char* TOPIC_TEMP     = "ajinkya/fire/temp";
const char* TOPIC_HUMIDITY = "ajinkya/fire/humidity";
const char* TOPIC_GAS      = "ajinkya/fire/gas";
const char* TOPIC_FLAME    = "ajinkya/fire/flame";
const char* TOPIC_CONTROL  = "ajinkya/fire/control";

// =====================================================
//                  PIN DEFINITIONS
// =====================================================

#define DHTPIN    4
#define DHTTYPE   DHT11

#define MQ7_PIN   34
#define FLAME_PIN 27

#define GREEN_LED 18
#define RED_LED   19
#define BUZZER    23

// =====================================================
//                  ALERT THRESHOLDS
// =====================================================

int   mq7Alert      = 500;
float tempAlert     = 40.0;
float humidityAlert = 80.0;

// =====================================================
//                  SENSOR VARIABLES
// =====================================================

float temperature = 0;
float humidity    = 0;
int   gasValue    = 0;
int   flameValue  = HIGH; // HIGH = No Fire (safe default)

// =====================================================
//                  OBJECTS
// =====================================================

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

// =====================================================
//                  MQTT CALLBACK
// =====================================================

void callback(char* topic, byte* payload, unsigned int length) {

  String message = "";

  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  message.trim();

  Serial.print("[MQTT] Received: ");
  Serial.println(message);

  // Change MQ7 alert threshold
  if (message.startsWith("mq7alert")) {
    mq7Alert = message.substring(8).toInt();
    Serial.print("New MQ7 Alert Threshold: ");
    Serial.println(mq7Alert);
  }

  // Change Temperature alert threshold
  else if (message.startsWith("tempalert")) {
    tempAlert = message.substring(9).toFloat();
    Serial.print("New Temp Alert Threshold: ");
    Serial.println(tempAlert);
  }

  // Change Humidity alert threshold
  else if (message.startsWith("humidityalert")) {
    humidityAlert = message.substring(13).toFloat();
    Serial.print("New Humidity Alert Threshold: ");
    Serial.println(humidityAlert);
  }
}

// =====================================================
//                  WIFI SETUP
// =====================================================

void setup_wifi() {

  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

// =====================================================
//                  MQTT RECONNECT
// =====================================================

void reconnect() {

  while (!client.connected()) {

    Serial.print("Connecting to MQTT...");

    String clientId = String(mqtt_client_id) + "_" + String(random(0xffff), HEX);

    if (client.connect(clientId.c_str())) {

      Serial.println("Connected!");
      client.subscribe(TOPIC_CONTROL);
      Serial.println("Subscribed to control topic");

    } else {

      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" — Retrying in 3 seconds...");
      delay(3000);
    }
  }
}

// =====================================================
//                  SETUP
// =====================================================

void setup() {

  Serial.begin(115200);

  dht.begin();

  pinMode(FLAME_PIN, INPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED,   OUTPUT);
  pinMode(BUZZER,    OUTPUT);

  // Safe state on startup
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED,   LOW);
  digitalWrite(BUZZER,    LOW);

  // Startup blink — 3x GREEN
  for (int i = 0; i < 3; i++) {
    digitalWrite(GREEN_LED, HIGH);
    delay(200);
    digitalWrite(GREEN_LED, LOW);
    delay(200);
  }

  setup_wifi();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  Serial.println("SMART SAFETY SYSTEM READY");
}

// =====================================================
//                  LOOP
// =====================================================

void loop() {

  // Maintain MQTT connection
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // =================================================
  //  READ SENSORS
  // =================================================

  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (!isnan(t)) temperature = t;
  if (!isnan(h)) humidity    = h;

  gasValue   = analogRead(MQ7_PIN);
  flameValue = digitalRead(FLAME_PIN);

  // =================================================
  //  SERIAL DEBUG
  // =================================================

  Serial.println("--------------------------------");
  Serial.print("Temperature : "); Serial.println(temperature);
  Serial.print("Humidity    : "); Serial.println(humidity);
  Serial.print("Gas Value   : "); Serial.println(gasValue);
  Serial.print("Flame Pin   : "); Serial.println(flameValue == LOW ? "FIRE DETECTED" : "No Fire");

  // =================================================
  //  MQTT PUBLISH — SENSORS
  // =================================================

  char buffer[20];

  // Temperature
  dtostrf(temperature, 4, 1, buffer);
  client.publish(TOPIC_TEMP, buffer);

  // Humidity
  dtostrf(humidity, 4, 1, buffer);
  client.publish(TOPIC_HUMIDITY, buffer);

  // Gas
  sprintf(buffer, "%d", gasValue);
  client.publish(TOPIC_GAS, buffer);

  // =================================================
  //  FLAME SENSOR — MQTT + LED + BUZZER
  // =================================================
  //
  //  Flame sensor output:
  //    LOW  = Fire Detected
  //    HIGH = No Fire
  //
  //  MQTT publish:
  //    "0" = Fire Detected
  //    "1" = No Fire
  //
  // =================================================

  if (flameValue == HIGH) {

    // ---- FIRE DETECTED ----

    client.publish(TOPIC_FLAME, "0");  // Send 0 = Fire

    digitalWrite(RED_LED,   HIGH);     // RED ON
    digitalWrite(GREEN_LED, LOW);      // GREEN OFF
    digitalWrite(BUZZER,    HIGH);     // Buzzer ON

    Serial.println("!!! FIRE DETECTED — RED LED ON + BUZZER ON !!!");

  } else {

    // ---- NO FIRE ----

    client.publish(TOPIC_FLAME, "1");  // Send 1 = No Fire

    // Check other sensor alerts (Gas / Temp / Humidity)
    bool gasDetected      = (gasValue    > mq7Alert);
    bool tempDetected     = (temperature > tempAlert);
    bool humidityDetected = (humidity    > humidityAlert);
    bool otherAlert       = gasDetected || tempDetected || humidityDetected;

    if (otherAlert) {

      // Other sensor danger — RED LED + Buzzer
      digitalWrite(RED_LED,   HIGH);
      digitalWrite(GREEN_LED, LOW);
      digitalWrite(BUZZER,    HIGH);

      Serial.println("!!! OTHER SENSOR ALERT !!!");
      if (gasDetected)      Serial.println("  -> GAS ALERT");
      if (tempDetected)     Serial.println("  -> TEMP ALERT");
      if (humidityDetected) Serial.println("  -> HUMIDITY ALERT");

    } else {

      // ALL SAFE — GREEN LED ON
      digitalWrite(GREEN_LED, HIGH);   // GREEN ON
      digitalWrite(RED_LED,   LOW);    // RED OFF
      digitalWrite(BUZZER,    LOW);    // Buzzer OFF

      Serial.println("SAFE — GREEN LED ON");
    }
  }

  delay(2000);
}