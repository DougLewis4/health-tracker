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
const WHOOP_SCOPES     = 'read:recovery read:cycles read:sleep read:profile offline';

// ── App Constants ─────────────────────────────────────────────
const GOAL_WEIGHT = 215;
const DAILY_QUOTE = {
  text: "You have power over your mind — not outside events. Realize this, and you will find strength.",
  author: "Marcus Aurelius"
};

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
let whoopData = null;
let sheetOpen = false;

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

// ── Workout Timer ────────────────────────────────────────────
// Start time lives in localStorage so the clock survives the app being closed mid-workout.
const TIMER_KEY = "workout_started_at";
const TIMER_STALE_MS = 12 * 60 * 60 * 1000;

function timerStartedAt() {
  const t = parseInt(localStorage.getItem(TIMER_KEY) || "0");
  if (t && Date.now() - t > TIMER_STALE_MS) {
    localStorage.removeItem(TIMER_KEY);
    return 0;
  }
  return t;
}

function startTimerIfNeeded() {
  if (!timerStartedAt()) localStorage.setItem(TIMER_KEY, String(Date.now()));
}

function clearTimer() {
  localStorage.removeItem(TIMER_KEY);
}

function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? h + ":" + String(m).padStart(2, "0") + ":" + s : m + ":" + s;
}

function timerChipHTML() {
  const t = timerStartedAt();
  if (!t) return "";
  return '<span class="workout-timer"><span class="workout-timer-dot"></span>' +
    '<span class="workout-timer-time">' + formatElapsed(Date.now() - t) + '</span></span>';
}

// In-progress workout is kept as a draft so entered sets survive the app being closed.
const DRAFT_KEY = "workout_draft";

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(logState));
}

function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (d && d.exercises && (Object.keys(d.exercises).length || d.cardio)) {
      logState = { date: d.date || todayStr(), exercises: d.exercises, cardio: d.cardio || "", notes: d.notes || "" };
    }
  } catch (e) { localStorage.removeItem(DRAFT_KEY); }
}

// Called after exercises or cardio are added or removed: starts the clock on the first one,
// resets it if the workout is emptied, saves the draft, and refreshes any visible timer chips.
function syncTimer() {
  const hasWork = Object.keys(logState.exercises).length > 0 || !!logState.cardio;
  if (hasWork) startTimerIfNeeded();
  else clearTimer();
  saveDraft();
  document.querySelectorAll(".timer-slot").forEach(el => { el.innerHTML = timerChipHTML(); });
}

setInterval(() => {
  const t = timerStartedAt();
  if (!t) return;
  const text = formatElapsed(Date.now() - t);
  document.querySelectorAll(".workout-timer-time").forEach(el => { el.textContent = text; });
}, 1000);

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

