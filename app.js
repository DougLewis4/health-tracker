import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// ── Firebase ─────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAPqZIbL4KQVmv_C1NqZ2-B3RmzS4mCj6g",
  authDomain: "fitness-tracker-11a95.firebaseapp.com",
  projectId: "fitness-tracker-11a95",
  storageBucket: "fitness-tracker-11a95.firebasestorage.app",
  messagingSenderId: "561252185881",
  appId: "1:561252185881:web:edb9d343ebeb324077f788"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ── Whoop Config ──────────────────────────────────────────────
const WHOOP_CLIENT_ID  = 'd5efd9e1-e119-4838-820b-d599b4b0e9ba';
const WHOOP_WORKER_URL = 'https://whoop-auth.dougalewis.workers.dev/';
const WHOOP_REDIRECT   = 'https://douglewis4.github.io/health-tracker/';
const WHOOP_AUTH_URL   = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_API_BASE   = 'https://api.prod.whoop.com/developer';
const WHOOP_SCOPES     = 'read:recovery read:cycles read:sleep read:profile offline';

// ── Escape user-provided strings before inserting into HTML ───
function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Exercise Library ─────────────────────────────────────────
// All content below is hardcoded (not user-supplied), so esc() is not needed here.
// esc() is applied wherever user-entered data (exercise names, notes) enters HTML.
const EXERCISES = {
  "Legs": [
    { name: "Squat", weighted: true, cues: [
      "Bar rests on upper traps, feet shoulder-width apart",
      "Break at hips and knees simultaneously",
      "Knees track over toes, chest stays tall",
      "Drive through heels, squeeze glutes at the top"
    ]},
    { name: "Deadlift", weighted: true, cues: [
      "Bar over mid-foot, hip-width stance",
      "Hinge at hips first, then bend knees to grip",
      "Neutral spine — big breath and brace before pulling",
      "Drive the floor away, keep bar dragging up your shins",
      "Lock out hips fully at the top"
    ]},
    { name: "Lunge", weighted: true, cues: [
      "Step forward, lower back knee toward floor",
      "Front knee stays directly over front ankle",
      "Torso stays upright throughout",
      "Drive through front heel to return to start"
    ]},
    { name: "Leg Extension", weighted: true, cues: [
      "Adjust pad to sit on lower shins, not ankles",
      "Extend legs to fully straight — no swinging",
      "Pause briefly at the top, then control the descent",
      "Full range of motion every rep"
    ]},
    { name: "Hamstring Curls", weighted: true, cues: [
      "Lie face down, pad positioned on lower calves",
      "Curl heels toward glutes in a controlled arc",
      "Don't let your hips rise off the bench",
      "Lower slowly — the descent builds strength too"
    ]}
  ],
  "Chest": [
    { name: "Bench Press", weighted: true, cues: [
      "Grip just outside shoulder-width, retract shoulder blades",
      "Feet flat on floor, slight arch in lower back",
      "Lower bar to mid-chest with control",
      "Press up and slightly back toward the rack"
    ]},
    { name: "Machine Fly", weighted: true, cues: [
      "Slight bend in elbows throughout the movement",
      "Move from the shoulder, not the elbow",
      "Feel the chest stretch at the bottom",
      "Squeeze the chest at the top — don't crash the handles"
    ]},
    { name: "Barbell Incline Press", weighted: true, cues: [
      "Bench at 30-45 degrees, targets upper chest",
      "Same setup as flat bench: blades back and down",
      "Lower to upper chest, press straight up",
      "Don't let the bar drift forward"
    ]},
    { name: "Machine Bench Press", weighted: true, cues: [
      "Adjust seat so handles are at mid-chest height",
      "Press straight forward, full extension without locking out",
      "Control the return — don't let the stack crash",
      "Seat height is key — find what activates your chest"
    ]},
    { name: "Pushups", weighted: false, cues: [
      "Hands slightly wider than shoulder-width",
      "Body in a straight line from heels to head",
      "Lower chest to floor, elbows at 45 degrees from body",
      "Full extension at the top, don't lock out"
    ]}
  ],
  "Arms": [
    { name: "Preacher Curls", weighted: true, cues: [
      "Upper arms firmly against the pad — they stay there",
      "Full range of motion: full extension at bottom",
      "Don't swing or use shoulders to help at the top",
      "Control the descent — the lowering builds the bicep peak"
    ]},
    { name: "Hammer Curls", weighted: true, cues: [
      "Neutral grip: thumbs facing up, like holding a hammer",
      "Elbows pinned to your sides throughout",
      "Curl to shoulder height, pause at top",
      "Also works the brachialis and forearms"
    ]},
    { name: "Incline Dumbbell Curls", weighted: true, cues: [
      "Bench at around 60 degrees, arms hang behind the body",
      "Full stretch at the bottom — this is the whole point",
      "Curl slowly, don't swing to initiate",
      "Great for building the long head of the bicep"
    ]},
    { name: "Overhead Tricep Extensions", weighted: true, cues: [
      "Elbows stay close to your head — don't let them flare",
      "Extend at the elbow only, upper arms stay vertical",
      "Full range: all the way down, all the way up",
      "Works the long head of the tricep"
    ]},
    { name: "Cable Tricep Extensions", weighted: true, cues: [
      "Hinge forward slightly at the waist",
      "Elbows pinned to your sides, upper arms parallel to floor",
      "Press down and slightly forward to full extension",
      "Don't let elbows drift back on the return"
    ]}
  ],
  "Back": [
    { name: "Pull-Ups", weighted: false, cues: [
      "Overhand grip, hands just outside shoulder-width",
      "Dead hang at the bottom — full extension",
      "Pull elbows down toward your hips",
      "Chin clears the bar at the top"
    ]},
    { name: "Assisted Pull-Ups", weighted: true, cues: [
      "Higher weight setting = more assistance (easier)",
      "Same movement as unassisted: pull elbows to hips",
      "Use this to build strength — reduce assistance over time",
      "Don't rush — controlled reps build more strength"
    ]},
    { name: "Lat Pull-Down", weighted: true, cues: [
      "Lean back slightly, chest up",
      "Pull bar to upper chest, not behind neck",
      "Lead with your elbows, not your hands",
      "Control the ascent — don't let the bar yank you"
    ]},
    { name: "Bentover Barbell Row", weighted: true, cues: [
      "Hip-hinge position: back roughly parallel to floor",
      "Bar stays close to body throughout",
      "Pull to belly button, squeeze shoulder blades at the top",
      "Don't stand up — maintain the hinge angle the whole set"
    ]},
    { name: "Seated Row", weighted: true, cues: [
      "Sit tall, chest up, slight knee bend",
      "Pull handle to lower abdomen",
      "Squeeze shoulder blades together at full contraction",
      "Don't lean way back — stay upright"
    ]},
    { name: "Overhead Press", weighted: true, cues: [
      "Bar at collarbone, elbows slightly in front",
      "Press straight up, move head back to let bar pass",
      "Bring head through at the top, lock out fully",
      "Don't arch the lower back excessively"
    ]}
  ],
  "Abs": [
    { name: "Crunches", weighted: false, cues: [
      "Hands behind head or crossed on chest",
      "Lift shoulder blades off the floor — not your whole torso",
      "Don't pull on your neck with your hands",
      "Exhale as you crunch up"
    ]},
    { name: "Flutter Kicks", weighted: false, cues: [
      "Lie flat, hands under glutes for lower back support",
      "Keep lower back pressed into the floor",
      "Alternate small leg raises in a scissor motion",
      "Keep legs straight, core tight throughout"
    ]},
    { name: "Leg Raises", weighted: false, cues: [
      "Lie flat, hands under glutes or gripping a bench",
      "Raise legs to 90 degrees, keeping them straight",
      "Lower slowly — don't let lower back arch as legs descend",
      "The slow descent is where the real work happens"
    ]}
  ],
  "Shoulders": [
    { name: "Lateral Raise", weighted: true, cues: [
      "Slight bend in elbows, maintained throughout",
      "Raise to shoulder height — not higher",
      "Lead with your elbows, not your hands",
      "Don't shrug or use momentum"
    ]},
    { name: "Shoulder Press", weighted: true, cues: [
      "Dumbbells at ear height, elbows at 90 degrees",
      "Press overhead without fully locking out",
      "Don't arch lower back — brace your core",
      "Control the descent back to starting position"
    ]},
    { name: "Barbell Upright Row", weighted: true, cues: [
      "Grip shoulder-width or slightly narrower",
      "Pull bar to chin height, leading with elbows",
      "Elbows always higher than the bar",
      "Keep bar close to body throughout"
    ]},
    { name: "Shrugs", weighted: true, cues: [
      "Hold dumbbells or barbell at your sides",
      "Shrug straight up — don't roll your shoulders",
      "Hold at the top for 1-2 seconds",
      "Lower slowly and fully before the next rep"
    ]}
  ]
};

