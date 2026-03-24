window.onerror=(m,u,l)=>{diag('[CRASH]'+m+'@'+l);return false;};

const ACHS=[
  // Points (Expanded)
  {id:'p1',icon:'🌱',name:'Seedling',   desc:'50 pts',     type:'pts',   goal:50},
  {id:'p2',icon:'🌿',name:'Sprout',     desc:'150 pts',    type:'pts',   goal:150},
  {id:'p3',icon:'🌳',name:'Oak',        desc:'400 pts',    type:'pts',   goal:400},
  {id:'p4',icon:'👑',name:'Master',     desc:'1000 pts',   type:'pts',   goal:1000},
  {id:'p5',icon:'🧪',name:'Scientist',  desc:'2000 pts',   type:'pts',   goal:2000},
  {id:'p6',icon:'🏆',name:'Legend',     desc:'5000 pts',   type:'pts',   goal:5000},

  // Activity (Expanded)
  {id:'a1',icon:'💧',name:'First Drop', desc:'1 analysis',  type:'checks',goal:1},
  {id:'a2',icon:'🔥',name:'Hot Streak', desc:'5 analyses',  type:'checks',goal:5},
  {id:'a3',icon:'🌊',name:'Consistent', desc:'15 analyses', type:'checks',goal:15},
  {id:'a4',icon:'⚡',name:'Active',      desc:'50 analyses', type:'checks',goal:50},
  {id:'a5',icon:'☄️',name:'Dedicated',  desc:'100 analyses',type:'checks',goal:100},
  {id:'a6',icon:'🛰️',name:'Overseer',   desc:'250 analyses',type:'checks',goal:250},

  // Skills (Expanded - 33 Skill Achievements)
  {id:'s1',icon:'💎',name:'Centurion',  desc:'100% Score',  type:'perfect100',goal:1},
  {id:'s2',icon:'🏅',name:'Tri-Perfect',desc:'3 Consecutive',type:'pStreak',   goal:3},
  {id:'s3',icon:'🎯',name:'Penta-Perfect',desc:'5 Consecutive',type:'pStreak',   goal:5},
  {id:'s4',icon:'🏵️',name:'Deca-Perfect',desc:'10 Consecutive',type:'pStreak',  goal:10},
  {id:'s5',icon:'🔮',name:'Clairvoyant',desc:'20 Consecutive',type:'pStreak',  goal:20},
  {id:'s6',icon:'📿',name:'Monk-like',  desc:'30 Consecutive',type:'pStreak',  goal:30},
  {id:'s7',icon:'🧿',name:'Savant',     desc:'40 Consecutive',type:'pStreak',  goal:40},
  {id:'s8',icon:'🎭',name:'Performer',  desc:'50 Consecutive',type:'pStreak',  goal:50},
  {id:'s9',icon:'🏰',name:'Fortress',   desc:'Maintain Perfect',type:'pStreak',goal:100},
  ...Array.from({length:4}, (_,i)=>({
    id:`sk${i}`, icon:'🎖️', name:`Tier ${i+1} Skill`, desc:`Earned through expert care`, type:'pts', goal: 3000 + (i*500)
  })),

  // Time
  {id:'t1',icon:'🌙',name:'Night Owl',  desc:'Analyze > 9 PM', type:'night',   goal:1},
  {id:'t2',icon:'🌞',name:'Early Bird', desc:'Analyze < 7 AM', type:'morning', goal:1},
  {id:'t3',icon:'🌓',name:'Equinox',    desc:'Dawn/Dusk Care',type:'pts',    goal:1}, // Placeholder logic

  // Hard
  {id:'h1',icon:'🏔️',name:'Highland',   desc:'Perfect in Cold', type:'pts',    goal:1},
  {id:'h2',icon:'🌵',name:'Desert',     desc:'Perfect in Heat', type:'pts',    goal:1},
  {id:'h3',icon:'🌈',name:'Spectrum',   desc:'Analyze in Light',type:'pts',    goal:1},
  {id:'h4',icon:'🌑',name:'Void',       desc:'Analyze in Dark', type:'pts',    goal:1},
];