function maxWeightEver(exName) {
  let best = 0;
  for (const w of allWorkouts) {
    const ex = (w.exercises || []).find(e => e.name === exName);
    if (ex?.sets) {
      const m = Math.max(...ex.sets.map(s => parseFloat(s.weight) || 0));
      if (m > best) best = m;
    }
  }
  return best;
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

// ── Navigation ───────────────────────────────────────────────
function showView(name) {
  if (sheetOpen) window._closeSheet();
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("view-" + name).classList.remove("hidden");
  document.querySelector("[data-view='" + name + "']").classList.add("active");
  if (name === "dashboard") renderDashboard();
  else if (name === "log")      renderLog();
  else if (name === "progress") renderProgress();
  else if (name === "weight")   renderWeightView();
}

// ── Today (dashboard) ────────────────────────────────────────
// Assisted Pull-Ups: less assistance weight means more strength, so lower is better
const LOWER_IS_BETTER = new Set(["Assisted Pull-Ups"]);

function exTop(ex) {
  const ws = (ex.sets || []).map(s => parseFloat(s.weight) || 0).filter(w => w > 0);
  if (!ws.length) return 0;
  return LOWER_IS_BETTER.has(ex.name) ? Math.min(...ws) : Math.max(...ws);
}

function isBetter(name, a, b) {
  return LOWER_IS_BETTER.has(name) ? a < b : a > b;
}

function workoutVolume(w) {
  return (w.exercises || []).reduce((t, e) =>
    t + (e.sets || []).reduce((u, s) => u + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);
}

// Exercises in this workout that beat every earlier session of the same exercise
function workoutPRs(w) {
  const prs = [];
  for (const ex of (w.exercises || [])) {
    const top = exTop(ex);
    if (!top) continue;
    const earlier = allWorkouts
      .filter(o => o.date < w.date)
      .flatMap(o => (o.exercises || []).filter(e => e.name === ex.name))
      .map(exTop).filter(Boolean);
    if (!earlier.length) continue;
    const best = LOWER_IS_BETTER.has(ex.name) ? Math.min(...earlier) : Math.max(...earlier);
    if (isBetter(ex.name, top, best)) prs.push(ex.name);
  }
  return prs;
}

function workoutName(w) {
  const groups = [...new Set((w.exercises || []).map(e => e.muscleGroup).filter(Boolean))].sort();
  if (groups.length) return groups.join(" · ");
  return w.cardio ? "Cardio" : "Workout";
}

function dateFromStr(d) { return new Date(d + "T12:00:00"); }

function daysBetween(a, b) {
  return Math.round((dateFromStr(b) - dateFromStr(a)) / 86400000);
}

function isoDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Sunday–Saturday of the current week, with minutes trained each day
function durationWeek() {
  const today = dateFromStr(todayStr());
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  return ["S", "M", "T", "W", "T", "F", "S"].map((label, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const ds = isoDate(d);
    const min = allWorkouts.filter(w => w.date === ds).reduce((t, w) => t + (parseInt(w.durationMin) || 0), 0);
    return { label, min, isToday: ds === todayStr(), isFuture: ds > todayStr() };
  });
}

function sparkline(vals, w, h) {
  if (vals.length < 2) return "";
  const lo = Math.min(...vals), hi = Math.max(...vals), r = (hi - lo) || 1;
  const pts = vals.map((v, i) =>
    (i * w / (vals.length - 1)).toFixed(1) + "," + (h - 2 - (v - lo) / r * (h - 4)).toFixed(1)).join(" ");
  return '<svg class="lift-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
    '<polyline points="' + pts + '"/></svg>';
}

function recoveryTileHTML() {
  const connected = !!localStorage.getItem("whoop_access_token");
  if (!connected) {
    return '<div class="tstat"><div class="tstat-label">Recovery</div>' +
      '<div class="tstat-value">—</div>' +
      '<button class="tstat-link" onclick="window._connectWhoop()">Connect Whoop</button></div>';
  }
  const score = whoopData?.recovery?.records?.[0]?.score?.recovery_score ?? null;
  let color = "var(--text-primary)";
  if (score !== null) color = score >= 67 ? "var(--success)" : score >= 34 ? "#F0B429" : "var(--danger)";
  return '<div class="tstat"><div class="tstat-label">Recovery</div>' +
    '<div class="tstat-value" style="color:' + color + '">' + (score !== null ? Math.round(score) + '<span class="tstat-pct">%</span>' : "—") + '</div>' +
    '<div class="tstat-unit">Whoop</div></div>';
}

function renderDashboard() {
  const el = document.getElementById("view-dashboard");
  const today = todayStr();

  // Last workout
  const last = allWorkouts.find(w => w.date <= today);
  const daysSince = last ? daysBetween(last.date, today) : null;
  const lastValue = daysSince === null ? "—" : daysSince === 0 ? "Today" : daysSince;
  const lastUnit = daysSince === null ? "no workouts yet" : daysSince === 0 ? "keep it going" : daysSince === 1 ? "day ago" : "days ago";

  // Weekly duration
  const week = durationWeek();
  const weekMin = week.reduce((t, d) => t + d.min, 0);
  const maxMin = Math.max(60, ...week.map(d => d.min));
  const barsHTML = week.map(d => {
    const h = d.min > 0 ? Math.max(6, Math.round(d.min / maxMin * 56)) : 3;
    const cls = d.min > 0 ? "on" : d.isFuture ? "future" : "";
    return '<div class="dur-day">' +
      '<div class="dur-min">' + (d.min > 0 ? d.min : "") + '</div>' +
      '<div class="dur-bar ' + cls + '" style="height:' + h + 'px"></div>' +
      '<div class="dur-label' + (d.isToday ? " today" : "") + '">' + d.label + '</div>' +
    '</div>';
  }).join("");

  // Recent workouts
  const recentHTML = allWorkouts.slice(0, 3).map(w => {
    const d = dateFromStr(w.date);
    const exCount = (w.exercises || []).length;
    const setCount = (w.exercises || []).reduce((t, e) => t + (e.sets || []).length, 0);
    const meta = [d.toLocaleDateString("en-US", { weekday: "short" })];
    if (exCount) meta.push(exCount + (exCount === 1 ? " exercise" : " exercises"), setCount + " sets");
    if (w.durationMin) meta.push(w.durationMin + " min");
    else if (w.cardio) meta.push("bike " + parseInt(w.cardio) + "m");
    const prs = workoutPRs(w);
    const tag = prs.length === 1 ? "PR · " + esc(prs[0]) : prs.length > 1 ? prs.length + " PRs" : "lbs";
    return '<div class="recent-row">' +
      '<div class="recent-date">' +
        '<div class="recent-mon">' + d.toLocaleDateString("en-US", { month: "short" }).toUpperCase() + '</div>' +
        '<div class="recent-day">' + d.getDate() + '</div>' +
      '</div>' +
      '<div class="recent-main">' +
        '<div class="recent-name">' + esc(workoutName(w)) + '</div>' +
        '<div class="recent-meta">' + meta.join(" · ") + '</div>' +
      '</div>' +
      '<div class="recent-side">' +
        '<div class="recent-vol">' + Math.round(workoutVolume(w)).toLocaleString("en-US") + '</div>' +
        '<div class="recent-tag' + (prs.length ? " pr" : "") + '">' + tag + '</div>' +
      '</div>' +
    '</div>';
  }).join("");

  // Most-logged lifts
  const counts = {};
  allWorkouts.forEach(w => (w.exercises || []).forEach(e => { if (exTop(e)) counts[e.name] = (counts[e.name] || 0) + 1; }));
  const topLifts = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => {
    const history = [...allWorkouts].reverse()
      .flatMap(w => (w.exercises || []).filter(e => e.name === name))
      .map(exTop).filter(Boolean);
    const recent = history.slice(-8);
    const best = LOWER_IS_BETTER.has(name) ? Math.min(...history) : Math.max(...history);
    return '<div class="lift-tile">' +
      '<div class="lift-name">' + esc(name) + '</div>' +
      '<div class="lift-top">' + recent[recent.length - 1] + '</div>' +
      sparkline(recent, 90, 24) +
      '<div class="lift-best">best ' + best + '</div>' +
    '</div>';
  }).join("");

  const inProgress = !!timerStartedAt();

  el.innerHTML =
    '<section class="today-stats">' +
      recoveryTileHTML() +
      '<div class="tstat"><div class="tstat-label">Last workout</div>' +
        '<div class="tstat-value">' + lastValue + '</div><div class="tstat-unit">' + lastUnit + '</div></div>' +
      '<div class="tstat"><div class="tstat-label">Weekly duration</div>' +
        '<div class="tstat-value accent">' + weekMin + '</div><div class="tstat-unit">minutes</div></div>' +
    '</section>' +

    '<section class="dur-chart" aria-label="Minutes trained each day this week">' + barsHTML + '</section>' +

    (recentHTML
      ? '<section class="today-section">' +
          '<div class="today-section-head"><span>Recent</span></div>' +
          recentHTML +
        '</section>'
      : '<div class="empty-state"><div class="empty-title">No workouts yet</div>' +
          '<div class="empty-sub">Tap Start workout to log your first one</div></div>') +

    (topLifts
      ? '<section class="today-section">' +
          '<div class="today-section-head"><span>Most-logged lifts · last 8 sessions</span></div>' +
          '<div class="lift-tiles">' + topLifts + '</div>' +
        '</section>'
      : '') +

    '<button class="start-btn" onclick="' + (inProgress ? "window._nav('log')" : "window._openSheet()") + '">' +
      (inProgress ? "Resume workout" : "Start workout") +
    '</button>';
}

// ── Bottom Sheet ─────────────────────────────────────────────
window._openSheet = function() {
  sheetOpen = true;
  logState.date = todayStr();
  const overlay = document.getElementById("workout-sheet");
  overlay.classList.remove("hidden");
  renderSheetContent();
};

window._closeSheet = function() {
  sheetOpen = false;
  document.getElementById("workout-sheet").classList.add("hidden");
  // Clear sheet DOM so IDs don't conflict with log view
  document.getElementById("sheet-content").innerHTML = "";
};

function renderSheetContent() {
  const el = document.getElementById("sheet-content");
  const groups = Object.keys(EXERCISES);
  const selectedCount = Object.keys(logState.exercises).length;
  const bikeAdded = !!logState.cardio;

  const scrollHTML =
    '<div class="sheet-header">' +
      '<div>' +
        '<div class="sheet-title">Today\'s Workout</div>' +
        '<div class="sheet-sub">' + esc(formatDate(logState.date)) + ' <span class="timer-slot">' + timerChipHTML() + '</span></div>' +
      '</div>' +
      '<button class="modal-close" onclick="window._closeSheet()">&#x2715;</button>' +
    '</div>' +

    '<div id="sheet-selected-count" style="font-size:13px;color:var(--accent);font-weight:600;margin-bottom:12px;' +
      (selectedCount === 0 ? 'display:none' : '') + '">' +
      selectedCount + ' exercise' + (selectedCount !== 1 ? 's' : '') + ' selected' +
    '</div>' +

    '<div class="muscle-tabs" id="sheet-log-tabs">' +
      groups.map(g => {
        const cnt = Object.keys(logState.exercises).filter(n =>
          (EXERCISES[g] || []).find(e => e.name === n)
        ).length;
        return '<button class="muscle-tab ' + (g === activeLogGroup ? "active" : "") +
          '" onclick="window._logTab(\'' + g + '\')">' + esc(g) +
          (cnt ? ' <span style="opacity:.7">(' + cnt + ')</span>' : '') + '</button>';
      }).join("") +
    '</div>' +

    '<div class="exercises-list" id="log-ex-list">' + renderSheetExList(activeLogGroup) + '</div>' +

    '<div class="cardio-section">' +
      '<div class="section-title">Cardio</div>' +
      (bikeAdded
        ? '<div class="sheet-bike-row">' +
            '<span class="sheet-bike-name">🚴 Bike</span>' +
            '<input type="number" class="input-field cardio-input" id="log-cardio" min="0" placeholder="0" value="' + esc(String(logState.cardio || "")) + '" onchange="window._setCardio(this.value, false)">' +
            '<span class="cardio-unit">min</span>' +
            '<button class="btn-sheet-remove" onclick="window._setCardio(\'\', true)">Remove</button>' +
          '</div>'
        : '<button class="btn-sheet-add" style="width:100%;padding:10px;display:block;text-align:center" onclick="window._setCardio(\'30\', true)">+ Add Bike</button>') +
    '</div>';

  el.innerHTML =
    '<div class="sheet-scroll">' + scrollHTML + '</div>' +
    '<div class="sheet-footer">' +
      '<button class="btn-primary save-btn" id="save-btn" onclick="window._saveWorkout()" style="width:100%;padding:15px">Save Workout</button>' +
    '</div>';
}

function renderSheetExList(group) {
  return (EXERCISES[group] || []).map(ex => {
    const sel = !!logState.exercises[ex.name];
    const safeExId = safeId(ex.name);
    return '<div class="sheet-ex-row ' + (sel ? "selected" : "") + '" id="sheetex_' + safeExId + '">' +
      '<span class="sheet-ex-name">' + esc(ex.name) + '</span>' +
      '<button class="' + (sel ? "btn-sheet-remove" : "btn-sheet-add") + '" ' +
        'onclick="window._sheetToggleEx(\'' + ex.name + '\',\'' + group + '\')">' +
        (sel ? '✓ Added' : '+ Add') +
      '</button>' +
    '</div>';
  }).join("");
}

window._setCardio = function(val, rerender) {
  logState.cardio = val;
  syncTimer();
  if (rerender) renderSheetContent();
};

window._sheetToggleEx = function(exName, group) {
  if (logState.exercises[exName]) {
    delete logState.exercises[exName];
  } else {
    logState.exercises[exName] = [{ weight: lastWeightFor(exName), reps: "", muscleGroup: group }];
  }
  syncTimer();
  // Refresh exercise list
  document.getElementById("log-ex-list").innerHTML = renderSheetExList(group);
  // Update selected count label
  const cnt = Object.keys(logState.exercises).length;
  const countEl = document.getElementById("sheet-selected-count");
  if (countEl) {
    countEl.style.display = cnt > 0 ? "" : "none";
    countEl.textContent = cnt + ' exercise' + (cnt !== 1 ? 's' : '') + ' selected';
  }
  // Update tab count badges
  const groups = Object.keys(EXERCISES);
  document.querySelectorAll("#sheet-log-tabs .muscle-tab").forEach((tab, i) => {
    const g = groups[i];
    const groupCnt = Object.keys(logState.exercises).filter(n =>
      (EXERCISES[g] || []).find(e => e.name === n)
    ).length;
    tab.innerHTML = esc(g) + (groupCnt ? ' <span style="opacity:.7">(' + groupCnt + ')</span>' : '');
  });
};

// ── Log Workout ──────────────────────────────────────────────
function renderLog() {
  const el = document.getElementById("view-log");
  const groups = Object.keys(EXERCISES);
  const selectedCount = Object.keys(logState.exercises).length;
  const totalEx = groups.reduce((a, g) => a + EXERCISES[g].length, 0);
  const progressPct = totalEx > 0 ? (selectedCount / totalEx) * 100 : 0;

  el.innerHTML =
    '<div class="view-header" style="margin-bottom:8px">' +
      '<div>' +
        '<div class="view-eyebrow">Log Workout</div>' +
        '<h2 class="view-title">Exercises</h2>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
        '<span class="timer-slot">' + timerChipHTML() + '</span>' +
        '<span id="log-selected-count" style="font-size:13px;color:var(--accent);font-weight:600' + (selectedCount === 0 ? ';display:none' : '') + '">' + selectedCount + ' selected</span>' +
      '</div>' +
    '</div>' +

    '<div class="log-date-row"><label class="input-label">Date</label>' +
      '<input type="date" class="input-field" id="log-date" value="' + esc(logState.date) + '">' +
    '</div>' +

    '<div class="log-progress-bar-track"><div class="log-progress-bar-fill" style="width:' + progressPct.toFixed(1) + '%"></div></div>' +
    '<div class="log-progress-label">' +
      '<span>' + selectedCount + ' exercises selected</span>' +
      '<span>' + (totalEx - selectedCount) + ' remaining</span>' +
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

  document.getElementById("log-notes").value = logState.notes;
  document.getElementById("log-date").addEventListener("change", e => { logState.date = e.target.value; saveDraft(); });
  document.getElementById("log-cardio").addEventListener("change", e => { logState.cardio = e.target.value; syncTimer(); });
  document.getElementById("log-notes").addEventListener("change", e => { logState.notes = e.target.value; saveDraft(); });
}

function renderExList(group) {
  return (EXERCISES[group] || []).map(ex => {
    const sel  = !!logState.exercises[ex.name];
    const sets = logState.exercises[ex.name] || [];
    const setCount = sets.length;
    let statusClass = "";
    if (sel) statusClass = setCount >= 3 ? "done" : "in-progress";

    // PR badge: check if current max beats all-time
    const curMax = sel ? Math.max(...sets.map(s => parseFloat(s.weight) || 0)) : 0;
    const histMax = maxWeightEver(ex.name);
    const isNewPR = sel && curMax > histMax && curMax > 0;

    const safeExId = safeId(ex.name);
    return '<div class="exercise-row ' + (sel ? "selected" : "") + '" id="exrow_' + safeExId + '">' +
      '<div class="exercise-row-header" onclick="window._toggleEx(\'' + ex.name + '\',\'' + group + '\')">' +
        '<div class="ex-status-dot ' + statusClass + '"></div>' +
        '<div class="exercise-check ' + (sel ? "checked" : "") + '">' +
          (sel ? '<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') +
        '</div>' +
        '<span class="exercise-name">' + esc(ex.name) + '</span>' +
        (isNewPR ? '<span class="pr-badge new-pr">NEW PR!</span>' : '') +
        (ex.cues?.length
          ? '<button class="form-cues-btn" onclick="event.stopPropagation();window._toggleCues(\'' + safeExId + '\')" title="Form cues">Form</button>'
          : '') +
      '</div>' +
      '<div class="form-cues-inline hidden" id="cues_' + safeExId + '">' +
        (ex.cues || []).map(c =>
          '<div class="form-cue-inline"><span class="cue-dot-sm"></span>' + esc(c) + '</div>'
        ).join("") +
      '</div>' +
      (sel ? setLogger(ex.name, logState.exercises[ex.name]) : '') +
    '</div>';
  }).join("");
}

window._toggleCues = function(safeExName) {
  const el = document.getElementById("cues_" + safeExName);
  if (el) el.classList.toggle("hidden");
};

function exHistoryHTML(exName) {
  const history = allWorkouts
    .filter(w => w.date !== logState.date && w.exercises?.some(e => e.name === exName))
    .slice(0, 5);
  if (!history.length) return '';
  const rows = history.map(w => {
    const ex = w.exercises.find(e => e.name === exName);
    const sets = ex?.sets || [];
    if (!sets.length) return '';
    const d = new Date(w.date + 'T12:00:00');
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const repsArr = sets.map(s => parseInt(s.reps) || 0).filter(r => r > 0);
    const avgReps = repsArr.length ? Math.round(repsArr.reduce((a, b) => a + b, 0) / repsArr.length) : 0;
    const maxW = Math.max(...sets.map(s => parseFloat(s.weight) || 0));
    let summary = sets.length + '×' + avgReps;
    if (maxW > 0) summary += ' @ ' + maxW + ' lbs';
    return '<div class="ex-history-row">' +
      '<span class="ex-history-date">' + esc(dateStr) + '</span>' +
      '<span class="ex-history-summary">' + esc(summary) + '</span>' +
    '</div>';
  }).join('');
  return '<div class="ex-history">' +
    '<div class="ex-history-label">Recent</div>' +
    rows +
  '</div>';
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
    exHistoryHTML(exName) +
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

function refreshExRow(exName, group) {
  const safeExId = safeId(exName);
  const sel  = !!logState.exercises[exName];
  const sets = logState.exercises[exName] || [];
  const setCount = sets.length;
  let statusClass = "";
  if (sel) statusClass = setCount >= 3 ? "done" : "in-progress";
  const curMax = sel ? Math.max(...sets.map(s => parseFloat(s.weight) || 0)) : 0;
  const histMax = maxWeightEver(exName);
  const isNewPR = sel && curMax > histMax && curMax > 0;
  const ex = Object.values(EXERCISES).flat().find(e => e.name === exName);

  const row = document.getElementById("exrow_" + safeExId);
  if (!row) return;
  row.className = "exercise-row " + (sel ? "selected" : "");

  const header = '<div class="exercise-row-header" onclick="window._toggleEx(\'' + exName + '\',\'' + group + '\')">' +
    '<div class="ex-status-dot ' + statusClass + '"></div>' +
    '<div class="exercise-check ' + (sel ? "checked" : "") + '">' +
      (sel ? '<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') +
    '</div>' +
    '<span class="exercise-name">' + esc(exName) + '</span>' +
    (isNewPR ? '<span class="pr-badge new-pr">NEW PR!</span>' : '') +
    (ex?.cues?.length
      ? '<button class="form-cues-btn" onclick="event.stopPropagation();window._toggleCues(\'' + safeExId + '\')" title="Form cues">Form</button>'
      : '') +
  '</div>';

  const cues = '<div class="form-cues-inline hidden" id="cues_' + safeExId + '">' +
    (ex?.cues || []).map(c =>
      '<div class="form-cue-inline"><span class="cue-dot-sm"></span>' + esc(c) + '</div>'
    ).join("") +
  '</div>';

  const tmp = document.createElement("div");
  tmp.innerHTML = header + cues + (sel ? setLogger(exName, logState.exercises[exName]) : "");
  row.replaceChildren(...tmp.childNodes);
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
  const tabsId = sheetOpen ? "#sheet-log-tabs" : "#log-tabs";
  document.querySelectorAll(tabsId + " .muscle-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(tabsId + " .muscle-tab").forEach(t => {
    if (t.textContent.trim().startsWith(group)) t.classList.add("active");
  });
  document.getElementById("log-ex-list").innerHTML = sheetOpen
    ? renderSheetExList(group)
    : renderExList(group);
};

window._toggleEx = function(exName, group) {
  if (logState.exercises[exName]) {
    delete logState.exercises[exName];
  } else {
    logState.exercises[exName] = [{ weight: lastWeightFor(exName), reps: "", muscleGroup: group }];
  }
  syncTimer();
  refreshExRow(exName, group);
  // Update tab count badges and header selected count (same pattern used in _sheetToggleEx)
  const groups = Object.keys(EXERCISES);
  document.querySelectorAll("#log-tabs .muscle-tab").forEach((tab, i) => {
    const g = groups[i];
    const groupCnt = Object.keys(logState.exercises).filter(n =>
      (EXERCISES[g] || []).find(e => e.name === n)
    ).length;
    tab.innerHTML = esc(g) + (groupCnt ? ' <span style="opacity:.7">(' + groupCnt + ')</span>' : '');
  });
  const cnt = Object.keys(logState.exercises).length;
  const countEl = document.getElementById("log-selected-count");
  if (countEl) {
    countEl.style.display = cnt > 0 ? "" : "none";
    countEl.textContent = cnt + ' selected';
  }
};

window._updSet = function(exName, i, field, val) {
  if (logState.exercises[exName]) {
    logState.exercises[exName][i][field] = val;
    saveDraft();
    // Refresh PR badge when weight changes
    if (field === "weight") {
      const safeExId = safeId(exName);
      const sets = logState.exercises[exName];
      const curMax = Math.max(...sets.map(s => parseFloat(s.weight) || 0));
      const histMax = maxWeightEver(exName);
      const isNewPR = curMax > histMax && curMax > 0;
      const row = document.getElementById("exrow_" + safeExId);
      if (row) {
        const existing = row.querySelector(".pr-badge");
        if (isNewPR && !existing) {
          const badge = document.createElement("span");
          badge.className = "pr-badge new-pr";
          badge.textContent = "NEW PR!";
          const header = row.querySelector(".exercise-row-header");
          const formBtn = header?.querySelector(".form-cues-btn");
          if (formBtn) header.insertBefore(badge, formBtn);
          else if (header) header.appendChild(badge);
        } else if (!isNewPR && existing) {
          existing.remove();
        }
      }
    }
  }
};

window._addSet = function(exName) {
  const sets = logState.exercises[exName];
  const prev = sets[sets.length - 1];
  sets.push({ weight: prev.weight, reps: prev.reps, muscleGroup: prev.muscleGroup });
  saveDraft();
  reRenderSetLogger(exName);
};

window._rmSet = function(exName, i) {
  const sets = logState.exercises[exName];
  if (sets.length <= 1) return;
  sets.splice(i, 1);
  saveDraft();
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
  if (btn) { btn.textContent = "Saving…"; btn.disabled = true; }

  // Only timed if logged for today; back-dated entries have no meaningful clock
  const startedAt = timerStartedAt();
  const durationMin = startedAt && logState.date === todayStr()
    ? Math.max(1, Math.round((Date.now() - startedAt) / 60000))
    : null;

  try {
    await saveWorkoutDoc({
      date: logState.date,
      exercises,
      cardio: logState.cardio ? parseInt(logState.cardio) : null,
      notes: logState.notes || "",
      durationMin
    });
    logState = { date: todayStr(), exercises: {}, cardio: "", notes: "" };
    clearTimer();
    localStorage.removeItem(DRAFT_KEY);
    toast("Workout saved!");
    if (sheetOpen) window._closeSheet();
    showView("dashboard");
  } catch (e) {
    console.error(e);
    toast("Error saving — please try again");
    if (btn) { btn.textContent = "Save Workout"; btn.disabled = false; }
  }
};

// ── Progress ─────────────────────────────────────────────────
function renderProgress() {
  const el = document.getElementById("view-progress");
  const names = [...new Set(allWorkouts.flatMap(w => (w.exercises || []).map(e => e.name)))].sort();

  el.innerHTML =
    '<div class="view-header">' +
      '<div>' +
        '<div class="view-eyebrow">Strength</div>' +
        '<h2 class="view-title">Progress</h2>' +
      '</div>' +
    '</div>' +
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
        borderColor: "#E08A45", backgroundColor: "rgba(224,138,69,0.12)",
        borderWidth: 2.5, pointBackgroundColor: "#E08A45",
        pointRadius: 5, pointHoverRadius: 7, tension: 0.35, fill: true }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: "#15171A", borderColor: "#2C3036", borderWidth: 1,
        titleColor: "#F2F1EE", bodyColor: "#B4B7BC", padding: 12 }},
      scales: {
        x: { ticks: { color: "#8B8F96", maxRotation: 40, font: { size: 11 } }, grid: { color: "#1C1F23" } },
        y: { ticks: { color: "#8B8F96" }, grid: { color: "#1C1F23" },
             title: { display: true, text: isBodyweight ? "Reps" : "Max Weight (lbs)", color: "#8B8F96" } }
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
    '<div class="view-header">' +
      '<div>' +
        '<div class="view-eyebrow">Tracking</div>' +
        '<h2 class="view-title">Body Weight</h2>' +
      '</div>' +
    '</div>' +
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
      '<div class="stat-value ' + (delta >= 0 ? "positive" : "negative") + '">' + (delta > 0 ? "+" : "") + delta + '</div>' +
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
        borderColor: "#E08A45", backgroundColor: "rgba(224,138,69,0.12)",
        borderWidth: 2.5, pointBackgroundColor: "#E08A45",
        pointRadius: 4, tension: 0.35, fill: true }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: "#15171A", borderColor: "#2C3036", borderWidth: 1,
        titleColor: "#F2F1EE", bodyColor: "#B4B7BC", padding: 12 }},
      scales: {
        x: { ticks: { color: "#8B8F96", maxRotation: 40, font: { size: 11 } }, grid: { color: "#1C1F23" } },
        y: { ticks: { color: "#8B8F96" }, grid: { color: "#1C1F23" },
             title: { display: true, text: "lbs", color: "#8B8F96" } }
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

// ── Init ─────────────────────────────────────────────────────
window._nav = showView;

async function init() {
  loadDraft();
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
  catch (e) {
    console.error("Firebase load error:", e);
    loadingDiv.remove();
    document.getElementById("view-dashboard").innerHTML =
      '<div class="empty-state"><div class="empty-icon">⚠️</div>' +
      '<div class="empty-title">Could not load your data</div>' +
      '<div class="empty-sub">Firebase access may have expired. Check your Firestore security rules and try refreshing.</div></div>';
    document.querySelectorAll(".nav-btn").forEach(btn =>
      btn.addEventListener("click", () => showView(btn.dataset.view))
    );
    return;
  }

  // Handle Whoop OAuth callback
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