// ── State ────────────────────────────────────────────────────
let allWorkouts = [];
let allBodyweights = [];
let progressChart = null;
let weightChart = null;
let activeLogGroup = "Legs";
let activeLibGroup = "Legs";
let whoopData = null;

let logState = {
  date: todayStr(),
  exercises: {},
  cardio: "",
  notes: ""
};

// ── Utilities ────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysAgo(dateStr) {
  const diffMs = new Date(todayStr()) - new Date(dateStr + "T12:00:00");
  const diff = Math.round(diffMs / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return diff + " days ago";
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function safeId(str) {
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}

function maxW(ex) {
  if (!ex.sets || !ex.sets.length) return 0;
  return Math.max(...ex.sets.map(s => parseFloat(s.weight) || 0));
}

// ── Firestore ────────────────────────────────────────────────
async function loadWorkouts() {
  const q = query(collection(db, "workouts"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  allWorkouts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function saveWorkoutDoc(data) {
  const ref = await addDoc(collection(db, "workouts"), {
    ...data,
    savedAt: serverTimestamp()
  });
  allWorkouts.unshift({ id: ref.id, ...data });
}

async function loadBodyweights() {
  const q = query(collection(db, "bodyweight"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  allBodyweights = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function saveBodyweightDoc(date, weight) {
  const ref = await addDoc(collection(db, "bodyweight"), {
    date,
    weight: parseFloat(weight),
    savedAt: serverTimestamp()
  });
  allBodyweights.unshift({ id: ref.id, date, weight: parseFloat(weight) });
}

// ── Whoop Auth & Data ────────────────────────────────────────
window._connectWhoop = function() {
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('whoop_state', state);
  const params = new URLSearchParams({
    client_id: WHOOP_CLIENT_ID, redirect_uri: WHOOP_REDIRECT,
    response_type: 'code', scope: WHOOP_SCOPES, state
  });
  window.location.href = WHOOP_AUTH_URL + '?' + params.toString();
};

window._disconnectWhoop = function() {
  ['whoop_access_token','whoop_refresh_token','whoop_token_expires','whoop_state']
    .forEach(k => localStorage.removeItem(k));
  whoopData = null;
  renderDashboard();
};

async function exchangeWhoopCode(code) {
  const res = await fetch(WHOOP_WORKER_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, grant_type: 'authorization_code' })
  });
  return res.json();
}

function storeWhoopTokens(tokens) {
  localStorage.setItem('whoop_access_token', tokens.access_token);
  if (tokens.refresh_token) localStorage.setItem('whoop_refresh_token', tokens.refresh_token);
  localStorage.setItem('whoop_token_expires', Date.now() + (tokens.expires_in * 1000));
}

async function getWhoopToken() {
  const token   = localStorage.getItem('whoop_access_token');
  const expires = parseInt(localStorage.getItem('whoop_token_expires') || '0');
  if (!token) return null;
  if (Date.now() > expires - 300000) {
    const rt = localStorage.getItem('whoop_refresh_token');
    if (!rt) return token;
    try {
      const res = await fetch(WHOOP_WORKER_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt, grant_type: 'refresh_token' })
      });
      const tokens = await res.json();
      if (tokens?.access_token) { storeWhoopTokens(tokens); return tokens.access_token; }
    } catch(e) { /* use existing token */ }
  }
  return token;
}

async function whoopApi(path, token) {
  const res = await fetch(WHOOP_WORKER_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'api', path, token })
  });
  return res.ok ? res.json() : null;
}