let userName='',isSim=false,chart,camStream=null;
let checks=+localStorage.getItem('ep_checks')||0;
let pStreak=+localStorage.getItem('ep_pst')||0;
let p100=+localStorage.getItem('ep_p100')||0;

const $=id=>document.getElementById(id);
const setText=(id,v)=>{const e=$(id);if(e)e.innerText=v;};
function diag(m){const l=$('diag-log');if(l)l.innerText='['+new Date().toLocaleTimeString()+'] '+m+'\n'+l.innerText.slice(0,600);}

// Gauge
function setGauge(score){
  const fill=$('v-fill');
  if(fill){
    fill.style.strokeDashoffset=283-(283*score/100);
    // User colors: Good #c8ed61, Optimal #9df78b, Perfect #3bd44b
    const c=score>=90?'#3bd44b':score>=76?'#9df78b':score>=56?'#c8ed61':score>=40?'#ff9f0a':'#ff3b30';
    fill.style.stroke=c;
    const badge=$('st-badge');
    if(badge){
      badge.innerText=score>=90?'PERFECT':score>=76?'HEALTHY':score>=56?'DOING WELL':score>=40?'I\'M OKAY':'STRUGGLING';
      badge.style.background=c;badge.style.boxShadow=`0 4px 16px ${c}55`;
    }
  }
  setText('v-score',score);
}
function calcHealth(d){
  let s_sc=0, t_sc=0, h_sc=0, l_sc=0;
  const soil=d.soil_percent||0, temp=+d.temperature||25, hum=d.humidity||60;
  
  if(40<=soil&&soil<=80) s_sc=25; else if(20<=soil&&soil<40||80<soil&&soil<=95) s_sc=17; else s_sc=8;
  if(20<=temp&&temp<=45) t_sc=25; else if(10<=temp&&temp<20||45<temp&&temp<=55) t_sc=17; else t_sc=8;
  // Refined Humidity scoring (User: 5-10% for off-range)
  if(40<=hum&&hum<=80) h_sc=25; else if(30<=hum<40||80<hum<=90) h_sc=10; else h_sc=5;
  l_sc = (d.light_status==='Bright')?25:10;
  
  return Math.round(s_sc + t_sc + h_sc + l_sc);
}

// Chart
function initChart(){
  const c=$('mainChart');if(!c)return;
  chart=new Chart(c.getContext('2d'),{type:'line',
    data:{labels:[],datasets:[
      {label:'Soil %',  borderColor:'#34c759',backgroundColor:'rgba(52,199,89,.1)',data:[],tension:.4,fill:true,pointRadius:0},
      {label:'Temp °C', borderColor:'#ff3b30',data:[],tension:.4,fill:false,pointRadius:0},
      {label:'Humidity',borderColor:'#007aff',data:[],tension:.4,fill:false,pointRadius:0},
    ]},
    options:{responsive:true,maintainAspectRatio:false,animation:false,
      plugins:{legend:{position:'top',labels:{boxWidth:10,font:{size:10},color:'#1a1a1a',padding:6}}},
      scales:{x:{display:false},y:{min:0,max:100,ticks:{font:{size:10},color:'#333'},grid:{color:'rgba(0,0,0,.05)'}}}
    }});
}
function pushChart(d){
  if(!chart)return;
  chart.data.labels.push(new Date().toLocaleTimeString());
  chart.data.datasets[0].data.push(Math.round(d.soil_percent||0));
  chart.data.datasets[1].data.push(parseFloat(d.temperature||0));
  chart.data.datasets[2].data.push(Math.round(d.humidity||0));
  if(chart.data.labels.length>30){chart.data.labels.shift();chart.data.datasets.forEach(ds=>ds.data.shift());}
  chart.update('none');
}

