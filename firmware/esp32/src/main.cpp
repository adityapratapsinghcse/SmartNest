#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include "secrets.h"
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>

#define DHT_PIN 4
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

#define TRIG_PIN 5
#define ECHO_PIN 18

#define SERVO_PIN 14
const int GATE_CLOSED_ANGLE = 0;
const int GATE_OPEN_ANGLE = 90;
Servo gateServo;

#define GAS_PIN 34
#define FLAME_PIN 35
#define LDR_PIN 32

#define PIR_PIN 33
bool pirRawMotion = false;
bool motionLatched = false;
unsigned long lastMotionMillis = 0;
const unsigned long LOCAL_MOTION_LIGHT_TIMEOUT_MS = 180000;

#define FAN_LED_PIN 26
bool fanState = false;
int fanSpeedLevel = 2;
const int FAN_BLINK_INTERVAL_MS[4] = {0, 600, 300, 120};
bool fanLedOn = false;
unsigned long lastFanBlinkToggle = 0;

#define LIGHT_PIN 27
bool lightState = false;

// ================= Buzzer =================
#define BUZZER_PIN 23
bool buzzerAlarmOn = false;
bool buzzerBeepBusy = false;
unsigned long buzzerBeepUntil = 0;
const float GAS_DANGER_PERCENT = 60.0;

void buzzerSetAlarm(bool on) {
  buzzerAlarmOn = on;
}

void buzzerStartBeep(unsigned long durationMs) {
  buzzerBeepBusy = true;
  buzzerBeepUntil = millis() + durationMs;
  digitalWrite(BUZZER_PIN, HIGH);
}

void buzzerGrantedChime() { buzzerStartBeep(150); }
void buzzerDeniedChime()  { buzzerStartBeep(400); }

void updateBuzzer() {
  if (buzzerBeepBusy) {
    if (millis() >= buzzerBeepUntil) {
      buzzerBeepBusy = false;
      digitalWrite(BUZZER_PIN, buzzerAlarmOn ? HIGH : LOW);
    }
    return;
  }
  digitalWrite(BUZZER_PIN, buzzerAlarmOn ? HIGH : LOW);
}
// ============================================

// ================= UNO link (keypad only, no LCD) ==================
#define UNO_RX_PIN 16
#define UNO_TX_PIN 17
HardwareSerial UnoSerial(2);
String unoIncoming = "";

bool gatePendingClose = false;
unsigned long gateOpenedAt = 0;
const unsigned long GATE_AUTO_CLOSE_MS = 5000;
// =====================================================================

Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);
bool adxlOk = false;

const float VIBRATION_THRESHOLD = 2.0;
const int GAS_CLEAN_AIR_RAW = 400;
const int GAS_MAX_RAW = 3000;
const float CAR_DETECTED_DISTANCE_CM = 15.0;

const unsigned long HEARTBEAT_INTERVAL_MS = 15000;
const unsigned long COMMAND_POLL_INTERVAL_MS = 3000;
const unsigned long WIFI_RETRY_INTERVAL_MS = 5000;

unsigned long lastHeartbeat = 0;
unsigned long lastCommandPoll = 0;
unsigned long lastWifiRetry = 0;

int consecutiveFailures = 0;
const int OFFLINE_THRESHOLD = 3;
const float LOCAL_FAN_ON_TEMP = 28.0;
const float LOCAL_FAN_OFF_TEMP = 26.0;
const float LOCAL_DARK_THRESHOLD = 30.0;

bool isValidTemp(float t) { return !isnan(t) && t > -40 && t < 80; }
bool isValidHumidity(float h) { return !isnan(h) && h >= 0 && h <= 100; }

void connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.print(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(400);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[WiFi] Connected. IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("[WiFi] Failed to connect within timeout - will keep retrying in loop().");
  }
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return NAN;
  return (duration * 0.0343) / 2.0;
}

void updateMotion() {
  pirRawMotion = digitalRead(PIR_PIN) == HIGH;
  if (pirRawMotion) {
    motionLatched = true;
    lastMotionMillis = millis();
  }
}

void moveGate(bool open) {
  int angle = open ? GATE_OPEN_ANGLE : GATE_CLOSED_ANGLE;
  gateServo.write(angle);
  Serial.printf("[Servo] Gate -> %s (%d deg)\n", open ? "OPEN" : "CLOSED", angle);
}