async function loadWhoopData() {
  const token = await getWhoopToken();
  if (!token) return null;
  try {
    const [recovery, cycle] = await Promise.all([
      whoopApi('/v2/recovery?limit=1', token),
      whoopApi('/v2/cycle?limit=1',    token)
    ]);
    return { recovery, cycle };
  } catch(e) { console.error('Whoop fetch error:', e); return null; }
}

function whoopSectionHTML() {
  const connected = !!localStorage.getItem('whoop_access_token');

  if (!connected) {
    return '<div class="whoop-card not-connected">' +
      '<span class="whoop-logo">WHOOP</span>' +
      '<button class="btn-secondary" onclick="window._connectWhoop()">Connect WHOOP</button>' +
    '</div>';
  }

  const rec    = whoopData?.recovery?.records?.[0];
  const cycle  = whoopData?.cycle?.records?.[0];
  const score  = rec?.score?.recovery_score ?? null;
  const hrv    = rec?.score?.hrv_rmssd_milli   ? Math.round(rec.score.hrv_rmssd_milli)   : null;
  const rhr    = rec?.score?.resting_heart_rate ? Math.round(rec.score.resting_heart_rate) : null;
  const strain = cycle?.score?.strain           ? cycle.score.strain.toFixed(1)            : null;

  let scoreColor, scoreLabel;
  if (score === null)   { scoreColor = '#4a728f'; scoreLabel = '—'; }
  else if (score >= 67) { scoreColor = '#2ecc71'; scoreLabel = 'Peak'; }
  else if (score >= 34) { scoreColor = '#f0a500'; scoreLabel = 'Good'; }
  else                  { scoreColor = '#e05050'; scoreLabel = 'Low'; }

  const pct = score ?? 0;

  return '<div class="whoop-card">' +
    '<div class="whoop-card-header">' +
      '<span class="whoop-logo">WHOOP</span>' +
      '<button class="whoop-disconnect" onclick="window._disconnectWhoop()">Disconnect</button>' +
    '</div>' +
    '<div class="whoop-metrics">' +
      '<div class="whoop-score-block">' +
        '<div class="whoop-ring-wrap">' +
          '<svg class="whoop-ring-svg" viewBox="0 0 36 36">' +
            '<circle class="ring-bg" cx="18" cy="18" r="15.9" fill="none" stroke-width="2.8"/>' +
            '<circle class="ring-fill" cx="18" cy="18" r="15.9" fill="none" stroke-width="2.8"' +
              ' stroke="' + scoreColor + '" pathLength="100"' +
              ' stroke-dasharray="' + pct + ' 100" stroke-linecap="round"/>' +
          '</svg>' +
          '<div class="whoop-score-num" style="color:' + scoreColor + '">' + (score !== null ? score + '%' : '—') + '</div>' +
        '</div>' +
        '<div class="whoop-score-label" style="color:' + scoreColor + '">' + scoreLabel + '</div>' +
        '<div class="whoop-metric-name">Recovery</div>' +
      '</div>' +
      '<div class="whoop-stats-grid">' +
        '<div class="whoop-stat"><div class="whoop-stat-val">' + (hrv    ?? '—') + '</div><div class="whoop-stat-lbl">HRV (ms)</div></div>' +
        '<div class="whoop-stat"><div class="whoop-stat-val">' + (rhr    ?? '—') + '</div><div class="whoop-stat-lbl">RHR (bpm)</div></div>' +
        '<div class="whoop-stat"><div class="whoop-stat-val">' + (strain ?? '—') + '</div><div class="whoop-stat-lbl">Strain</div></div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// ── Navigation ───────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("view-" + name).classList.remove("hidden");
  document.querySelector("[data-view='" + name + "']").classList.add("active");

  if (name === "dashboard") renderDashboard();
  else if (name === "log")      renderLog();
  else if (name === "progress") renderProgress();
  else if (name === "weight")   renderWeightView();
  else if (name === "library")  renderLibrary();
}

