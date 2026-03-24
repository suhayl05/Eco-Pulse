const API_URL = 'http://localhost:5000';
let userName = localStorage.getItem('ecoPulseName');
let isSimulation = false;
let checkCount = parseInt(localStorage.getItem('ecoPulseChecks') || '0');
let perfectCount = parseInt(localStorage.getItem('ecoPulsePerfects') || '0');
let sensorChart = null;

const ACHIEVEMENTS = [
    { id: 'first_steps', icon: '🌱', title: 'First Steps', desc: '5 Checks Done', goal: 5, type: 'checks' },
    { id: 'dedicated', icon: '🔥', title: 'Dedicated', desc: '15 Checks Done', goal: 15, type: 'checks' },
    { id: 'plant_lover', icon: '💚', title: 'Plant Lover', desc: '30 Checks Done', goal: 30, type: 'checks' },
    { id: 'perfect_care', icon: '⭐', title: 'Perfect Care', desc: '5 Perfects', goal: 5, type: 'perfects' },
    { id: 'water_master', icon: '⛲', title: 'Water Master', desc: '15 Perfects', goal: 15, type: 'perfects' },
    { id: 'botanist', icon: '🧬', title: 'Botanist', desc: '30 Perfects', goal: 30, type: 'perfects' },
    { id: 'plant_parent', icon: '🧑‍🌾', title: 'Plant Parent', desc: '200 Points', goal: 200, type: 'points' },
    { id: 'expert', icon: '🎓', title: 'Eco Expert', desc: '500 Points', goal: 500, type: 'points' },
    { id: 'legend', icon: '👑', title: 'Eco Legend', desc: '1000 Points', goal: 1000, type: 'points' },
    { id: 'night_owl', icon: '🦉', title: 'Night Owl', desc: 'Check after 8 PM', goal: 1, type: 'time_check' }
];

document.addEventListener('DOMContentLoaded', () => {
    if (!userName) {
        showOnboarding();
    } else {
        initApp();
    }

    // Nav Listeners
    document.getElementById('sim-mode').addEventListener('change', (e) => {
        isSimulation = e.target.checked;
        document.getElementById('ai-tip').textContent = isSimulation ? "Simulation Mode Active. 🧪" : "Real-time Monitoring Active. 📡";
    });

    document.getElementById('change-plant-btn').addEventListener('click', () => {
        const name = prompt("Enter your plant's name:");
        if (name) {
            document.getElementById('current-plant-name').textContent = name;
            localStorage.setItem('ecoPulsePlant', name);
        }
    });

    // Action Buttons
    document.getElementById('analyze-btn').addEventListener('click', analyzePlant);
    document.getElementById('add-player-btn').addEventListener('click', () => document.getElementById('add-modal').style.display = 'flex');
    document.getElementById('cancel-add').addEventListener('click', () => document.getElementById('add-modal').style.display = 'none');
    document.getElementById('confirm-add').addEventListener('click', addPlayer);
    document.getElementById('reset-btn').addEventListener('click', resetAll);

    // Camera/Vision
    document.getElementById('open-camera').addEventListener('click', openCamera);
    document.getElementById('take-photo').addEventListener('click', takePhoto);
    document.getElementById('upload-btn').addEventListener('click', () => document.getElementById('photo-upload').click());
    document.getElementById('photo-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageInput(file);
    });

    // Start Real-time Polling (2 seconds as requested)
    setInterval(updateSensors, 2000);
});

function showOnboarding() {
    const name = prompt("Welcome to Eco Pulse! What is your name?");
    if (name) {
        userName = name.trim();
        localStorage.setItem('ecoPulseName', userName);
        initApp();
    }
}

function initApp() {
    document.getElementById('display-name').textContent = userName;
    const savedPlant = localStorage.getItem('ecoPulsePlant');
    if (savedPlant) document.getElementById('current-plant-name').textContent = savedPlant;

    initSensorChart();
    updateLeaderboard();
    renderAchievements();
}

// --- MULTI-SENSOR CHART ---
function initSensorChart() {
    const ctx = document.getElementById('health-trend-chart').getContext('2d');
    sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Temp', borderColor: '#f44336', data: [], tension: 0.3, fill: false },
                { label: 'Hum', borderColor: '#2196F3', data: [], tension: 0.3, fill: false },
                { label: 'Soil', borderColor: '#4CAF50', data: [], tension: 0.3, fill: false },
                { label: 'Light', borderColor: '#FFC107', data: [], tension: 0.3, fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 100, ticks: { font: { size: 10 } } },
                x: { display: false }
            },
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } }
            }
        }
    });
}

