import os, sqlite3, httpx, socket, asyncio, base64, joblib, pandas as pd
from fastapi import FastAPI, UploadFile, File, Response, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load Environment from root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

ESP_IP   = "192.168.1.114"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH  = os.path.join(BASE_DIR, "data", "ecopulse.db")
api_key  = os.getenv("OPENAI_API_KEY")

SOIL_DRY = 3280
SOIL_WET = 1000

# Global ML Model
ML_MODEL = None
try:
    model_path = os.path.join(BASE_DIR, "ml", "plant_model.joblib")
    if os.path.exists(model_path):
        ML_MODEL = joblib.load(model_path)
        print("[ML] Model loaded successfully.")
except Exception as e:
    print(f"[ML] Load fail: {e}")

def raw_to_pct(raw): 
    val = max(0, min(100, int((SOIL_DRY - int(raw)) / (SOIL_DRY - SOIL_WET) * 100)))
    return val if val > 2 else 0 

def get_level(p):
    for t,l in [(0,"Seedling"),(150,"Sprout"),(300,"Sapling"),(600,"Naturalist"),(1000,"Botanist"),(2000,"Expert"),(5000,"Master")]:
        if p < t: return l
    return "Master"

@asynccontextmanager
async def lifespan(app):
    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS players (name TEXT PRIMARY KEY, points INTEGER DEFAULT 0, level TEXT DEFAULT "Seedling", streak INTEGER DEFAULT 0)')
    c.execute('CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, score INTEGER, status TEXT, feeling TEXT, pts_earned INTEGER DEFAULT 0, ts DATETIME DEFAULT CURRENT_TIMESTAMP, temp REAL, hum REAL, soil REAL, light TEXT)')
    for col in [("feeling","TEXT"),("pts_earned","INTEGER DEFAULT 0"),("temp","REAL"),("hum","REAL"),("soil","REAL"),("light","TEXT")]:
        try: c.execute(f"ALTER TABLE history ADD COLUMN {col[0]} {col[1]}")
        except: pass
    conn.commit(); conn.close()
    bg_task = asyncio.create_task(background_scorer())
    yield
    bg_task.cancel()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Setup Templates & Static