// Poll
async function poll(){
  try{
    let d;
    if(isSim){
      // Max Randomness: Extreme Ranges 0-100
      d={
        temperature: parseFloat((Math.random()*60).toFixed(1)), // 0 to 60C
        humidity: Math.round(Math.random()*100), // 0 to 100%
        soil_percent: Math.round(Math.random()*100), // 0 to 100%
        light_status: Math.random() > 0.5 ? 'Bright' : 'Dark'
      };
      diag('SIM T='+d.temperature+' H='+d.humidity+' S='+d.soil_percent+'%');
    }else{
      const r=await fetch('/sensor-data');d=await r.json();
      if(d.sim_fallback){diag('HW: ESP32 offline');return;}
      diag('HW T='+d.temperature+' H='+d.humidity+' S='+d.soil_percent+'%');
    }
    setText('s-t',parseFloat(d.temperature||0).toFixed(1));
    setText('s-h',Math.round(d.humidity||0)+'%');
    setText('s-s',Math.round(d.soil_percent||0)+'%');
    setText('s-l',d.light_status||'--');
    setGauge(calcHealth(d));pushChart(d);
  }catch(e){diag('Poll: '+e.message);}
}

// XP Bar
function updateXP(pts){
  const levels = [0, 150, 300, 600, 1000, 2000, 5000];
  let cl=0, nx=150;
  for(let i=0; i<levels.length; i++){
    if(pts >= levels[i]){ cl=levels[i]; nx=levels[i+1]||99999; }
    else break;
  }
  const pct = Math.min(100, ((pts - cl) / (nx - cl)) * 100);
  const bar = $('xp-fill'); if(bar) bar.style.width = pct+'%';
}

// Session (Enhanced)
async function syncSession(){
  try{
    const r=await fetch('/api/current?user_id='+userName);
    const u=await r.json();
    setText('p-total',u.points);setText('lv-badge',u.level);setText('streak-txt','🔥'+(u.streak||0));
    updateXP(u.points);
    checkAchs(u.points);renderAchs(u.points);
  }catch(e){}
  try{
    const pl=await (await fetch('/api/leaderboard')).json();
    const lp=$('pane-ranks');
    if(lp)lp.innerHTML=pl.length===0
      ?'<div class="empty-msg">No Players yet. Be the first!</div>'
      :pl.map((p,i)=>`<div class="row">
          <div><span class="row-text">#${i+1} <b>${p.name}</b></span><br><span class="row-sub">${p.level}</span></div>
          <div style="display:flex;align-items:center;gap:.5rem;">
            <b style="color:var(--pd);font-size:.9rem;">${p.points} pts</b>
            <button class="del-btn" onclick="delPlayer('${p.name}')">×</button>
          </div></div>`).join('');
  }catch(e){}
  try{
    const hist=await (await fetch('/api/history?user='+userName)).json();
    const hp=$('pane-history');
    if(hp)hp.innerHTML=hist.length===0
      ?'<div class="empty-msg">No checks yet — click Analyze!</div>'
      :hist.map(h=>{
          const c=h.status==='PERFECT'?'#34c759':h.status==='GOOD'?'#30d158':h.status==='FAIR'?'#ff9f0a':'#ff3b30';
          const pts=h.pts>=0?'+'+h.pts:h.pts;
          const ts=h.ts?h.ts.substring(11,16):'';
          return `<div class="row">
            <div style="display:flex;align-items:flex-start;gap:6px;">
              <span class="dot" style="background:${c};margin-top:3px;"></span>
              <div><span class="row-text">${h.feeling||h.status}</span><br><span class="row-sub">${h.score}% health · ${ts}</span></div>
            </div>
            <div style="text-align:right;"><b style="color:${c};font-size:.82rem;">${h.status}</b><br><span style="font-size:.72rem;font-weight:800;color:${+h.pts>=0?'#34c759':'#ff3b30'}">${pts} pts</span></div>
          </div>`;}).join('');
  }catch(e){diag('History: '+e.message);}
}