async function updateSensors() {
    let data;
    if (isSimulation) {
        data = {
            temperature: (20 + Math.random() * 8).toFixed(1),
            humidity: (40 + Math.random() * 30).toFixed(1),
            soil_percent: Math.floor(50 + Math.random() * 40),
            light: Math.floor(30 + Math.random() * 60)
        };
    } else {
        try {
            const res = await fetch(`${API_URL}/sensor-data`);
            data = await res.json();
            console.log("Real-time Sensor Data:", data);
        } catch (e) {
            console.warn("Hardware fetch failed, using internal mock.");
            return;
        }
    }

    // Update UI Labels
    document.getElementById('temp-val').textContent = `${data.temperature}°C`;
    document.getElementById('hum-val').textContent = `${data.humidity}%`;
    document.getElementById('soil-val').textContent = `${data.soil_percent}%`;
    document.getElementById('light-val').textContent = `${data.light}%`;

    // Push to Chart
    if (sensorChart) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        sensorChart.data.labels.push(time);
        sensorChart.data.datasets[0].data.push(parseFloat(data.temperature));
        sensorChart.data.datasets[1].data.push(parseFloat(data.humidity));
        sensorChart.data.datasets[2].data.push(parseInt(data.soil_percent));
        sensorChart.data.datasets[3].data.push(parseInt(data.light));

        if (sensorChart.data.labels.length > 20) {
            sensorChart.data.labels.shift();
            sensorChart.data.datasets.forEach(d => d.data.shift());
        }
        sensorChart.update('none'); // Update without animation for 2s polling
    }
}

async function analyzePlant() {
    const btn = document.getElementById('analyze-btn');
    btn.disabled = true;
    btn.textContent = "Syncing Hardware...";

    let sensorPayload;
    if (isSimulation) {
        sensorPayload = { temperature: parseFloat(document.getElementById('temp-val').dataset.val || 25), humidity: 60, soil: 500, light: 1 };
    } else {
        try {
            const res = await fetch(`${API_URL}/sensor-data`);
            sensorPayload = await res.json();
        } catch (e) {
            alert("Check WiFi / ESP32 Status.");
            btn.disabled = false;
            btn.textContent = "✨ Analyze Plant Health";
            return;
        }
    }

    try {
        const res = await fetch(`${API_URL}/analyze-health?user_name=${userName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sensorPayload)
        });
        const result = await res.json();
        applyAnalysisResult(result);
        checkAchievements();
    } catch (e) {
        console.error("Analysis error", e);
    }

    btn.disabled = false;
    btn.textContent = "✨ Analyze Plant Health";
}

function applyAnalysisResult(data) {
    const circle = document.getElementById('health-gauge-circle');
    const offset = 283 - (283 * data.score) / 100;
    circle.style.strokeDashoffset = offset;

    let color = "#4CAF50";
    if (data.score < 45) color = "#f44336";
    else if (data.score < 75) color = "#FFC107";

    circle.style.stroke = color;
    document.getElementById('health-score').textContent = data.score;

    const badge = document.getElementById('status-badge');
    badge.textContent = data.status;
    badge.style.background = color;

    const log = document.getElementById('activity-log');
    if (log.querySelector('.empty')) log.innerHTML = '';

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.style.borderLeftColor = color;
    entry.innerHTML = `
        <span class="log-time">${timeStr} - ${data.status}</span>
        <span class="log-points">${data.points >= 0 ? '+' : ''}${data.points} pts</span>
    `;
    log.prepend(entry);

    document.getElementById('points-delta').textContent = `${data.points >= 0 ? '+' : ''}${data.points}`;
    document.getElementById('points-delta').style.color = data.points >= 0 ? "#4CAF50" : "#f44336";

    checkCount++;
    localStorage.setItem('ecoPulseChecks', checkCount);
    if (data.status === 'Perfect') {
        perfectCount++;
        localStorage.setItem('ecoPulsePerfects', perfectCount);
    }

    updateLeaderboard();
}

// --- SOCIAL ---
async function updateLeaderboard() {
    const res = await fetch(`${API_URL}/leaderboard`);
    const players = await res.json();
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    players.forEach((p, idx) => {
        if (p.name === userName) {
            document.getElementById('user-points').textContent = p.points;
            document.getElementById('display-level').textContent = p.level;
            updateProgressBar(p.points);
        }

        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `
            <span>#${idx + 1} <strong>${p.name}</strong></span>
            <span>${p.points} pts <button onclick="removePlayer(${p.id})" class="mini-btn">×</button></span>
        `;
        list.appendChild(row);
    });
}

function updateProgressBar(points) {
    const levelStep = 200;
    const progress = (points % levelStep) / levelStep * 100;
    document.getElementById('level-progress').style.width = `${progress}%`;

    const levels = ["Seedling", "Sprout", "Sapling", "Mature", "Expert", "Master", "Legend"];
    const currentIdx = Math.floor(points / levelStep);
    document.getElementById('prev-level').textContent = levels[currentIdx] || "Seedling";
    document.getElementById('next-level').textContent = levels[currentIdx + 1] || "Legend";
}

async function addPlayer() {
    const name = document.getElementById('new-player-name').value;
    if (!name) return;

    await fetch(`${API_URL}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'Guest', points: 0, level: 'Seedling' })
    });

    document.getElementById('new-player-name').value = '';
    document.getElementById('add-modal').style.display = 'none';
    updateLeaderboard();
}