// ── Dashboard ────────────────────────────────────────────────
function renderDashboard() {
  const el = document.getElementById("view-dashboard");
  const now = new Date();
  const dayName  = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateLabel = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const last  = allWorkouts[0];
  const lastBW = allBodyweights[0];

  const weekStart = (() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split("T")[0];
  })();
  const weekCount = allWorkouts.filter(w => w.date >= weekStart).length;

  // Build recent workout cards as safe HTML
  const recentCards = allWorkouts.slice(0, 5).map(workoutCardHTML).join("");

  el.innerHTML =
    '<div class="dashboard-header">' +
      '<div>' +
        '<div class="dashboard-day">' + esc(dayName) + '</div>' +
        '<div class="dashboard-date">' + esc(dateLabel) + '</div>' +
      '</div>' +
      '<button class="btn-primary log-quick-btn" onclick="window._nav(\'log\')">' +
        '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">' +
          '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' +
        '</svg> Log Workout' +
      '</button>' +
    '</div>' +

    '<div class="stats-grid">' +
      '<div class="stat-card"><div class="stat-label">This Week</div>' +
        '<div class="stat-value">' + weekCount + '</div><div class="stat-sub">workouts</div></div>' +
      '<div class="stat-card"><div class="stat-label">Bodyweight</div>' +
        '<div class="stat-value">' + (lastBW ? lastBW.weight : "—") + '</div>' +
        '<div class="stat-sub">' + (lastBW ? "lbs &middot; " + esc(daysAgo(lastBW.date)) : "not logged") + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Last Session</div>' +
        '<div class="stat-value" style="font-size:16px;padding-top:4px">' + (last ? esc(daysAgo(last.date)) : "—") + '</div>' +
        '<div class="stat-sub">' + (last ? (last.exercises || []).length + " exercises" : "no logs yet") + '</div></div>' +
    '</div>' +

    whoopSectionHTML() +

    (allWorkouts.length === 0
      ? '<div class="empty-state"><div class="empty-icon">💪</div>' +
          '<div class="empty-title">No workouts logged yet</div>' +
          '<div class="empty-sub">Tap Log Workout to record your first session</div></div>'
      : '<div class="section-title">Recent Workouts</div>' +
          '<div class="workout-list">' + recentCards + '</div>');
}

// Build a workout summary card. Exercise names/notes come from DB so we escape them.
function workoutCardHTML(w) {
  const groups = [...new Set((w.exercises || []).map(e => e.muscleGroup).filter(Boolean))];
  const tagText = groups.length ? groups.map(esc).join(" &middot; ") : "Mixed";

  const rows = (w.exercises || []).map(e => {
    const mw = maxW(e);
    const detail = e.weighted === false
      ? e.sets.length + " sets &middot; BW"
      : e.sets.length + " sets &middot; " + (mw > 0 ? mw + " lbs" : "—");
    return '<div class="workout-card-exercise">' +
      '<span class="ex-name">' + esc(e.name) + '</span>' +
      '<span class="ex-sets">' + detail + '</span>' +
      '</div>';
  }).join("");

  const cardioRow = w.cardio
    ? '<div class="workout-card-exercise"><span class="ex-name">🚴 Bike</span>' +
        '<span class="ex-sets">' + parseInt(w.cardio) + ' min</span></div>'
    : "";

  return '<div class="workout-card">' +
    '<div class="workout-card-header">' +
      '<span class="workout-card-date">' + esc(formatDate(w.date)) + '</span>' +
      '<span class="workout-card-tag">' + tagText + '</span>' +
    '</div>' +
    '<div class="workout-card-exercises">' + rows + cardioRow + '</div>' +
    '</div>';
}