// Achievements
function checkAchs(pts){
  const unlocked=JSON.parse(localStorage.getItem('ep_ach')||'[]');
  const h=new Date().getHours();let changed=false;
  ACHS.forEach(a=>{
    if(unlocked.includes(a.id))return;
    let pass=false;
    if(a.type==='pts')         pass=pts>=a.goal;
    if(a.type==='checks')      pass=checks>=a.goal;
    if(a.type==='perfect100')  pass=p100>=a.goal;
    if(a.type==='pStreak')     pass=pStreak>=a.goal;
    if(a.type==='night')       pass=h>=21;
    if(a.type==='morning')     pass=h<7;
    if(pass){unlocked.push(a.id);changed=true;showAchPop(a);}
  });
  if(changed)localStorage.setItem('ep_ach',JSON.stringify(unlocked));
}
function renderAchs(pts){
  const unlocked=JSON.parse(localStorage.getItem('ep_ach')||'[]');
  const g=$('ach-grid');if(!g)return;
  g.innerHTML=ACHS.map(a=>{
    const w=unlocked.includes(a.id);
    return `<div class="ach ${w?'won':''}" ${w?`onclick="fireConf('${a.icon}')"`:''}>
      <span class="ach-icon">${a.icon}</span>
      <div class="ach-name">${a.name}</div>
      <div class="ach-req">${a.desc}</div></div>`;}).join('');
}
function showAchPop(a){
  const p=$('ach-pop');if(!p)return;
  setText('pop-icon',a.icon);setText('pop-title',a.name+' Unlocked!');setText('pop-desc',a.desc);
  p.classList.add('show');
  if(typeof confetti==='function')confetti({particleCount:80,spread:70,origin:{y:.6}});
  setTimeout(()=>p.classList.remove('show'),4200);
}
window.fireConf=(i)=>{if(typeof confetti==='function')confetti({particleCount:90,spread:75,origin:{y:.6}});};
window.delPlayer=async(n)=>{if(!confirm('Remove '+n+'?'))return;await fetch('/players/'+n,{method:'DELETE'});syncSession();};

// Weekly Report Logic
let weeklyChart;
async function loadWeeklyReport(){
  try{
    const r=await fetch('/api/weekly-report?user='+userName);
    const d=await r.json();
    setText('st-best', d.best_day);
    const tr=$('st-trend');
    if(tr){
      tr.innerText=(d.trend>=0?'+':'')+d.trend+'%';
      tr.className='stat-val '+(d.trend>=0?'trend-up':'trend-down');
    }
    setText('st-challenge', d.challenge);
    setText('st-ml-forecast', d.ml_forecast);
    setText('st-summary', d.summary);

    const canvas=$('weeklyChart');if(!canvas)return;
    const ctx=canvas.getContext('2d');
    if(weeklyChart) weeklyChart.destroy();
    weeklyChart=new Chart(ctx,{type:'line',
      data:{
        labels:d.labels,
        datasets:[
          {label:'This Week', borderColor:'#34c759', backgroundColor:'rgba(52,199,89,.1)', data:d.current_week, tension:.4, fill:true},
          {label:'Last Week', borderColor:'rgba(0,0,0,.1)', data:d.previous_week, tension:.4, borderDash:[5,5]}
        ]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{y:{min:0,max:100,grid:{color:'rgba(0,0,0,.05)'}}}
      }
    });
  }catch(e){diag('Weekly: '+e.message);}
}