async function removePlayer(id) {
    if (confirm("Remove player?")) {
        await fetch(`${API_URL}/players/${id}`, { method: 'DELETE' });
        updateLeaderboard();
    }
}

async function resetAll() {
    if (confirm("Reset Board? All points will be cleared.")) {
        await fetch(`${API_URL}/reset-leaderboard`, { method: 'POST' });
        updateLeaderboard();
    }
}

function renderAchievements() {
    const list = document.getElementById('achievements-list');
    list.innerHTML = '';
    const unlocked = JSON.parse(localStorage.getItem('unlockedAchievements') || '[]');

    ACHIEVEMENTS.forEach(a => {
        const isUnlocked = unlocked.includes(a.id);
        const el = document.createElement('div');
        el.className = `achievement-item ${isUnlocked ? '' : 'locked'}`;
        el.innerHTML = `<span>${a.icon}</span><strong>${a.title}</strong>`;
        list.appendChild(el);
    });
}

function checkAchievements() {
    const unlocked = JSON.parse(localStorage.getItem('unlockedAchievements') || '[]');
    const points = parseInt(document.getElementById('user-points').textContent);
    let newUnlocked = false;

    const hour = new Date().getHours();

    ACHIEVEMENTS.forEach(a => {
        if (unlocked.includes(a.id)) return;
        let val = 0;
        if (a.type === 'checks') val = checkCount;
        if (a.type === 'perfects') val = perfectCount;
        if (a.type === 'points') val = points;
        if (a.type === 'time_check' && hour >= 20) val = 1;

        if (val >= a.goal) {
            unlocked.push(a.id);
            newUnlocked = true;
            alert(`🏆 Achievement Unlocked: ${a.title}!`);
        }
    });

    if (newUnlocked) {
        localStorage.setItem('unlockedAchievements', JSON.stringify(unlocked));
        renderAchievements();
    }
}

// --- VISION ---
let stream;
async function openCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('camera-feed');
        video.srcObject = stream;
        video.classList.remove('hidden');
        document.getElementById('camera-placeholder').classList.add('hidden');
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('take-photo').disabled = false;
    } catch (e) {
        alert("Camera required for vision AI.");
    }
}

async function takePhoto() {
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('camera-canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => handleImageInput(new File([blob], "leaf.jpg", { type: "image/jpeg" })));
}

function handleImageInput(file) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
    preview.style.display = 'block';

    document.getElementById('camera-feed').classList.add('hidden');
    document.getElementById('camera-placeholder').classList.add('hidden');

    analyzeVision(file);
}

async function analyzeVision(file) {
    const box = document.getElementById('vision-result');
    box.textContent = "AI Vision scanning...";
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${API_URL}/ai-vision`, { method: 'POST', body: formData });
        const data = await res.json();
        box.textContent = data.analysis;
        document.getElementById('ai-tip').textContent = data.analysis;
    } catch (e) {
        box.textContent = "Vision AI offline.";
    }
}

window.showTab = function (tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}