float readLightPercent() {
  int raw = analogRead(LDR_PIN);
  float pct = (raw / 4095.0) * 100.0;
  return pct;
}

float readGasPercent() {
  int raw = analogRead(GAS_PIN);
  float pct = (float)(raw - GAS_CLEAN_AIR_RAW) / (GAS_MAX_RAW - GAS_CLEAN_AIR_RAW) * 100.0;
  return constrain(pct, 0.0, 100.0);
}

bool readFlameDetected() {
  return digitalRead(FLAME_PIN) == LOW;
}

struct VibrationReading { float deviation; bool detected; };

VibrationReading readVibration() {
  if (!adxlOk) return { 0.0, false };
  sensors_event_t event;
  accel.getEvent(&event);
  float magnitude = sqrt(event.acceleration.x * event.acceleration.x +
                          event.acceleration.y * event.acceleration.y +
                          event.acceleration.z * event.acceleration.z);
  float deviation = fabs(magnitude - 9.8);
  return { deviation, deviation > VIBRATION_THRESHOLD };
}

void setFan(bool on, int level) {
  fanState = on;
  fanSpeedLevel = level;
  if (!on) {
    fanLedOn = false;
    digitalWrite(FAN_LED_PIN, LOW);
  }
}

void updateFanBlink() {
  if (!fanState || fanSpeedLevel == 0) return;
  unsigned long interval = FAN_BLINK_INTERVAL_MS[fanSpeedLevel];
  if (millis() - lastFanBlinkToggle >= interval) {
    lastFanBlinkToggle = millis();
    fanLedOn = !fanLedOn;
    digitalWrite(FAN_LED_PIN, fanLedOn ? HIGH : LOW);
  }
}

void setLight(bool on) {
  lightState = on;
  digitalWrite(LIGHT_PIN, on ? HIGH : LOW);
}

void applyLocalAutomation() {
  float temperature = dht.readTemperature();
  if (isValidTemp(temperature)) {
    if (!fanState && temperature >= LOCAL_FAN_ON_TEMP) {
      setFan(true, fanSpeedLevel > 0 ? fanSpeedLevel : 2);
      Serial.println("[LocalAuto] Fan ON - backend unreachable, temp threshold");
    } else if (fanState && temperature <= LOCAL_FAN_OFF_TEMP) {
      setFan(false, fanSpeedLevel);
      Serial.println("[LocalAuto] Fan OFF - backend unreachable, temp threshold");
    }
  }
  float lightPct = readLightPercent();
  bool dark = lightPct < LOCAL_DARK_THRESHOLD;
  if (dark) {
    if (pirRawMotion && !lightState) {
      setLight(true);
      Serial.println("[LocalAuto] Light ON - backend unreachable, motion in the dark");
    } else if (!pirRawMotion && lightState && (millis() - lastMotionMillis > LOCAL_MOTION_LIGHT_TIMEOUT_MS)) {
      setLight(false);
      Serial.println("[LocalAuto] Light OFF - backend unreachable, motion timed out");
    }
  } else if (!dark && lightState) {
    setLight(false);
    Serial.println("[LocalAuto] Light OFF - backend unreachable, dark cleared");
  }
}

bool ackCommand(int commandId) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;
  String url = String(API_BASE_URL) + "/api/commands/ack/";
  if (!https.begin(client, url)) return false;
  https.addHeader("Content-Type", "application/json");
  https.addHeader("X-Device-Key", DEVICE_KEY);
  JsonDocument doc;
  doc["command_id"] = commandId;
  String body;
  serializeJson(doc, body);
  int httpCode = https.POST(body);
  Serial.printf("[HTTP] ACK command %d -> %d\n", commandId, httpCode);
  https.end();
  return httpCode > 0 && httpCode < 300;
}

void sendUnoResult(bool granted) {
  UnoSerial.print("A:");
  UnoSerial.print(granted ? "GRANTED" : "DENIED");
  UnoSerial.print("\n");
}