// INIT
async function init(){
  // Chart
  try{initChart();}catch(e){diag('Chart: '+e.message);}
  // Tabs
  document.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click',function(){
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
      this.classList.add('on');
      ['ranks','history','achievements','status'].forEach(p=>{const e=$('pane-'+p);if(e)e.classList.add('hidden');});
      const tgt=$('pane-'+this.dataset.pane);if(tgt)tgt.classList.remove('hidden');
      if(this.dataset.pane==='history')syncSession();
      if(this.dataset.pane==='status')loadWeeklyReport();
    });
  });
  // Sim
  const simb=$('sim-btn');if(simb)simb.addEventListener('click',function(){
    isSim=!isSim;this.classList.toggle('on',isSim);this.innerText=isSim?'🧪 SIM ON':'🧪 SIMULATION';diag(isSim?'SIM ON':'HW MODE');poll();
  });
  // Diag
  const diagb=$('diag-btn');if(diagb)diagb.addEventListener('click',()=>{const e=$('diag-ov');if(e)e.classList.toggle('hidden');});
  // Analyze
  const ab=$('analyze-btn');if(ab)ab.addEventListener('click',async function(){
    this.disabled=true;this.innerText='SYNCING...';
    try{
      const sd={
        temperature:parseFloat($('s-t')?.innerText||'25'),
        soil_percent:parseInt($('s-s')?.innerText||'50'),
        humidity:parseInt($('s-h')?.innerText||'60'),
        light_status:$('s-l')?.innerText||'Bright'
      };
      const r=await fetch('/analyze-health?user_name='+userName,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sd)});
      const res=await r.json();
      setGauge(res.score);setText('feeling-txt','"'+res.feeling+'"');
      setText('st-ml-forecast', res.ml_advice);
      if(res.deep_insights){
        setText('bio-ls', res.deep_insights.lifespan);
        setText('bio-st', res.deep_insights.stability + '%');
        setText('eco-alerts', res.deep_insights.alerts.join(', '));
      }
      checks++;localStorage.setItem('ep_checks',checks);
      if(res.status==='PERFECT'){
        pStreak++;
        if(res.score===100)p100++;
        localStorage.setItem('ep_pst',pStreak);localStorage.setItem('ep_p100',p100);
      }else{pStreak=0;localStorage.setItem('ep_pst','0');}
      diag('→ '+res.status+' score='+res.score+' pts='+res.points);
      await syncSession();
    }catch(e){diag('Analyze: '+e.message);}
    this.disabled=false;this.innerText='⚡ ANALYZE PLANT';
  });
  // Camera
  const camb=$('cam-btn');if(camb)camb.addEventListener('click',async()=>{
    try{
      diag('Requesting camera...');
      const v=$('camera-video');
      if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
        throw new Error('Camera API not available. Use HTTPS or localhost.');
      }
      camStream=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}
      });
      if(v){
        v.srcObject=camStream;v.classList.remove('hidden');
        v.onloadedmetadata = () => v.play();
      }
      $('image-pre')?.classList.add('hidden');$('cam-msg')?.classList.add('hidden');
      $('snap-btn')?.classList.remove('hidden');diag('Camera active');
      // Auto-close after 30s
      setTimeout(() => { if(camStream) stopCam(); }, 30000);
    }catch(e){diag('Cam Error: '+e.message);alert('Camera Error: '+e.message + '\n\nNote: Camera requires HTTPS or a secure tunnel.');}
  });
  const stopCam=()=>{
    if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;}
    const v=$('camera-video');if(v){v.srcObject=null;v.classList.add('hidden');}
    $('snap-btn')?.classList.add('hidden');
    const hasImg = !$('image-pre').classList.contains('hidden');
    if(!hasImg) $('cam-msg')?.classList.remove('hidden');
  };
  // Upload
  const ub=$('up-btn'),ui=$('up-input');
  if(ub&&ui){
    ub.addEventListener('click',()=>ui.click());
    ui.addEventListener('change',e=>{
      const f=e.target.files[0];if(!f)return;
      const rd=new FileReader();
      rd.onload=re=>{
        const im=$('image-pre');if(im){im.src=re.target.result;im.classList.remove('hidden');}
        const v=$('camera-video');if(v)v.classList.add('hidden');
        const cm=$('cam-msg');if(cm)cm.classList.add('hidden');
        const sb=$('snap-btn');if(sb)sb.classList.remove('hidden');
      };rd.readAsDataURL(f);
    });
  }
  // Snap
  const sb=$('snap-btn');if(sb)sb.addEventListener('click',async()=>{
    const resp=$('ai-resp');if(resp)resp.innerText='🧠 AI identifying your plant...';sb.disabled=true;
    try{
      const vid=$('camera-video'),img=$('image-pre');let blob;
      if(vid&&!vid.classList.contains('hidden')){
        const cv=document.createElement('canvas');cv.width=vid.videoWidth;cv.height=vid.videoHeight;
        cv.getContext('2d').drawImage(vid,0,0);
        blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.92));
        // Show preview immediately
        if(img){ img.src=URL.createObjectURL(blob);img.classList.remove('hidden'); }
        stopCam(); // Now safe to close stream
      }else if(img&&!img.classList.contains('hidden')){
        blob=await(await fetch(img.src)).blob();
      }
      if(!blob)throw new Error('No image');
      const fd=new FormData();fd.append('file',blob,'plant.jpg');
      const r=await (await fetch('/ai-vision',{method:'POST',body:fd})).json();
      if(resp)resp.innerText=r.analysis;
    }catch(e){if(resp)resp.innerText='Error: '+e.message;}
    sb.disabled=false;
  });
  // Chat Logic
  const aib=$('ai-bubble'),cw=$('chat-win'),cc=$('close-chat'),cs=$('chat-send'),ci=$('chat-in'),chatb=$('chat-body');
  let chatHist = [];
  if(aib) aib.onclick=()=>cw.classList.toggle('hidden');
  if(cc) cc.onclick=()=>cw.classList.add('hidden');
  const addMsg=(m,c)=>{const e=document.createElement('div');e.className='msg '+c;e.innerText=m;chatb.appendChild(e);chatb.scrollTop=chatb.scrollHeight;};
  const sendChat=async()=>{
    const m=ci.value.trim();if(!m)return;ci.value='';addMsg(m,'user');chatHist.push({role:'user',content:m});
    try{
      const r=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m,history:chatHist.slice(-4)})});
      const d=await r.json();addMsg(d.reply,'bot');chatHist.push({role:'assistant',content:d.reply});
    }catch(e){addMsg('Error: '+e.message,'bot');}
  };
  if(cs) cs.onclick=sendChat;if(ci) ci.onkeydown=e=>{if(e.key==='Enter')sendChat();};

  // PWA Automatic Prompt
  let deferredPrompt; const mib=$('manual-install');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    diag('PWA Ready to Install');
    if(mib) mib.classList.remove('hidden');
  });
  if(mib) mib.onclick=async()=>{
    if(deferredPrompt){
      deferredPrompt.prompt();
      const {outcome}=await deferredPrompt.userChoice;
      diag('PWA Choice: '+outcome);
      deferredPrompt=null;mib.classList.add('hidden');
    }
  };
  // Trigger on first interaction to avoid "must be user-triggered" block
  window.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      diag('PWA Choice: ' + outcome);
      deferredPrompt = null;
      if(mib) mib.classList.add('hidden');
    }
  }, { once: true });

  poll();setInterval(poll,2000);syncSession();setInterval(syncSession,5000);
  
  // Register PWA Service Worker
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
}

// SPLASH
const splashBtn=$('splash-btn'),splashInput=$('splash-input'),splashEl=$('splash');
if(splashBtn&&splashInput){
  const existUser=localStorage.getItem('ep_user')||'';
  if(existUser){
    userName=existUser;splashEl.style.display='none';
    const nt=$('name-txt');if(nt)nt.innerText=userName;
    fetch('/players',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:userName})}).catch(()=>{});
    init();
  }else{
    splashInput.addEventListener('keydown',e=>{if(e.key==='Enter')splashBtn.click();});
    splashBtn.addEventListener('click',()=>{
      const n=(splashInput.value||'').trim();
      if(!n){splashInput.style.borderColor='#ff3b30';splashInput.focus();return;}
      userName=n;localStorage.setItem('ep_user',n);
      fetch('/players',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n})}).catch(()=>{});
      splashEl.style.opacity='0';splashEl.style.transform='scale(1.1)';
      splashEl.style.transition='all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      setTimeout(()=>{splashEl.style.display='none';},600);
      setText('name-txt',userName);
      init();
    });
  }
}
