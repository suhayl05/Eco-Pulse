# 🌿 Eco-Pulse — AIoT Plant Health Monitoring Platform

> **ESP32 edge telemetry · FastAPI backend · Random Forest ML (94% accuracy) · GPT-4o-mini vision · Gamified PWA**

Eco-Pulse is a production-grade AIoT system that monitors plant health in real time using physical sensors, machine learning, and AI vision — deployed as an installable Progressive Web App via Cloudflare Tunnel. Built independently from hardware to cloud.

**2 months of continuous operation · Thousands of real sensor readings · 4 live sensor streams**

---

## 📸 Screenshots

| Dashboard | Sensor Trends | Vision AI | Achievements |
|-----------|--------------|-----------|--------------|
| Real-time health score, sensor readings, ML forecast | Live soil, temp, humidity charts | GPT-4o-mini leaf disease detection | 20+ unlockable badges and levels |

---

## 🏗️ Architecture

```
ESP32 (C++ Firmware)
    │
    ├── Soil Moisture Sensor
    ├── Temperature Sensor
    ├── Humidity Sensor (DHT)
    └── Light Sensor
         │
         ▼  Wi-Fi / JSON
    FastAPI Backend (Python)
         │
         ├── Random Forest ML Model ──► Health Score (0–100%)
         ├── ML Forecast Engine ──────► Care Recommendations
         ├── GPT-4o-mini Vision API ──► Disease Detection
         └── Plant Talk AI ───────────► Conversational Interface
                   │
                   ▼
         Progressive Web App (PWA)
              ├── Live Dashboard
              ├── Sensor Trend Charts
              ├── History & Analytics
              ├── Leaderboard & Gamification
              └── Vision AI Scanner
                   │
                   ▼
         Cloudflare Tunnel
         (Globally accessible HTTPS)
```

---

## ✨ Features

### 🌱 Real-Time Plant Health Monitoring
- Live health score (0–100%) updated continuously from sensor data
- 4 environmental metrics: soil moisture, temperature, humidity, light intensity
- Optimal range indicators for each parameter
- Status labels: Healthy / Doing Well / Needs Attention / Critical

### 🤖 ML-Optimised Intelligence
- **Random Forest ensemble** trained on real sensor data — **94% classification accuracy**
- Detects plant health states and recommends specific care actions
- ML-Optimised Forecast: actionable predictions ("Decrease humidity to reach 85% health")
- Projected Lifespan estimation and Environmental Stability score
- Historical trend charts showing soil, temperature, and humidity over time

### 👁️ Vision AI — Disease Detection
- Upload a photo or use camera to scan your plant
- GPT-4o-mini vision identifies diseases, deficiencies, and health issues
- Returns diagnosis with confidence and recommended treatment

### 💬 Plant Talk — AI Chat Interface
- Conversational AI interface where you talk directly to your plant
- Plant responds in character about its current condition, needs, and mood
- Powered by GPT-4o-mini with live sensor context injected into every message

### 🎮 Gamification System
- **Player Points** earned through consistent care and analysis
- **20+ Achievements**: Night Owl (analyse after 9PM), Centurion (100% score), Clairvoyant (20 consecutive perfect readings), Desert (perfect in heat), Void (analyse in dark), and more
- **Skill Tiers**: Seedling → Sprout → Oak → Master → Scientist → Legend (5000pts)
- **Leaderboard** for competitive plant care
- Level progression with XP tracking

### 📊 History & Analytics
- Full session history with timestamped readings
- Multi-line sensor trend charts (soil %, temperature °C, humidity %)
- Best day detection and trend analysis (+100% trend tracking)
- Status tab with system diagnostics

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Firmware | C++ (Arduino/ESP32) |
| Backend | Python, FastAPI |
| ML Model | scikit-learn, Random Forest |
| AI Vision | OpenAI GPT-4o-mini API |
| Frontend | JavaScript, HTML5, CSS3, Chart.js |
| Deployment | Progressive Web App, Cloudflare Tunnel |
| Hardware | ESP32, DHT sensor, soil moisture sensor, LDR light sensor |

---

## 🚀 Quick Start

### Hardware Setup
1. Flash `arduino/eco_pulse/` firmware to your ESP32
2. Connect sensors:
   - Soil moisture → Analog pin
   - DHT22 → Digital pin
   - LDR → Analog pin
3. Update Wi-Fi credentials in firmware

### Backend + PWA
```bash
# Clone the repo
git clone https://github.com/suhayl05/Eco-Pulse.git
cd Eco-Pulse

# Install dependencies
pip install -r requirements.txt

# Add your OpenAI API key to .env
echo "OPENAI_API_KEY=your_key_here" > .env

# Start the app
python eco_pulse_app.py
```

### Global Access via Cloudflare Tunnel
```bash
# Download Cloudflare daemon
./DOWNLOAD_CLOUDFLARED.ps1

# Start tunnel (gets you an HTTPS URL)
START_PULSE_TUNNEL.bat
```

Open the HTTPS URL in Chrome/Edge/Mobile → Install prompt appears → Add to home screen.

---

## 📁 Repository Structure

```
Eco-Pulse/
├── arduino/eco_pulse/     # ESP32 C++ firmware
├── backend/               # FastAPI server + ML pipeline
├── frontend/              # PWA (HTML/CSS/JS)
├── ml/                    # Jupyter notebooks, model training
├── data/                  # Sensor datasets
├── scripts/               # Utility scripts
└── eco_pulse_app.py       # Main application entry point
```

---

## 🔬 ML Model Details

- **Algorithm**: Random Forest Classifier (scikit-learn)
- **Accuracy**: 94% on held-out test set
- **Features**: Soil moisture %, temperature °C, humidity %, light level
- **Training data**: Real sensor readings collected over 2 months of continuous operation
- **Output**: Health classification + confidence score + care recommendation

---

## 👤 Author

**Mohammed Suhayl** — BEng Computer Systems Engineering, Middlesex University Dubai

[![GitHub](https://img.shields.io/badge/GitHub-suhayl05-181717?logo=github)](https://github.com/suhayl05)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-mohammed--suhayl-0077B5?logo=linkedin)](https://linkedin.com/in/mohammed-suhayl-64aa70325)

---

*Built independently — hardware to cloud. No frameworks. No shortcuts.*