// ── Log Workout ──────────────────────────────────────────────
function renderLog() {
  const el = document.getElementById("view-log");
  const groups = Object.keys(EXERCISES);
  const selectedCount = Object.keys(logState.exercises).length;

  el.innerHTML =
    '<div class="view-header">' +
      '<h2 class="view-title">Log Workout</h2>' +
      (selectedCount > 0
        ? '<span style="font-size:13px;color:var(--accent);font-weight:600">' + selectedCount + ' selected</span>'
        : '') +
    '</div>' +

    '<div class="log-date-row"><label class="input-label">Date</label>' +
      '<input type="date" class="input-field" id="log-date" value="' + esc(logState.date) + '">' +
    '</div>' +

    '<div class="muscle-tabs" id="log-tabs">' +
      groups.map(g => {
        const cnt = Object.keys(logState.exercises).filter(n =>
          (EXERCISES[g] || []).find(e => e.name === n)
        ).length;
        return '<button class="muscle-tab ' + (g === activeLogGroup ? "active" : "") +
          '" onclick="window._logTab(\'' + g + '\')">' + esc(g) +
          (cnt ? ' <span style="opacity:.7">(' + cnt + ')</span>' : '') + '</button>';
      }).join("") +
    '</div>' +

    '<div class="exercises-list" id="log-ex-list">' + renderExList(activeLogGroup) + '</div>' +

    '<div class="cardio-section"><div class="section-title">Cardio</div>' +
      '<div class="cardio-row">' +
        '<span class="cardio-label">🚴 Bike</span>' +
        '<input type="number" class="input-field cardio-input" id="log-cardio" min="0" placeholder="0" value="' + esc(logState.cardio) + '">' +
        '<span class="cardio-unit">min</span>' +
      '</div></div>' +

    '<div class="notes-section"><label class="input-label">Notes</label>' +
      '<textarea class="input-field notes-input" id="log-notes" placeholder="How did it feel? Any PRs?"></textarea>' +
    '</div>' +

    '<button class="btn-primary save-btn" id="save-btn" onclick="window._saveWorkout()">Save Workout</button>';

  // Set textarea value via property (safe, no XSS risk)
  document.getElementById("log-notes").value = logState.notes;
  document.getElementById("log-date").addEventListener("change", e => { logState.date = e.target.value; });
  document.getElementById("log-cardio").addEventListener("change", e => { logState.cardio = e.target.value; });
  document.getElementById("log-notes").addEventListener("change", e => { logState.notes = e.target.value; });
}

function renderExList(group) {
  return (EXERCISES[group] || []).map(ex => {
    const sel = !!logState.exercises[ex.name];
    return '<div class="exercise-row ' + (sel ? "selected" : "") + '" id="exrow_' + safeId(ex.name) + '">' +
      '<div class="exercise-row-header" onclick="window._toggleEx(\'' + ex.name + '\',\'' + group + '\')">' +
        '<div class="exercise-check ' + (sel ? "checked" : "") + '">' +
          (sel ? '<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') +
        '</div>' +
        '<span class="exercise-name">' + esc(ex.name) + '</span>' +
      '</div>' +
      (sel ? setLogger(ex.name, logState.exercises[ex.name]) : '') +
    '</div>';
  }).join("");
}

function setLogger(exName, sets) {
  const rows = sets.map((s, i) =>
    '<div class="set-row">' +
      '<span class="set-num">' + (i + 1) + '</span>' +
      '<input type="number" class="set-input" placeholder="—" value="' + esc(s.weight) + '"' +
        ' onchange="window._updSet(\'' + exName + '\',' + i + ',\'weight\',this.value)">' +
      '<input type="number" class="set-input" placeholder="—" value="' + esc(s.reps) + '"' +
        ' onchange="window._updSet(\'' + exName + '\',' + i + ',\'reps\',this.value)">' +
      '<button class="set-remove" onclick="window._rmSet(\'' + exName + '\',' + i + ')"' +
        (sets.length === 1 ? ' disabled' : '') + '>&#x2715;</button>' +
    '</div>'
  ).join("");

  return '<div class="set-logger" id="sl_' + safeId(exName) + '">' +
    '<div class="set-header-row">' +
      '<span class="set-col-label">#</span>' +
      '<span class="set-col-label">Weight</span>' +
      '<span class="set-col-label">Reps</span>' +
      '<span class="set-col-label"></span>' +
    '</div>' +
    rows +
    '<button class="add-set-btn" onclick="window._addSet(\'' + exName + '\')">+ Add Set</button>' +
  '</div>';
}

function reRenderSetLogger(exName) {
  const sl = document.getElementById("sl_" + safeId(exName));
  if (sl) {
    const tmp = document.createElement("div");
    tmp.innerHTML = setLogger(exName, logState.exercises[exName]);
    sl.replaceWith(tmp.firstElementChild);
  } else {
    const row = document.getElementById("exrow_" + safeId(exName));
    const tmp = document.createElement("div");
    tmp.innerHTML = setLogger(exName, logState.exercises[exName]);
    row.appendChild(tmp.firstElementChild);
  }
}

function lastWeightFor(exName) {
  for (const w of allWorkouts) {
    const ex = (w.exercises || []).find(e => e.name === exName);
    if (ex?.sets?.length) return String(ex.sets[ex.sets.length - 1].weight || "");
  }
  return "";
}

window._logTab = function(group) {
  activeLogGroup = group;
  document.querySelectorAll("#log-tabs .muscle-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll("#log-tabs .muscle-tab").forEach(t => {
    if (t.textContent.trim().startsWith(group)) t.classList.add("active");
  });
  document.getElementById("log-ex-list").innerHTML = renderExList(group);
};