void verifyAccessCode(String code) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Access] Skipped - WiFi not connected");
    sendUnoResult(false);
    buzzerDeniedChime();
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;
  String url = String(API_BASE_URL) + "/api/access/verify/";
  if (!https.begin(client, url)) {
    Serial.println("[Access] Unable to begin connection");
    sendUnoResult(false);
    buzzerDeniedChime();
    return;
  }
  https.addHeader("Content-Type", "application/json");
  https.addHeader("X-Device-Key", DEVICE_KEY);

  JsonDocument doc;
  doc["rfid_uid"] = code;
  String body;
  serializeJson(doc, body);

  int httpCode = https.POST(body);
  bool granted = false;
  if (httpCode == 200) {
    String response = https.getString();
    JsonDocument respDoc;
    if (!deserializeJson(respDoc, response)) {
      granted = respDoc["granted"] | false;
    }
    Serial.printf("[Access] code=%s -> %s\n", code.c_str(), granted ? "GRANTED" : "DENIED");
  } else {
    Serial.printf("[Access] POST -> %d (treating as denied)\n", httpCode);
  }
  https.end();

  sendUnoResult(granted);

  if (granted) {
    buzzerGrantedChime();
    moveGate(true);
    gatePendingClose = true;
    gateOpenedAt = millis();
  } else {
    buzzerDeniedChime();
  }
}

void pollUnoSerial() {
  while (UnoSerial.available()) {
    char c = UnoSerial.read();
    if (c == '\n') {
      if (unoIncoming.startsWith("K:")) {
        String code = unoIncoming.substring(2);
        code.trim();
        Serial.printf("[UNO] Keypad code received: %s\n", code.c_str());
        verifyAccessCode(code);
      }
      unoIncoming = "";
    } else {
      unoIncoming += c;
    }
  }
}

void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;
  String url = String(API_BASE_URL) + "/api/commands/pending/";
  if (!https.begin(client, url)) {
    Serial.println("[Commands] Unable to begin connection to " + url);
    return;
  }
  https.addHeader("X-Device-Key", DEVICE_KEY);
  int httpCode = https.GET();
  if (httpCode != 200) {
    if (httpCode > 0) Serial.printf("[Commands] GET -> %d\n", httpCode);
    else Serial.printf("[Commands] GET failed, error: %s\n", https.errorToString(httpCode).c_str());
    https.end();
    return;
  }
  String response = https.getString();
  https.end();
  JsonDocument doc;
  if (deserializeJson(doc, response)) {
    Serial.println("[Commands] JSON parse failed");
    return;
  }
  for (JsonObject cmd : doc.as<JsonArray>()) {
    int commandId = cmd["id"];
    const char* action = cmd["action"];
    if (strcmp(action, "garage_open") == 0) {
      moveGate(true);
      ackCommand(commandId);
    } else if (strcmp(action, "garage_deny") == 0) {
      moveGate(false);
      ackCommand(commandId);
    } else if (strcmp(action, "light_on") == 0) {
      setLight(true);
      ackCommand(commandId);
    } else if (strcmp(action, "light_off") == 0) {
      setLight(false);
      ackCommand(commandId);
    } else if (strcmp(action, "fan_on") == 0) {
      setFan(true, fanSpeedLevel > 0 ? fanSpeedLevel : 2);
      ackCommand(commandId);
    } else if (strcmp(action, "fan_off") == 0) {
      setFan(false, fanSpeedLevel);
      ackCommand(commandId);
    } else if (strncmp(action, "fan_speed_", 10) == 0) {
      int level = action[10] - '0';
      if (level >= 0 && level <= 3) setFan(level > 0, level);
      ackCommand(commandId);
    } else {
      Serial.printf("[Commands] Ignoring unhandled action: %s\n", action);
    }
  }
}

