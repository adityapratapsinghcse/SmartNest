#include <Arduino.h>
#include <SoftwareSerial.h>
#include <Keypad.h>

SoftwareSerial espSerial(8, 9);  // RX, TX

const byte KEYPAD_ROWS = 4;
const byte KEYPAD_COLS = 4;
char keys[KEYPAD_ROWS][KEYPAD_COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[KEYPAD_ROWS] = {6, 7, 10, 13};
byte colPins[KEYPAD_COLS] = {A0, A1, A4, A5};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, KEYPAD_ROWS, KEYPAD_COLS);

String incoming = "";
String enteredCode = "";

void handleLine(String line) {
  if (line.startsWith("A:")) {
    String result = line.substring(2);
    Serial.print("[Access] Result: ");
    Serial.println(result);
  }
}

void setup() {
  Serial.begin(9600);
  espSerial.begin(9600);
  Serial.println("[UNO] Ready. Enter code, then press #");
}

void loop() {
  while (espSerial.available()) {
    char c = espSerial.read();
    if (c == '\n') {
      handleLine(incoming);
      incoming = "";
    } else {
      incoming += c;
    }
  }

  char key = keypad.getKey();
  if (key) {
    if (key == '#') {
      if (enteredCode.length() > 0) {
        espSerial.print("K:");
        espSerial.print(enteredCode);
        espSerial.print("\n");
        Serial.print("[UNO] Sent code: ");
        Serial.println(enteredCode);
        enteredCode = "";
      }
    } else if (key == '*') {
      enteredCode = "";
      Serial.println("[UNO] Code cleared");
    } else if (key >= '0' && key <= '9') {
      if (enteredCode.length() < 8) {
        enteredCode += key;
        Serial.print("[UNO] Entered: ");
        Serial.println(enteredCode);
      }
    }
  }
}
