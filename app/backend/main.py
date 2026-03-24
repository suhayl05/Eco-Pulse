import os
import sqlite3
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Eco Pulse Backend")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Setup
DB_PATH = "ecopulse.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            points INTEGER DEFAULT 0,
            level TEXT DEFAULT 'Beginner'
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recent_checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            health_score INTEGER,
            temp REAL,
            humidity REAL,
            soil REAL,
            light INTEGER
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class Player(BaseModel):
    id: Optional[int] = None
    name: str
    type: str
    points: int = 0
    level: str = "Beginner"

def get_level(points):
    levels = ["Seedling", "Sprout", "Sapling", "Mature", "Expert", "Master", "Legend"]
    idx = min(len(levels)-1, max(0, points // 200))
    return levels[idx]

@app.get("/sensor-data")
async def get_sensor_data(esp32_ip: str = "192.168.1.100"):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"http://{esp32_ip}/data", timeout=2.0)
            data = response.json()
            # Accuracy Fix: Scaling Soil 300-1023 to 0-100%
            data['soil_percent'] = max(0, min(100, int((1 - (data['soil'] - 300) / 723) * 100)))
            # Light is now digital on D5 (passed as light_percent from Arduino)
            data['light'] = data.get('light_percent', 50)
            return data
        except Exception as e:
            return {
                "temperature": 24.5,
                "humidity": 65.0,
                "soil": 550,
                "soil_percent": 65,
                "light": 1,
                "simulated": True
            }

@app.post("/reset-leaderboard")
async def reset_leaderboard():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE players SET points = 0, level = 'Seedling'")
    conn.commit()
    conn.close()
    return {"message": "Leaderboard reset"}

@app.post("/analyze-health")
async def analyze_health(data: dict, user_name: Optional[str] = "Guest"):
    # Health calculation logic
    soil = data.get("soil", 0)
    temp = data.get("temperature", 25)
    
    score = 100
    if soil < 300: score -= 30
    elif soil > 900: score -= 20
    if temp > 30 or temp < 15: score -= 15
    
    status = "Perfect"
    points_to_add = 25
    if score < 40: 
        status = "Critical"
        points_to_add = -25
    elif score < 61: 
        status = "Fair"
        points_to_add = -5
    elif score < 86: 
        status = "Good"
        points_to_add = 10
        
    # Update Player points/level
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE players SET points = points + ? WHERE name = ?", (points_to_add, user_name))
    
    cursor.execute("SELECT points FROM players WHERE name = ?", (user_name,))
    row = cursor.fetchone()
    new_level = "Beginner"
    if row:
        new_level = get_level(row[0])
        cursor.execute("UPDATE players SET level = ? WHERE name = ?", (new_level, user_name))

    # Save check
    cursor.execute("INSERT INTO recent_checks (health_score, temp, humidity, soil, light) VALUES (?, ?, ?, ?, ?)",
                   (score, temp, data.get("humidity"), soil, data.get("light")))
    conn.commit()
    conn.close()

    ESP32_IP = os.getenv("ESP32_IP", "192.168.1.100")
    
    ESP32_IP = os.getenv("ESP32_IP", "192.168.1.100")
    
    # Send status to ESP32 for LCD (Non-blocking background task)
    import asyncio
    async def update_lcd_task():
        async with httpx.AsyncClient() as client_http:
            try:
                line1 = f"Status: {status}"
                sign = "+" if points_to_add >= 0 else ""
                line2 = f"HP:{score} PT:{sign}{points_to_add}"
                print(f"Syncing to LCD: {line1} | {line2}")
                await client_http.post(f"http://{ESP32_IP}/lcd", data={"line1": line1, "line2": line2}, timeout=1.0)
            except Exception as e:
                print(f"LCD Error (Silenced): {e}")

    asyncio.create_task(update_lcd_task())
    
    return {"score": score, "status": status, "points": points_to_add, "level": new_level}

@app.get("/leaderboard", response_model=List[Player])
async def get_leaderboard():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM players ORDER BY points DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "type": r[2], "points": r[3], "level": r[4]} for r in rows]

@app.post("/players")
async def add_player(player: Player):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO players (name, type, points, level) VALUES (?, ?, ?, ?)",
                   (player.name, player.type, player.points, player.level))
    conn.commit()
    conn.close()
    return {"message": "Player added"}

@app.delete("/players/{player_id}")
async def remove_player(player_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM players WHERE id = ?", (player_id,))
    conn.commit()
    conn.close()
    return {"message": "Player removed"}

@app.post("/ai-vision")
async def ai_vision(file: UploadFile = File(...)):
    # GPT-4o Vision analysis
    # Implementation placeholder for image reading
    content = await file.read()
    import base64
    base64_image = base64.b64encode(content).decode('utf-8')
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this plant. How does it feel and what can be done? Answer in exactly 2 short lines."},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ]
    )
    
    return {"analysis": response.choices[0].message.content}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