window._toggleEx = function(exName, group) {
  if (logState.exercises[exName]) {
    delete logState.exercises[exName];
  } else {
    logState.exercises[exName] = [{ weight: lastWeightFor(exName), reps: "", muscleGroup: group }];
  }
  const sel = !!logState.exercises[exName];
  const row = document.getElementById("exrow_" + safeId(exName));
  row.className = "exercise-row " + (sel ? "selected" : "");

  const header = '<div class="exercise-row-header" onclick="window._toggleEx(\'' + exName + '\',\'' + group + '\')">' +
    '<div class="exercise-check ' + (sel ? "checked" : "") + '">' +
      (sel ? '<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') +
    '</div>' +
    '<span class="exercise-name">' + esc(exName) + '</span>' +
  '</div>';

  const tmp = document.createElement("div");
  tmp.innerHTML = header + (sel ? setLogger(exName, logState.exercises[exName]) : "");
  row.replaceChildren(...tmp.childNodes);
};

window._updSet = function(exName, i, field, val) {
  if (logState.exercises[exName]) logState.exercises[exName][i][field] = val;
};

window._addSet = function(exName) {
  const sets = logState.exercises[exName];
  const prev = sets[sets.length - 1];
  sets.push({ weight: prev.weight, reps: prev.reps, muscleGroup: prev.muscleGroup });
  reRenderSetLogger(exName);
};

window._rmSet = function(exName, i) {
  const sets = logState.exercises[exName];
  if (sets.length <= 1) return;
  sets.splice(i, 1);
  reRenderSetLogger(exName);
};

window._saveWorkout = async function() {
  const exercises = Object.entries(logState.exercises).map(([name, sets]) => {
    const libEx = Object.values(EXERCISES).flat().find(e => e.name === name);
    return {
      name,
      muscleGroup: sets[0]?.muscleGroup || "",
      weighted: libEx ? libEx.weighted : true,
      sets: sets.map(s => ({ weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0 }))
    };
  });

  if (exercises.length === 0 && !logState.cardio) {
    toast("Select at least one exercise or add cardio first");
    return;
  }

  const btn = document.getElementById("save-btn");
  btn.textContent = "Saving…";
  btn.disabled = true;

  try {
    await saveWorkoutDoc({
      date: logState.date,
      exercises,
      cardio: logState.cardio ? parseInt(logState.cardio) : null,
      notes: logState.notes || ""
    });
    logState = { date: todayStr(), exercises: {}, cardio: "", notes: "" };
    toast("Workout saved!");
    showView("dashboard");
  } catch (e) {
    console.error(e);
    toast("Error saving — please try again");
    btn.textContent = "Save Workout";
    btn.disabled = false;
  }
};

// ── Progress ─────────────────────────────────────────────────
function renderProgress() {
  const el = document.getElementById("view-progress");
  const names = [...new Set(allWorkouts.flatMap(w => (w.exercises || []).map(e => e.name)))].sort();

  el.innerHTML =
    '<div class="view-header"><h2 class="view-title">Progress</h2></div>' +
    (names.length === 0
      ? '<div class="empty-state"><div class="empty-icon">📈</div>' +
          '<div class="empty-title">No data yet</div>' +
          '<div class="empty-sub">Log a few workouts to see your strength charts</div></div>'
      : '<div class="progress-controls"><label class="input-label">Exercise</label>' +
          '<select class="input-field select-field" id="prog-sel">' +
            names.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join("") +
          '</select></div>' +
          '<div class="chart-container"><canvas id="prog-chart"></canvas></div>' +
          '<div id="prog-stats"></div>');

  if (names.length > 0) {
    document.getElementById("prog-sel").addEventListener("change", e => window._updateChart(e.target.value));
    window._updateChart(names[0]);
  }
}

window._updateChart = function(exName) {
  const points = [];
  [...allWorkouts].reverse().forEach(w => {
    const ex = (w.exercises || []).find(e => e.name === exName);
    if (!ex?.sets?.length) return;
    const weights = ex.sets.map(s => parseFloat(s.weight) || 0);
    const reps    = ex.sets.map(s => parseInt(s.reps) || 0);
    points.push({ date: w.date, maxWeight: Math.max(...weights), maxReps: Math.max(...reps) });
  });

  const ctx = document.getElementById("prog-chart");
  if (!ctx) return;
  if (progressChart) progressChart.destroy();

  const isBodyweight = points.every(p => p.maxWeight === 0);
  const yData = isBodyweight ? points.map(p => p.maxReps) : points.map(p => p.maxWeight);

  progressChart = new Chart(ctx.getContext("2d"), {
    type: "line",
    data: {
      labels: points.map(p => formatDate(p.date)),
      datasets: [{ data: yData,
        borderColor: "#b2d7c7", backgroundColor: "rgba(178,215,199,0.08)",
        borderWidth: 2.5, pointBackgroundColor: "#b2d7c7",
        pointRadius: 5, pointHoverRadius: 7, tension: 0.35, fill: true }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: "#172433", borderColor: "#1e3450", borderWidth: 1,
        titleColor: "#fff", bodyColor: "#7fa8c8", padding: 12 }},
      scales: {
        x: { ticks: { color: "#7fa8c8", maxRotation: 40, font: { size: 11 } }, grid: { color: "#1e3450" } },
        y: { ticks: { color: "#7fa8c8" }, grid: { color: "#1e3450" },
             title: { display: true, text: isBodyweight ? "Reps" : "Max Weight (lbs)", color: "#4a728f" } }
      }
    }
  });

  const statsEl = document.getElementById("prog-stats");
  if (!statsEl || points.length === 0) return;

  const pr    = Math.max(...yData);
  const delta = yData[yData.length - 1] - yData[0];
  statsEl.innerHTML =
    '<div class="stats-grid" style="margin-top:16px">' +
      '<div class="stat-card"><div class="stat-label">Sessions</div>' +
        '<div class="stat-value">' + points.length + '</div><div class="stat-sub">logged</div></div>' +
      '<div class="stat-card"><div class="stat-label">' + (isBodyweight ? "Best Reps" : "Personal Record") + '</div>' +
        '<div class="stat-value">' + pr + '</div><div class="stat-sub">' + (isBodyweight ? "reps" : "lbs") + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Progress</div>' +
        '<div class="stat-value ' + (delta >= 0 ? "positive" : "negative") + '">' + (delta >= 0 ? "+" : "") + delta + '</div>' +
        '<div class="stat-sub">' + (isBodyweight ? "reps" : "lbs gained") + '</div></div>' +
    '</div>';
};

