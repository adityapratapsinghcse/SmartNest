# SmartNest — The Nexus Dome

A full-stack smart home system: a Django/Channels backend, a React (Vite + Capacitor)
web and mobile dashboard, and ESP32 + Arduino UNO firmware controlling real sensors,
a keypad-based gate lock, and simulated actuators (fan, light).

The live deployment sleeps/stops from time to time (free-tier hosting), so this README
covers running the whole stack locally — backend, frontend, and both firmware boards.

---

## 1. Architecture

```
firmware/esp32   ── WiFi, sensors, servo, buzzer, backend HTTP calls, UART to UNO
firmware/uno     ── Keypad input, sends entered code to ESP32 over UART
backend/         ── Django + Django REST Framework + Channels (WebSockets) + Celery
web/             ── React (Vite) dashboard; also wrapped via Capacitor for Android
```

Data flow: sensors → ESP32 → `POST /api/sensors/data/` → Django → WebSocket push →
web dashboard updates live. Commands flow the other way: dashboard button →
`POST /api/commands/send/` → ESP32 polls `/api/commands/pending/` → acts → acks.
Keypad codes: UNO → ESP32 (UART) → `POST /api/access/verify/` → granted/denied →
gate servo + buzzer + logged to `AccessLog`.

---

## 2. Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (local install, or use a free Postgres from Railway/Neon/Supabase)
- Redis (for Channels + Celery) — `redis-server` locally, or Docker
- [PlatformIO](https://platformio.org/) — via VS Code extension, or `pip install platformio`
- An ESP32 (DOIT DevKit V1) and an Arduino UNO, USB cables

---

## 3. Backend setup (Django)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
SECRET_KEY=any-long-random-string-for-local-dev
DEBUG=True
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/smartnest
REDIS_URL=redis://127.0.0.1:6379/0
FIREBASE_CREDENTIALS_JSON={}
```

`FIREBASE_CREDENTIALS_JSON` can stay `{}` locally — push notifications just won't fire,
everything else works fine.

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

In two more terminals (same venv), for command polling / automation to work fully:

```bash
celery -A smartnest worker --loglevel=info
celery -A smartnest beat --loglevel=info
```

Backend is now at `http://localhost:8000`. Log into `/admin/` with your superuser to
create a `Household`, a `Device` (note its generated `device_key`), and later an
`RFIDCard` (used as the keypad PIN — see firmware section).

---

## 4. Frontend setup (React)

```bash
cd web
npm install
```

Create `web/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

```bash
npm run dev
```

Dashboard is now at `http://localhost:5173`. Register an account, join/create the
household you made in Django admin.

### Mobile (Android, via Capacitor)

The `web/android` folder is a Capacitor-wrapped build of the same React app.

```bash
npm run build
npx cap sync android
npx cap open android
```

This opens Android Studio — build/run from there onto a device or emulator. Point
`VITE_API_BASE_URL` at your backend's real reachable address (not `localhost`, since
that means "the phone itself" — use your machine's LAN IP or the deployed backend URL)
before running `npm run build` for a mobile build.

---

## 5. Firmware setup (PlatformIO)

Each board is its own PlatformIO project — **open them in separate VS Code windows**,
don't mix them into one project.

### ESP32 (`firmware/esp32`)

```bash
cp firmware/esp32/include/secrets.h.example firmware/esp32/include/secrets.h
```

Edit `secrets.h` with your WiFi credentials, your backend's URL, and the `device_key`
from Django admin. Then open `firmware/esp32` in VS Code with PlatformIO, connect the
ESP32, and Upload.

### Arduino UNO (`firmware/uno`)

No secrets needed — it only talks to the ESP32 over UART, never to WiFi/backend
directly. Open `firmware/uno` in a separate VS Code window, connect the UNO, Upload.

### Hardware pin reference (ESP32)

| Function | Pin |
|---|---|
| DHT11 data | GPIO4 |
| HC-SR04 TRIG / ECHO | GPIO5 / GPIO18 |
| Garage servo | GPIO14 |
| MQ-2 gas (analog) | GPIO34 |
| Flame sensor | GPIO35 |
| LDR (analog) | GPIO32 |
| PIR motion | GPIO33 |
| Fan (demo LED) | GPIO26 |
| Light (demo LED) | GPIO27 |
| Buzzer | GPIO23 |
| ADXL345 SDA / SCL | GPIO21 / GPIO22 |
| UART to UNO: RX2 / TX2 | GPIO16 / GPIO17 |

**ADXL345 (I2C):** VCC→3.3V, GND→GND, SDA→21, SCL→22, CS→3.3V, SDO→GND (CS/SDO
floating is the most common reason `accel.begin()` silently fails).

**UNO→ESP32 UART:** UNO is 5V logic, ESP32 RX is 3.3V-only — a voltage divider
(1kΩ + 2kΩ) is required on the UNO TX → ESP32 RX line. ESP32 TX → UNO RX can connect
directly. Common GND between both boards is required.

### Hardware pin reference (UNO)

| Function | Pins |
|---|---|
| UART to ESP32 (SoftwareSerial) | RX=D8, TX=D9 |
| Keypad rows | D6, D7, D10, D13 |
| Keypad columns | A0, A1, A4, A5 |

### Setting the keypad PIN

The keypad reuses the existing RFID-card access system — no separate "PIN" model.
In Django admin (or the Security page in the dashboard), add an `RFIDCard` with
`uid` set to whatever digits you want as the PIN (e.g. `1234`) and `is_active` checked.
Typing that code on the keypad + `#` sends it to `/api/access/verify/`, which checks it
against this same table.

---

## 6. Testing without hardware

Every sensor/actuator has a standalone PlatformIO test sketch used during development
(LCD alone, keypad alone, DHT alone, LDR alone, etc.) — see the project's chat history
for these; they're not committed since they're throwaway diagnostics, but the pattern
is: strip `main.cpp` down to just the one sensor/library, print raw values to Serial,
confirm before re-integrating into the full sketch.

You can also test the backend independently of any hardware with `curl`:

```bash
curl -X POST http://localhost:8000/api/access/verify/ \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: YOUR_DEVICE_KEY" \
  -d '{"rfid_uid": "1234"}'
```

---

## 7. Notes

- The live deployment uses Railway (backend, Postgres, Redis) — see `backend/Procfile`
  and `backend/runtime.txt`. Free-tier services on Railway/Render sleep after
  inactivity and can take ~30-60s to wake on the first request after idling; if the
  dashboard looks stuck on load, that's usually why.
- `CORS_ALLOW_ALL_ORIGINS = True` is set for development convenience — tighten this
  before any real production use.