bool sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Skipped - WiFi not connected");
    return false;
  }
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  float distance = readDistanceCm();
  float gasPercent = readGasPercent();
  bool flame = readFlameDetected();
  VibrationReading vib = readVibration();

  buzzerSetAlarm(flame || gasPercent >= GAS_DANGER_PERCENT);

  JsonDocument doc;
  doc["vibration_detected"] = vib.detected;
  doc["vibration_deviation"] = vib.deviation;
  Serial.printf("[ADXL345] deviation=%.2f detected=%s\n", vib.deviation, vib.detected ? "true" : "false");

  doc["gas_percent"] = gasPercent;
  Serial.printf("[MQ-2] gas=%.1f%% (raw=%d)\n", gasPercent, analogRead(GAS_PIN));

  doc["flame_detected"] = flame;
  Serial.printf("[Flame] detected=%s\n", flame ? "true" : "false");

  if (!isValidTemp(temperature) || !isValidHumidity(humidity)) {
    Serial.println("[DHT] Reading out of valid range - check wiring/power noise.");
  } else {
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    Serial.printf("[DHT] temp=%.1fC humidity=%.1f%%\n", temperature, humidity);
  }

  bool motionDetected = motionLatched;
  doc["motion"] = motionDetected;
  Serial.printf("[PIR] motion=%s (live=%s)\n", motionDetected ? "true" : "false", pirRawMotion ? "true" : "false");
  motionLatched = false;

  float lightPct = readLightPercent();
  doc["light_percent"] = lightPct;
  Serial.printf("[LDR] light=%.1f%%\n", lightPct);

  if (isnan(distance)) {
    Serial.println("[HC-SR04] No echo received - check wiring/range.");
  } else {
    doc["distance_cm"] = distance;
    bool carDetected = distance < CAR_DETECTED_DISTANCE_CM;
    doc["car_detected"] = carDetected;
    Serial.printf("[HC-SR04] distance=%.1fcm car_detected=%s\n", distance, carDetected ? "true" : "false");
  }

  doc["light_on"] = lightState;
  doc["fan_on"] = fanState;
  Serial.printf("[Fan/Light] fan_on=%s (speed %d) light_on=%s\n",
                fanState ? "true" : "false", fanSpeedLevel, lightState ? "true" : "false");

  String body;
  serializeJson(doc, body);

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;
  String url = String(API_BASE_URL) + "/api/sensors/data/";
  if (!https.begin(client, url)) {
    Serial.println("[HTTP] Unable to begin connection to " + url);
    return false;
  }
  https.addHeader("Content-Type", "application/json");
  https.addHeader("X-Device-Key", DEVICE_KEY);

  int httpCode = https.POST(body);
  if (httpCode > 0) {
    String response = https.getString();
    Serial.printf("[HTTP] POST %s -> %d\n", url.c_str(), httpCode);
    Serial.println("[HTTP] Response body: " + response);
  } else {
    Serial.printf("[HTTP] POST failed, error: %s\n", https.errorToString(httpCode).c_str());
  }
  https.end();
  return httpCode > 0 && httpCode < 300;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[Boot] SmartNest ESP32");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  dht.begin();

  gateServo.setPeriodHertz(50);
  gateServo.attach(SERVO_PIN, 500, 2400);
  moveGate(false);

  pinMode(FLAME_PIN, INPUT);

  pinMode(LIGHT_PIN, OUTPUT);
  digitalWrite(LIGHT_PIN, LOW);

  pinMode(FAN_LED_PIN, OUTPUT);
  digitalWrite(FAN_LED_PIN, LOW);
  pinMode(PIR_PIN, INPUT);

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  UnoSerial.begin(9600, SERIAL_8N1, UNO_RX_PIN, UNO_TX_PIN);

  Wire.begin(21, 22);
  if (!accel.begin()) {
    Serial.println("[ADXL345] Not detected - check wiring/address");
    adxlOk = false;
  } else {
    accel.setRange(ADXL345_RANGE_4_G);
    Serial.println("[ADXL345] Initialized");
    adxlOk = true;
  }

  connectWiFi();
}

void loop() {
  unsigned long now = millis();

  updateFanBlink();
  updateMotion();
  updateBuzzer();
  pollUnoSerial();

  if (gatePendingClose && now - gateOpenedAt > GATE_AUTO_CLOSE_MS) {
    moveGate(false);
    gatePendingClose = false;
  }

  if (WiFi.status() != WL_CONNECTED && now - lastWifiRetry > WIFI_RETRY_INTERVAL_MS) {
    lastWifiRetry = now;
    Serial.println("[WiFi] Not connected, retrying...");
    connectWiFi();
  }

  if (now - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    bool ok = sendSensorData();
    if (ok) {
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
      Serial.printf("[Backend] consecutive failures: %d\n", consecutiveFailures);
    }
    if (consecutiveFailures >= OFFLINE_THRESHOLD) {
      applyLocalAutomation();
    }
  }

  if (now - lastCommandPoll > COMMAND_POLL_INTERVAL_MS) {
    lastCommandPoll = now;
    pollCommands();
  }
}