// ── Body Weight ──────────────────────────────────────────────
function renderWeightView() {
  const el = document.getElementById("view-weight");
  const latest = allBodyweights[0];

  el.innerHTML =
    '<div class="view-header"><h2 class="view-title">Body Weight</h2></div>' +
    '<div class="weight-log-card">' +
      (latest
        ? '<div class="current-weight-display">' +
            '<div class="current-weight-value">' + latest.weight + '</div>' +
            '<div class="current-weight-unit">lbs</div>' +
            '<div class="current-weight-date">' + esc(daysAgo(latest.date)) + '</div>' +
          '</div>'
        : '<div class="current-weight-empty">No weight logged yet</div>') +
      '<div class="weight-log-form">' +
        '<input type="number" class="input-field weight-input" id="bw-val"' +
          ' placeholder="Enter weight (lbs)" step="0.1" min="50" max="500">' +
        '<input type="date" class="input-field" id="bw-date" value="' + todayStr() + '">' +
        '<button class="btn-primary" onclick="window._saveBW()">Log Weight</button>' +
      '</div>' +
    '</div>' +
    (allBodyweights.length >= 2
      ? '<div class="weight-stats">' + weightStatsHTML() + '</div>' +
          '<div class="chart-container"><canvas id="bw-chart"></canvas></div>'
      : '<div class="empty-state"><div class="empty-sub">Log a few weights to see your trend chart</div></div>');

  if (allBodyweights.length >= 2) renderBWChart();
}

function weightStatsHTML() {
  const sorted = [...allBodyweights].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0].weight;
  const last  = sorted[sorted.length - 1].weight;
  const delta = (last - first).toFixed(1);
  const low   = Math.min(...sorted.map(w => w.weight));
  const high  = Math.max(...sorted.map(w => w.weight));
  return '<div class="stats-grid">' +
    '<div class="stat-card"><div class="stat-label">Starting</div>' +
      '<div class="stat-value">' + first + '</div><div class="stat-sub">lbs</div></div>' +
    '<div class="stat-card"><div class="stat-label">Change</div>' +
      '<div class="stat-value ' + (delta <= 0 ? "positive" : "negative") + '">' + (delta > 0 ? "+" : "") + delta + '</div>' +
      '<div class="stat-sub">lbs</div></div>' +
    '<div class="stat-card"><div class="stat-label">Range</div>' +
      '<div class="stat-value" style="font-size:18px">' + low + '–' + high + '</div>' +
      '<div class="stat-sub">lbs</div></div>' +
  '</div>';
}

function renderBWChart() {
  const sorted = [...allBodyweights].sort((a, b) => a.date.localeCompare(b.date));
  const ctx = document.getElementById("bw-chart");
  if (!ctx) return;
  if (weightChart) weightChart.destroy();

  weightChart = new Chart(ctx.getContext("2d"), {
    type: "line",
    data: {
      labels: sorted.map(d => formatDate(d.date)),
      datasets: [{ data: sorted.map(d => d.weight),
        borderColor: "#b2d7c7", backgroundColor: "rgba(178,215,199,0.08)",
        borderWidth: 2.5, pointBackgroundColor: "#b2d7c7",
        pointRadius: 4, tension: 0.35, fill: true }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: "#172433", borderColor: "#1e3450", borderWidth: 1,
        titleColor: "#fff", bodyColor: "#7fa8c8", padding: 12 }},
      scales: {
        x: { ticks: { color: "#7fa8c8", maxRotation: 40, font: { size: 11 } }, grid: { color: "#1e3450" } },
        y: { ticks: { color: "#7fa8c8" }, grid: { color: "#1e3450" },
             title: { display: true, text: "lbs", color: "#4a728f" } }
      }
    }
  });
}

window._saveBW = async function() {
  const val  = document.getElementById("bw-val").value;
  const date = document.getElementById("bw-date").value;
  if (!val || !date) { toast("Enter a weight and date first"); return; }
  try {
    await saveBodyweightDoc(date, val);
    toast("Weight logged!");
    renderWeightView();
  } catch (e) {
    toast("Error saving — please try again");
  }
};