frontend_dir = os.path.join(BASE_DIR, "frontend")
app.mount("/static", StaticFiles(directory=os.path.join(frontend_dir, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(frontend_dir, "templates"))

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/sensor-data")
async def sensor_data():
    async with httpx.AsyncClient() as cl:
        try:
            r = await cl.get(f"http://{ESP_IP}/data", timeout=1.5)
            d = r.json()
            d['soil_percent'] = raw_to_pct(d.get('soil', SOIL_DRY))
            d['light_status'] = "Bright" if int(d.get('light_percent',0)) > 50 else "Dark"
            print(f"[HW] T={d.get('temperature')} H={d.get('humidity')} soil_raw={d.get('soil')} soil%={d['soil_percent']}")
            return d
        except Exception as e:
            print(f"[HW] FAIL: {e}"); return {"sim_fallback": True}

@app.post("/analyze-health")
async def analyze(data: dict, user_name: str = "Player"):
    temp  = float(data.get('temperature', 25))
    soil  = int(data.get('soil_percent', 50))
    hum   = int(data.get('humidity', 60))
    light = str(data.get('light_status', 'Bright'))
    
    s_score = 0; t_score = 0; h_score = 0; l_score = 0
    feeling = "I'm doing okay"; solution = "Keep it up!"
    
    if 40 <= soil <= 80: s_score = 25
    elif 20 <= soil < 40: s_score = 16; feeling="I'm thirsty"; solution="Water me a bit"
    elif 80 < soil <= 95: s_score = 16; feeling="A bit too wet"; solution="Stop watering"
    else: s_score = 5; feeling="I'm struggling!"; solution="soil is dry!"
    
    if 20 <= temp <= 45: t_score = 25
    elif 10 <= temp < 20 or 45 < temp <= 55: t_score = 16; feeling="Temp is off"; solution="Adjust my spot"
    else: t_score = 5; feeling="I'm struggling!"; solution="Too hot/cold!"
    
    if 40 <= hum <= 80: h_score = 25
    elif 30 <= hum < 40 or 80 < hum <= 90: h_score = 10; feeling="Humidity off"
    else: h_score = 5; feeling="Air is bad!"
    
    if light == "Bright": l_score = 25
    else: l_score = 10; feeling="Need more light"; solution="Move me to sun"

    if ML_MODEL:
        try:
            df_features = pd.DataFrame(
                [[temp, hum, float(soil), 1 if light == "Bright" else 0]], 
                columns=['temperature', 'humidity', 'soil_percent', 'light_status']
            )
            score = round(float(ML_MODEL.predict(df_features)[0]))
        except: score = s_score + t_score + h_score + l_score
    else: score = s_score + t_score + h_score + l_score
    
    if   score <= 10: pts = -25; status = "Struggling"
    elif score <= 25: pts = -15; status = "Struggling"
    elif score <= 35: pts = -10; status = "Need Help"
    elif score <= 45: pts = -5;  status = "Struggling"
    elif score <= 55: pts = 5;   status = "I'm okay"
    elif score <= 75: pts = 10;  status = "Doing well"
    elif score <= 89: pts = 15;  status = "Healthy"
    else:             pts = 25;  status = "Perfect"
    
    ml_advice = "Follow current care steps."
    if ML_MODEL:
        try:
            best_score = score
            best_action = "Maintain current conditions."
            scenarios = [
                ("temp", temp + 3, f"Try raising temp to {temp+3}\u00b0C"),
                ("temp", temp - 3, f"Try lowering temp to {temp-3}\u00b0C"),
                ("hum", hum + 10, "Try increasing humidity (mist air)"),
                ("hum", hum - 10, "Try decreasing humidity (ventilate)"),
                ("soil", soil + 10, "Try adding a bit more water"),
                ("soil", soil - 10, "Try letting soil dry out slightly")
            ]
            for feat_name, val, action_text in scenarios:
                s_temp = val if feat_name == "temp" else temp
                s_hum = val if feat_name == "hum" else hum
                s_soil = val if feat_name == "soil" else soil
                df_s = pd.DataFrame([[float(s_temp), float(s_hum), float(s_soil), 1 if light == "Bright" else 0]],
                                    columns=['temperature', 'humidity', 'soil_percent', 'light_status'])
                s_pred = round(float(ML_MODEL.predict(df_s)[0]))
                if s_pred > best_score:
                    best_score = s_pred
                    best_action = action_text
            if best_score > score: ml_advice = f"Forecast: {best_action} to reach {best_score}% health."
            else: ml_advice = "Forecast: Conditions are currently optimal according to ML patterns."
        except: pass

    try:
        conn = sqlite3.connect(DB_PATH); c = conn.cursor()
        c.execute("INSERT OR IGNORE INTO players (name) VALUES (?)", (user_name,))
        from datetime import datetime, timedelta, timezone
        tz = timezone(timedelta(hours=4))
        now_local = datetime.now(tz)
        ts_str = now_local.strftime("%Y-%m-%d %H:%M:%S")
        today = now_local.date()
        
        last = c.execute("SELECT ts FROM history WHERE user=? AND status NOT LIKE '%Automated%' AND status != 'Hourly Scan' ORDER BY ts DESC LIMIT 1", (user_name,)).fetchone()
        row = c.execute("SELECT points, streak FROM players WHERE name=?", (user_name,)).fetchone()
        streak = row[1] if row else 0
        if last:
            try:
                l_ts = last[0].replace('T', ' ')
                last_date = datetime.strptime(l_ts[:10], "%Y-%m-%d").date()
                if today == last_date + timedelta(days=1): streak += 1
                elif today > last_date + timedelta(days=1): streak = 1
                elif today == last_date and streak == 0: streak = 1
            except: streak = 1
        else: streak = 1
        
        c.execute("UPDATE players SET points=MIN(5000, MAX(0, points+?)), streak=? WHERE name=?", (pts, streak, user_name))
        new_pts = c.execute("SELECT points FROM players WHERE name=?", (user_name,)).fetchone()[0]
        c.execute("UPDATE players SET level=? WHERE name=?", (get_level(new_pts), user_name))
        c.execute("INSERT INTO history (user,score,status,feeling,pts_earned,ts,temp,hum,soil,light) VALUES (?,?,?,?,?,?,?,?,?,?)", (user_name,score,status,feeling,pts,ts_str,temp,hum,float(soil),light))
        
        deep_insights = {"lifespan": "Analyzing...", "stability": 0, "alerts": []}
        try:
            cutoff = (now_local - timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
            day_history = c.execute("SELECT score FROM history WHERE user=? AND ts > ?", (user_name, cutoff)).fetchall()
            if day_history:
                optimal_count = sum(1 for (s,) in day_history if s >= 76)
                deep_insights["stability"] = int((optimal_count / len(day_history)) * 100)
            else: deep_insights["stability"] = 100 if score >= 76 else 0
            recent_s = c.execute("SELECT score FROM history WHERE user=? ORDER BY ts DESC LIMIT 8", (user_name,)).fetchall()
            trend_val = recent_s[0][0] - recent_s[-1][0] if len(recent_s) >= 2 else 0
            ls_days = int(90 * (score / 100))
            if trend_val < -10: ls_days = int(ls_days * 0.5)
            elif trend_val > 10: ls_days = int(ls_days * 1.2)
            if score >= 90 and trend_val >= 0: deep_insights["lifespan"] = "Optimal (Indefinite)"
            elif score < 30: deep_insights["lifespan"] = f"{max(1, ls_days)} Days (Critical Window)"
            else: deep_insights["lifespan"] = f"{ls_days} Days"
            alerts = []
            if soil > 85 and hum > 80: alerts.append("Hydration Imbalance")
            if light == "Strong" and temp > 40: alerts.append("Thermal Stress")
            if hum < 30: alerts.append("Atmosphere Tension")
            if soil < 20: alerts.append("Hydration Stress")
            deep_insights["alerts"] = alerts if alerts else ["System Stable"]
        except: pass
        conn.commit(); conn.close()
    except Exception as e: print(f"[DB] {e}"); deep_insights = {"lifespan": "Error", "stability": 0, "alerts": ["DB Error"]}

    async def send_lcd():
        issues = []
        if soil < 40: issues.append("Dry Soil")
        elif soil > 80: issues.append("High Soil Moisture")
        if hum < 40: issues.append("Dry Air")
        elif hum > 80: issues.append("High Humidity")
        if light != "Bright": issues.append("Need Sunlight")
        l1 = ", ".join(issues) if issues else "All Optimal"
        l2_status = "I'm doing ok"
        if score >= 90: l2_status = "I'm perfect"
        elif score < 45: l2_status = "Please, I'm struggling"
        sols = [l2_status]
        if soil < 40: sols.append("please add water")
        elif soil > 80: sols.append("could you stop water")
        if hum < 40: sols.append("please mist air")
        elif hum > 80: sols.append("reduce humidity")
        if light != "Bright": sols.append("please move to window")
        l2 = ", ".join(sols)
        async with httpx.AsyncClient() as cl2:
            try: await cl2.post(f"http://{ESP_IP}/lcd", data={"line1":l1,"line2":l2}, timeout=1.0)
            except: pass
    asyncio.create_task(send_lcd())
    return {"score":score,"status":status,"points":pts,"feeling":feeling,"solution":solution,"ml_advice":ml_advice,"deep_insights":deep_insights}

async def background_scorer():
    from datetime import datetime, timezone, timedelta
    print("[SYSTEM] Background autonomous monitor: ACTIVE (Interval: 1 hour)")
    while True:
        try:
            await asyncio.sleep(3600)
            data = await sensor_data()
            if data.get("sim_fallback"): data = {"temperature": 25, "humidity": 60, "soil_percent": 50, "light_status": "Bright"}
            temp = float(data.get('temperature', 25)); hum = int(data.get('humidity', 60)); soil = int(data.get('soil_percent', 50)); light = data.get('light_status', 'Bright')
            score = 0
            if 20 <= temp <= 45: score += 25
            elif 15 <= temp <= 50: score += 15
            else: score += 5
            if 40 <= hum <= 80: score += 25
            elif 30 <= hum <= 90: score += 15
            else: score += 5
            if 40 <= soil <= 80: score += 25
            elif 20 <= soil <= 90: score += 15
            else: score += 5
            if light == "Bright": score += 25
            else: score += 10
            pts = 0
            for t, p in [(90, 25), (76, 15), (56, 10), (46, 5), (36, -5), (26, -10), (11, -15), (0, -25)]:
                if score >= t: pts = p; break
            conn = sqlite3.connect(DB_PATH); c = conn.cursor()
            last = c.execute("SELECT user FROM history ORDER BY ts DESC LIMIT 1").fetchone()
            if last:
                p_name = last[0]; tz = timezone(timedelta(hours=4)); ts_str = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
                c.execute("UPDATE players SET points=MAX(0,points+?) WHERE name=?", (pts, p_name))
                c.execute("INSERT INTO history (user, score, status, feeling, pts_earned, ts, temp, hum, soil, light) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                          (p_name, score, f"Automated", f"All OK (Auto)", pts, ts_str, temp, hum, soil, light))
                conn.commit()
            conn.close()
        except: await asyncio.sleep(60)

@app.get("/api/leaderboard")
async def leaderboard():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("SELECT name,points,level FROM players ORDER BY points DESC LIMIT 15").fetchall()
    conn.close(); return [{"name":r[0],"points":r[1],"level":r[2]} for r in rows]

@app.get("/api/current")
async def current(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    r = conn.execute("SELECT name,points,level,streak FROM players WHERE name=?", (user_id,)).fetchone(); conn.close()
    if r: return {"name":r[0],"points":r[1],"level":r[2],"streak":r[3]}
    return {"name":user_id,"points":0,"level":"Seedling","streak":0}

@app.get("/api/history")
async def history(user: str):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("SELECT score,status,feeling,pts_earned,ts FROM history WHERE user=? ORDER BY ts DESC LIMIT 30", (user,)).fetchall()
    conn.close(); return [{"score":r[0],"status":r[1],"feeling":r[2],"pts":r[3],"ts":r[4]} for r in rows]

@app.get("/api/weekly-report")
async def weekly_report(user: str):
    from datetime import datetime, timedelta, timezone
    tz = timezone(timedelta(hours=4)); now = datetime.now(tz)
    conn = sqlite3.connect(DB_PATH); c = conn.cursor()
    days_data = []
    for i in range(14):
        dt = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        res = c.execute("SELECT AVG(score) FROM history WHERE user=? AND ts LIKE ?", (user, f"{dt}%")).fetchone()
        days_data.append(round(res[0], 1) if res and res[0] is not None else 0)
    issues = c.execute("SELECT feeling FROM history WHERE user=? AND ts > ?", (user, (now - timedelta(days=7)).strftime("%Y-%m-%d"))).fetchall()
    counts = {}
    for row in issues:
        for word in row[0].split(','):
            w = word.strip().lower()
            if w and "auto" not in w: counts[w] = counts.get(w, 0) + 1
    top_issue = max(counts, key=counts.get) if counts else "None"
    summary = "Your plant is stable."
    if api_key:
        try:
            from openai import OpenAI
            cl = OpenAI(api_key=api_key)
            prompt = f"Analyze health score history: {days_data[:7]}. Issue: {top_issue}. Give 2-line care summary. Do not use any markdown formatting or bolding."
            r = cl.chat.completions.create(model="gpt-4o-mini", messages=[{"role":"user","content":prompt}], max_tokens=100)
            summary = r.choices[0].message.content.strip()
        except: pass
    conn.close()
    curr_week = days_data[:7][::-1]; prev_week = days_data[7:14][::-1]
    curr_labels = [(now - timedelta(days=i)).strftime("%a") for i in range(7)][::-1]
    max_score = 0; best_idx = -1
    for i, score in enumerate(curr_week):
        if score > max_score: max_score = score; best_idx = i
    best_day_name = [(now - timedelta(days=i)).strftime("%A") for i in range(7)][::-1][best_idx] if best_idx != -1 else "Analyzing..."
    curr_avg = sum(curr_week)/7 if any(curr_week) else 0; prev_avg = sum(prev_week)/7 if any(prev_week) else 0
    trend = round(((curr_avg - prev_avg) / prev_avg * 100), 1) if prev_avg > 0 else (100.0 if curr_avg > 0 else 0)
    
    # ML Predictive Logic for Weekly Forecast
    ml_f = "Connect sensors to generate ML-optimized forecast."
    if curr_avg > 0:
        if trend > 5: ml_f = "ML Analysis: Growth trend detected. Conditions are improving!"
        elif trend < -5: ml_f = "ML Analysis: Decline detected. Check for consistent watering."
        else: ml_f = "ML Analysis: Ecosystem stable. Current patterns are optimal for longevity."

    return {"labels": curr_labels, "current_week": curr_week, "previous_week": prev_week, "best_day": best_day_name, "challenge": top_issue.title(), "trend": trend, "summary": summary, "ml_forecast": ml_f}

@app.delete("/players/{name}")
async def del_player(name: str):
    conn = sqlite3.connect(DB_PATH); conn.execute("DELETE FROM players WHERE name=?", (name,)); conn.commit(); conn.close(); return {"ok":True}

@app.post("/players")
async def add_player(data: dict):
    n = data.get("name","").strip()
    if n: 
        conn = sqlite3.connect(DB_PATH); conn.execute("INSERT OR IGNORE INTO players (name) VALUES (?)", (n,)); conn.commit(); conn.close()
    return {"ok":True}

@app.post("/ai-vision")
async def ai_vision(file: UploadFile = File(...)):
    if not api_key: return {"analysis":"🔑 API Key missing"}
    try:
        from openai import OpenAI
        cl = OpenAI(api_key=api_key); b64 = base64.b64encode(await file.read()).decode()
        sys_prompt = (
            "Identify the plant in this image as a world-class botanical expert. "
            "Describe its condition warmly and provide 3 clear, actionable steps for health. "
            "If and only if the image contains absolutely no plant matter (e.g., a blank wall or a random object), simply respond with: No plant detected. "
            "CRITICAL: Use ONLY plain text. Do not use ANY stars, bolding, or markdown formatting."
        )
        r = cl.chat.completions.create(model="gpt-4o-mini", messages=[{"role":"user","content":[
            {"type":"text","text":sys_prompt},
            {"type":"image_url","image_url":{"url":f"data:image/jpeg;base64,{b64}"}}]}])
        return {"analysis": r.choices[0].message.content}
    except Exception as e: return {"analysis": f"Error: {e}"}

@app.post("/chat")
async def chat(data: dict):
    if not api_key: return {"reply":"🔑 API Key missing"}
    msg = data.get("message",""); hist = data.get("history", [])
    try:
        s_data = await sensor_data()
        from openai import OpenAI
        cl = OpenAI(api_key=api_key)
        sys_msg = (
            f"You are a plant. Status: T={s_data.get('temperature')}C, H={s_data.get('humidity')}%, S={s_data.get('soil_percent')}%. "
            "Answer briefly. Do not use any markdown formatting or bolding."
        )
        msgs = [{"role":"system","content":sys_msg}] + hist + [{"role":"user","content":msg}]
        r = cl.chat.completions.create(model="gpt-4o-mini", messages=msgs)
        return {"reply": r.choices[0].message.content}
    except Exception as e: return {"reply": f"Error: {e}"}

@app.get("/manifest.json")
async def get_manifest():
    return {
        "id": "/?v=1", "name": "Eco Pulse", "short_name": "Eco Pulse", "start_url": "/", "display": "standalone",
        "orientation": "portrait", "background_color": "#7cf56e", "theme_color": "#7cf56e",
        "icons": [{"src": "/static/img/logo.png", "sizes": "192x192", "type": "image/png"}]
    }

@app.get("/sw.js")
async def service_worker():
    headers = {"Service-Worker-Allowed": "/"}
    content = "/* SW */"
    return Response(content=content, media_type="application/javascript", headers=headers)

if __name__ == "__main__":
    import uvicorn
    ip = socket.gethostbyname(socket.gethostname())
    print(f"\nECO PULSE REORGANIZED\nLocal: http://localhost:5000\nNetwork: http://{ip}:5000\n")
    uvicorn.run(app, host="0.0.0.0", port=5000)