// ── Library ──────────────────────────────────────────────────
function renderLibrary() {
  const el = document.getElementById("view-library");
  const groups = Object.keys(EXERCISES);

  el.innerHTML =
    '<div class="view-header">' +
      '<h2 class="view-title">Library</h2>' +
      '<button class="btn-secondary" onclick="window._openAddEx()">+ Add</button>' +
    '</div>' +
    '<div class="muscle-tabs" id="lib-tabs">' +
      groups.map(g =>
        '<button class="muscle-tab ' + (g === activeLibGroup ? "active" : "") +
        '" onclick="window._libTab(\'' + g + '\')">' + esc(g) + '</button>'
      ).join("") +
    '</div>' +
    '<div class="library-list" id="lib-list">' + renderLibCards(activeLibGroup) + '</div>' +

    '<div class="modal-overlay hidden" id="add-ex-modal">' +
      '<div class="modal">' +
        '<div class="modal-header"><h3>Add Exercise</h3>' +
          '<button class="modal-close" onclick="window._closeAddEx()">&#x2715;</button></div>' +
        '<div class="modal-body">' +
          '<label class="input-label">Name</label>' +
          '<input type="text" class="input-field" id="new-ex-name" placeholder="e.g. Cable Fly">' +
          '<label class="input-label">Muscle Group</label>' +
          '<select class="input-field select-field" id="new-ex-group">' +
            groups.map(g => '<option value="' + esc(g) + '">' + esc(g) + '</option>').join("") +
          '</select>' +
          '<label class="input-label">Type</label>' +
          '<select class="input-field select-field" id="new-ex-weighted">' +
            '<option value="true">Weighted</option>' +
            '<option value="false">Bodyweight</option>' +
          '</select>' +
          '<button class="btn-primary" onclick="window._saveNewEx()" style="margin-top:8px">Save Exercise</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function renderLibCards(group) {
  return (EXERCISES[group] || []).map(ex => {
    const id = "lc_" + safeId(ex.name);
    return '<div class="library-card" id="' + id + '">' +
      '<div class="library-card-header" onclick="document.getElementById(\'' + id + '\').classList.toggle(\'expanded\')">' +
        '<div>' +
          '<div class="library-card-name">' + esc(ex.name) + '</div>' +
          '<div class="library-card-tag">' + esc(group) + (ex.weighted === false ? " &middot; Bodyweight" : "") + '</div>' +
        '</div>' +
        '<span class="expand-arrow">&#x203A;</span>' +
      '</div>' +
      '<div class="library-card-body">' +
        '<div class="form-cues">' +
          ex.cues.map(c =>
            '<div class="form-cue"><span class="cue-dot"></span>' + esc(c) + '</div>'
          ).join("") +
        '</div>' +
        '<a class="youtube-link" target="_blank" rel="noopener"' +
          ' href="https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.name + " exercise form") + '">' +
          '&#x25B6; Watch Form Video' +
        '</a>' +
      '</div>' +
    '</div>';
  }).join("");
}

window._libTab = function(group) {
  activeLibGroup = group;
  document.querySelectorAll("#lib-tabs .muscle-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll("#lib-tabs .muscle-tab").forEach(t => {
    if (t.textContent.trim() === group) t.classList.add("active");
  });
  document.getElementById("lib-list").innerHTML = renderLibCards(group);
};

window._openAddEx  = () => document.getElementById("add-ex-modal").classList.remove("hidden");
window._closeAddEx = () => document.getElementById("add-ex-modal").classList.add("hidden");

window._saveNewEx = function() {
  const nameInput = document.getElementById("new-ex-name");
  const name = nameInput.value.trim();
  const group    = document.getElementById("new-ex-group").value;
  const weighted = document.getElementById("new-ex-weighted").value === "true";
  if (!name) { toast("Please enter a name"); return; }
  EXERCISES[group].push({ name, weighted, cues: ["No form cues added yet."] });
  window._closeAddEx();
  renderLibrary();
  window._libTab(group);
};

// ── Init ─────────────────────────────────────────────────────
window._nav = showView;

async function init() {
  document.getElementById("header-date").textContent =
    new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  document.querySelectorAll(".nav-btn").forEach(btn =>
    btn.addEventListener("click", () => showView(btn.dataset.view))
  );

  const loadingDiv = document.createElement("div");
  loadingDiv.className = "loading";
  loadingDiv.textContent = "Loading…";
  document.getElementById("app-main").appendChild(loadingDiv);

  try { await Promise.all([loadWorkouts(), loadBodyweights()]); }
  catch (e) { console.error("Firebase load error:", e); }

  // Handle Whoop OAuth callback (runs after Whoop redirects back to the app)
  const urlParams  = new URLSearchParams(window.location.search);
  const oauthCode  = urlParams.get('code');
  const oauthState = urlParams.get('state');
  if (oauthCode && oauthState && oauthState === localStorage.getItem('whoop_state')) {
    window.history.replaceState({}, '', window.location.pathname);
    try {
      const tokens = await exchangeWhoopCode(oauthCode);
      if (tokens?.access_token) { storeWhoopTokens(tokens); toast('WHOOP connected!'); }
    } catch(e) { console.error('Whoop token exchange error:', e); }
  }

  whoopData = await loadWhoopData();

  loadingDiv.remove();
  showView("dashboard");
}

init();
