import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, updateDoc }
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

// Classic philosophers only. The welcome screen and the workout summary each pick one per day.
const QUOTES = [
  { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "First say to yourself what you would be; then do what you have to do.", author: "Epictetus" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult.", author: "Seneca" },
  { text: "No great thing is created suddenly.", author: "Epictetus" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "As long as you live, keep learning how to live.", author: "Seneca" },
  { text: "Difficulties are things that show a person what they are.", author: "Epictetus" },
  { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
  { text: "Confine yourself to the present.", author: "Marcus Aurelius" },
  { text: "It is a disgrace to grow old through sheer carelessness before seeing what manner of man you may become by developing your bodily strength and beauty to their highest limit.", author: "Socrates" }
];

// Background images rotate daily. shift nudges an image up (negative %) so its subject clears the dial.
const STATUES = [
  { src: "images/statue-columns.webp", shift: -14 },
  { src: "images/statue-rope.webp",    shift: 0 },
  { src: "images/statue-stone.webp",   shift: 0 },
  { src: "images/statue-boulder.webp", shift: 0 },
  { src: "images/statue-runner.webp",  shift: 0 }
];

function dayNumber() {
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
function statueOfDay()  { return STATUES[dayNumber() % STATUES.length]; }
function morningQuote() { return QUOTES[dayNumber() % QUOTES.length]; }
// Offset by half the list so the closing quote never matches the morning one
function closingQuote() { return QUOTES[(dayNumber() + Math.floor(QUOTES.length / 2)) % QUOTES.length]; }

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
// Local calendar date (toISOString is UTC, which rolls over to tomorrow on US evenings)
function todayStr() {
  return isoDate(new Date());
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
  const saved = { id: ref.id, ...data };
  allWorkouts.unshift(saved);
  allWorkouts.sort((a, b) => b.date.localeCompare(a.date));
  return saved;
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

// ── Exercise picker sheet ────────────────────────────────────
window._openSheet = function() {
  sheetOpen = true;
  // A fresh workout starts today; an in-progress one keeps its date
  if (!hasWorkInProgress()) logState.date = todayStr();
  document.getElementById("workout-sheet").classList.remove("hidden");
  renderSheetContent();
};

window._closeSheet = function() {
  sheetOpen = false;
  document.getElementById("workout-sheet").classList.add("hidden");
  document.getElementById("sheet-content").innerHTML = "";
};

// Close the picker and go to the Log screen
window._sheetContinue = function() {
  window._closeSheet();
  showView("log");
};

function hasWorkInProgress() {
  return Object.keys(logState.exercises).length > 0 || !!logState.cardio;
}

function sheetFooterLabel() {
  const n = Object.keys(logState.exercises).length;
  if (!hasWorkInProgress()) return "Pick at least one exercise";
  return n ? "Continue · " + n + (n === 1 ? " exercise" : " exercises") : "Continue";
}

function renderSheetContent() {
  const el = document.getElementById("sheet-content");
  const groups = Object.keys(EXERCISES);
  const bikeAdded = !!logState.cardio;

  const scrollHTML =
    '<div class="sheet-header">' +
      '<div>' +
        '<div class="sheet-title">Pick exercises</div>' +
        '<div class="sheet-sub">' + esc(formatDate(logState.date)) + ' <span class="timer-slot">' + timerChipHTML() + '</span></div>' +
      '</div>' +
      '<button class="modal-close" onclick="window._closeSheet()" aria-label="Close">&#x2715;</button>' +
    '</div>' +

    '<div class="muscle-tabs" id="sheet-log-tabs">' +
      groups.map(g => {
        const cnt = Object.keys(logState.exercises).filter(n => (EXERCISES[g] || []).find(e => e.name === n)).length;
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
            '<span class="sheet-bike-name">Bike</span>' +
            '<input type="number" class="input-field cardio-input" min="0" placeholder="0" value="' + esc(String(logState.cardio || "")) + '" onchange="window._setCardio(this.value, false)">' +
            '<span class="cardio-unit">min</span>' +
            '<button class="btn-sheet-remove" onclick="window._setCardio(\'\', true)">Remove</button>' +
          '</div>'
        : '<button class="btn-sheet-add" style="width:100%;padding:10px;display:block;text-align:center" onclick="window._setCardio(\'30\', true)">+ Add Bike</button>') +
    '</div>';

  el.innerHTML =
    '<div class="sheet-scroll">' + scrollHTML + '</div>' +
    '<div class="sheet-footer">' +
      '<button class="btn-primary save-btn" id="sheet-continue" onclick="window._sheetContinue()"' +
        (hasWorkInProgress() ? '' : ' disabled') + '>' + sheetFooterLabel() + '</button>' +
    '</div>';
}

function renderSheetExList(group) {
  return (EXERCISES[group] || []).map(ex => {
    const sel = !!logState.exercises[ex.name];
    return '<div class="sheet-ex-row ' + (sel ? "selected" : "") + '">' +
      '<span class="sheet-ex-name">' + esc(ex.name) + '</span>' +
      '<button class="' + (sel ? "btn-sheet-remove" : "btn-sheet-add") + '" ' +
        'onclick="window._sheetToggleEx(\'' + ex.name + '\',\'' + group + '\')">' +
        (sel ? '✓ Added' : '+ Add') +
      '</button>' +
    '</div>';
  }).join("");
}

window._logTab = function(group) {
  activeLogGroup = group;
  document.querySelectorAll("#sheet-log-tabs .muscle-tab").forEach(t =>
    t.classList.toggle("active", t.textContent.trim().startsWith(group)));
  document.getElementById("log-ex-list").innerHTML = renderSheetExList(group);
};

window._setCardio = function(val, rerender) {
  logState.cardio = val;
  syncTimer();
  if (rerender) renderSheetContent();
};

window._sheetToggleEx = function(exName, group) {
  if (logState.exercises[exName]) {
    delete logState.exercises[exName];
    if (activeEx === exName) activeEx = null;
  } else {
    logState.exercises[exName] = newExerciseSets(exName, group);
  }
  syncTimer();
  document.getElementById("log-ex-list").innerHTML = renderSheetExList(group);
  const groups = Object.keys(EXERCISES);
  document.querySelectorAll("#sheet-log-tabs .muscle-tab").forEach((tab, i) => {
    const g = groups[i];
    const cnt = Object.keys(logState.exercises).filter(n => (EXERCISES[g] || []).find(e => e.name === n)).length;
    tab.innerHTML = esc(g) + (cnt ? ' <span style="opacity:.7">(' + cnt + ')</span>' : '');
  });
  const btn = document.getElementById("sheet-continue");
  if (btn) { btn.textContent = sheetFooterLabel(); btn.disabled = !hasWorkInProgress(); }
};

// ── Log (workout in progress) ────────────────────────────────
let activeEx = null;          // exercise whose set table is open
let finishArmedUntil = 0;     // Finish needs a second tap within 3s

// Most recent earlier session of an exercise, for "Last time" and the Prev column
function lastSessionOf(exName, beforeDate, excludeId) {
  for (const w of allWorkouts) {
    if (w.id === excludeId || w.date > beforeDate) continue;
    const ex = (w.exercises || []).find(e => e.name === exName && e.sets?.length);
    if (ex) return { date: w.date, ex };
  }
  return null;
}

function shortDate(d) {
  const dt = dateFromStr(d);
  const opts = { month: "short", day: "numeric" };
  if (dt.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return dt.toLocaleDateString("en-US", opts);
}

// "155 × 8, 7, 6, 3" when the weight is the same every set, otherwise "155×8, 160×6"
function setsSummary(sets) {
  const ss = sets.filter(s => (parseInt(s.reps) || 0) > 0);
  if (!ss.length) return "—";
  const ws = [...new Set(ss.map(s => parseFloat(s.weight) || 0))];
  if (ws.length === 1) return (ws[0] ? ws[0] + " × " : "") + ss.map(s => parseInt(s.reps)).join(", ") + (ws[0] ? "" : " reps");
  return ss.map(s => (parseFloat(s.weight) || 0) + "×" + parseInt(s.reps)).join(", ");
}

function setCounts(s) { return (parseInt(s.reps) || 0) > 0 || s.done; }

function exerciseComplete(sets) { return sets.length > 0 && sets.every(s => s.done); }

function logDisplayName() {
  return workoutName({ exercises: Object.values(logState.exercises).map(sets => ({ muscleGroup: sets[0]?.muscleGroup })), cardio: logState.cardio });
}

function currentActiveEx() {
  const names = Object.keys(logState.exercises);
  if (activeEx && logState.exercises[activeEx]) return activeEx;
  return names.find(n => !exerciseComplete(logState.exercises[n])) || names[0] || null;
}

function logStatsHTML() {
  let done = 0, total = 0, vol = 0, prs = 0;
  for (const [name, sets] of Object.entries(logState.exercises)) {
    total += sets.length;
    const doneSets = sets.filter(s => s.done);
    done += doneSets.length;
    vol += doneSets.reduce((t, s) => t + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
    if (liftIsPR(name, doneSets)) prs++;
  }
  return '<div class="lstat"><div class="lstat-label">Sets</div><div class="lstat-value">' + done + '<span class="lstat-of">/' + total + '</span></div></div>' +
    '<div class="lstat"><div class="lstat-label">Volume</div><div class="lstat-value">' + Math.round(vol).toLocaleString("en-US") + '</div></div>' +
    '<div class="lstat"><div class="lstat-label">PRs</div><div class="lstat-value accent">' + prs + '</div></div>';
}

// True if these sets beat every earlier session of the exercise
function liftIsPR(name, sets) {
  const top = exTop({ name, sets });
  if (!top) return false;
  const earlier = allWorkouts
    .filter(w => w.date <= logState.date)
    .flatMap(w => (w.exercises || []).filter(e => e.name === name))
    .map(exTop).filter(Boolean);
  if (!earlier.length) return false;
  const best = LOWER_IS_BETTER.has(name) ? Math.min(...earlier) : Math.max(...earlier);
  return isBetter(name, top, best);
}

function renderLog() {
  const el = document.getElementById("view-log");

  if (!hasWorkInProgress()) {
    el.innerHTML =
      '<div class="log-empty">' +
        '<div class="log-empty-title">No workout in progress</div>' +
        '<div class="log-empty-sub">Pick your exercises and the clock starts on the first one.</div>' +
        '<button class="btn-primary save-btn" onclick="window._openSheet()">Start workout</button>' +
      '</div>';
    return;
  }

  const names = Object.keys(logState.exercises);
  const active = currentActiveEx();

  el.innerHTML =
    '<header class="log-head">' +
      '<div class="log-head-main">' +
        '<div class="log-head-name">' + esc(logDisplayName()) + '</div>' +
        '<span class="timer-slot">' + timerChipHTML() + '</span>' +
        '<input type="date" class="log-date-input" id="log-date" value="' + esc(logState.date) + '" aria-label="Workout date">' +
      '</div>' +
      '<button class="finish-btn" id="finish-top" onclick="window._finishWorkout(this)">Finish</button>' +
    '</header>' +

    '<section class="log-stats" id="log-stats">' + logStatsHTML() + '</section>' +

    '<div class="log-exercises">' +
      names.map(n => n === active ? activeCardHTML(n) : compactRowHTML(n)).join("") +
    '</div>' +

    '<button class="add-ex-btn" onclick="window._openSheet()">+ Add exercise</button>' +

    '<div class="cardio-section"><div class="section-title">Cardio</div>' +
      '<div class="cardio-row">' +
        '<span class="cardio-label">Bike</span>' +
        '<input type="number" class="input-field cardio-input" id="log-cardio" min="0" placeholder="0" value="' + esc(logState.cardio) + '">' +
        '<span class="cardio-unit">min</span>' +
      '</div></div>' +

    '<div class="notes-section"><label class="input-label" for="log-notes">Notes</label>' +
      '<textarea class="input-field notes-input" id="log-notes" placeholder="How did it feel?"></textarea>' +
    '</div>' +

    '<button class="btn-primary save-btn" onclick="window._finishWorkout(this)">Finish workout</button>';

  document.getElementById("log-notes").value = logState.notes;
  document.getElementById("log-date").addEventListener("change", e => { logState.date = e.target.value || todayStr(); saveDraft(); });
  document.getElementById("log-cardio").addEventListener("change", e => { logState.cardio = e.target.value; syncTimer(); });
  document.getElementById("log-notes").addEventListener("change", e => { logState.notes = e.target.value; saveDraft(); });
}

function activeCardHTML(name) {
  const sets = logState.exercises[name];
  const id = safeId(name);
  const lib = Object.values(EXERCISES).flat().find(e => e.name === name);
  const last = lastSessionOf(name, logState.date);
  const nextIdx = sets.findIndex(s => !s.done);

  const rows = sets.map((s, i) => {
    const prev = last?.ex.sets[i];
    const prevText = prev ? (parseFloat(prev.weight) || 0) + " × " + (parseInt(prev.reps) || 0) : "—";
    return '<div class="set-row2' + (s.done ? " done" : i === nextIdx ? " next" : "") + '">' +
      '<span class="set-n">' + (i + 1) + '</span>' +
      '<span class="set-prev">' + prevText + '</span>' +
      '<input type="number" inputmode="decimal" class="set-in" aria-label="Weight, set ' + (i + 1) + '" placeholder="—" value="' + esc(s.weight) + '"' +
        ' onchange="window._updSet(\'' + name + '\',' + i + ',\'weight\',this.value)">' +
      '<input type="number" inputmode="numeric" class="set-in" aria-label="Reps, set ' + (i + 1) + '" placeholder="' + (prev ? parseInt(prev.reps) || "—" : "—") + '" value="' + esc(s.reps) + '"' +
        ' onchange="window._updSet(\'' + name + '\',' + i + ',\'reps\',this.value)">' +
      '<button class="set-check' + (s.done ? " on" : "") + '" aria-label="' + (s.done ? "Mark set " + (i + 1) + " not done" : "Complete set " + (i + 1)) + '"' +
        ' onclick="window._toggleSetDone(\'' + name + '\',' + i + ')">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12l5 5 9-10"/></svg>' +
      '</button>' +
    '</div>';
  }).join("");

  return '<section class="ex-card" id="exrow_' + id + '">' +
    '<div class="ex-card-head">' +
      '<div class="ex-card-title">' +
        '<div class="ex-card-name">' + esc(name) + '<span class="pr-slot" id="pr_' + id + '">' + (liftIsPR(name, sets.filter(s => s.done)) ? '<span class="pr-badge new-pr">NEW PR</span>' : '') + '</span></div>' +
        '<div class="ex-card-last">' + (last ? "Last time · " + shortDate(last.date) + " · " + setsSummary(last.ex.sets) : "First time logging this") + '</div>' +
      '</div>' +
      (lib?.cues?.length ? '<button class="form-cues-btn" onclick="window._toggleCues(\'' + id + '\')">Form</button>' : '') +
    '</div>' +
    '<div class="form-cues-inline hidden" id="cues_' + id + '">' +
      (lib?.cues || []).map(c => '<div class="form-cue-inline"><span class="cue-dot-sm"></span>' + esc(c) + '</div>').join("") +
    '</div>' +
    '<div class="set-row2 head"><span>Set</span><span>Prev</span><span>Lbs</span><span>Reps</span><span></span></div>' +
    rows +
    '<div class="ex-card-actions">' +
      '<button class="link-btn" onclick="window._addSet(\'' + name + '\')">+ Add set</button>' +
      (sets.length > 1 ? '<button class="link-btn muted" onclick="window._rmSet(\'' + name + '\',' + (sets.length - 1) + ')">Remove last set</button>' : '') +
      '<button class="link-btn muted" onclick="window._removeEx(\'' + name + '\')">Remove exercise</button>' +
    '</div>' +
    (nextIdx >= 0
      ? '<button class="btn-primary log-set-btn" onclick="window._toggleSetDone(\'' + name + '\',' + nextIdx + ')">Log set ' + (nextIdx + 1) + '</button>'
      : '') +
  '</section>';
}

function compactRowHTML(name) {
  const sets = logState.exercises[name];
  const complete = exerciseComplete(sets);
  const doneCount = sets.filter(s => s.done).length;
  const last = lastSessionOf(name, logState.date);
  const meta = complete
    ? setsSummary(sets)
    : last ? "Last time · " + setsSummary(last.ex.sets) : "First time logging this";
  return '<button class="ex-compact' + (complete ? " complete" : "") + '" onclick="window._setActiveEx(\'' + name + '\')">' +
    '<span class="ex-compact-dot">' + (complete ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12l5 5 9-10"/></svg>' : '') + '</span>' +
    '<span class="ex-compact-main"><span class="ex-compact-name">' + esc(name) + '</span><span class="ex-compact-meta">' + esc(meta) + '</span></span>' +
    '<span class="ex-compact-count">' + doneCount + '/' + sets.length + '</span>' +
  '</button>';
}

window._toggleCues = function(id) {
  const el = document.getElementById("cues_" + id);
  if (el) el.classList.toggle("hidden");
};

window._setActiveEx = function(name) {
  activeEx = name;
  renderLog();
};

// Start with as many sets as last time, at last time's weights; reps are left to fill in
function newExerciseSets(exName, group) {
  const last = lastSessionOf(exName, logState.date);
  if (!last) return [{ weight: "", reps: "", muscleGroup: group, done: false }];
  return last.ex.sets.map(s => ({ weight: String(s.weight ?? ""), reps: "", muscleGroup: group, done: false }));
}

// Typing doesn't re-render (that would steal focus); only the stats strip and PR badge refresh
window._updSet = function(exName, i, field, val) {
  const sets = logState.exercises[exName];
  if (!sets?.[i]) return;
  sets[i][field] = val;
  saveDraft();
  const stats = document.getElementById("log-stats");
  if (stats) stats.innerHTML = logStatsHTML();
  const pr = document.getElementById("pr_" + safeId(exName));
  if (pr) pr.innerHTML = liftIsPR(exName, sets.filter(s => s.done)) ? '<span class="pr-badge new-pr">NEW PR</span>' : '';
};

// Marks a set done (filling reps from last time if left blank) or un-marks it.
// When the exercise is finished, the next unfinished one opens.
window._toggleSetDone = function(exName, i) {
  const sets = logState.exercises[exName];
  if (!sets?.[i]) return;
  const s = sets[i];
  if (!s.done && !(parseInt(s.reps) > 0)) {
    const prev = lastSessionOf(exName, logState.date)?.ex.sets[i] || sets[i - 1];
    if (!(parseInt(prev?.reps) > 0)) { toast("Enter reps for set " + (i + 1) + " first"); return; }
    s.reps = String(parseInt(prev.reps));
  }
  s.done = !s.done;
  if (s.done && exerciseComplete(sets)) {
    const next = Object.keys(logState.exercises).find(n => n !== exName && !exerciseComplete(logState.exercises[n]));
    activeEx = next || exName;
  } else {
    activeEx = exName;
  }
  saveDraft();
  renderLog();
};

window._addSet = function(exName) {
  const sets = logState.exercises[exName];
  const prev = sets[sets.length - 1];
  sets.push({ weight: prev.weight, reps: "", muscleGroup: prev.muscleGroup, done: false });
  activeEx = exName;
  saveDraft();
  renderLog();
};

window._rmSet = function(exName, i) {
  const sets = logState.exercises[exName];
  if (sets.length <= 1) return;
  sets.splice(i, 1);
  saveDraft();
  renderLog();
};

window._removeEx = function(exName) {
  delete logState.exercises[exName];
  if (activeEx === exName) activeEx = null;
  syncTimer();
  renderLog();
};

// ── Finish & save ────────────────────────────────────────────
window._finishWorkout = async function(btn) {
  // Two taps to finish, so a stray tap mid-workout can't end it
  if (Date.now() > finishArmedUntil) {
    finishArmedUntil = Date.now() + 3000;
    const label = btn.textContent;
    btn.textContent = "Tap again to finish";
    btn.classList.add("armed");
    setTimeout(() => { if (btn.isConnected) { btn.textContent = label; btn.classList.remove("armed"); } }, 3000);
    return;
  }
  finishArmedUntil = 0;

  // A set counts if it was ticked or has reps entered
  const exercises = Object.entries(logState.exercises).map(([name, sets]) => {
    const libEx = Object.values(EXERCISES).flat().find(e => e.name === name);
    return {
      name,
      muscleGroup: sets[0]?.muscleGroup || "",
      weighted: libEx ? libEx.weighted : true,
      sets: sets.filter(setCounts).map(s => ({ weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0 }))
    };
  }).filter(e => e.sets.length);

  if (exercises.length === 0 && !logState.cardio) {
    toast("Log at least one set first");
    btn.textContent = "Finish";
    btn.classList.remove("armed");
    return;
  }

  btn.textContent = "Saving…";
  btn.disabled = true;

  // Only timed if logged for today; back-dated entries have no meaningful clock
  const startedAt = timerStartedAt();
  const elapsedMs = startedAt && logState.date === todayStr() ? Date.now() - startedAt : null;
  const durationMin = elapsedMs !== null ? Math.max(1, Math.round(elapsedMs / 60000)) : null;

  try {
    const saved = await saveWorkoutDoc({
      date: logState.date,
      exercises,
      cardio: logState.cardio ? parseInt(logState.cardio) : null,
      notes: logState.notes || "",
      durationMin
    });
    logState = { date: todayStr(), exercises: {}, cardio: "", notes: "" };
    activeEx = null;
    clearTimer();
    localStorage.removeItem(DRAFT_KEY);
    showSummary(saved, elapsedMs);
  } catch (e) {
    console.error(e);
    toast("Error saving — please try again");
    btn.textContent = "Finish";
    btn.disabled = false;
  }
};

// ── Workout summary ──────────────────────────────────────────
let summaryWorkout = null;

function exVolume(ex) {
  return (ex.sets || []).reduce((t, s) => t + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
}
function exReps(ex) {
  return (ex.sets || []).reduce((t, s) => t + (parseInt(s.reps) || 0), 0);
}

// Consecutive Sunday–Saturday weeks with at least one workout, counting back from this week
function weekStreak() {
  const weekOf = ds => { const d = dateFromStr(ds); d.setDate(d.getDate() - d.getDay()); return isoDate(d); };
  const weeks = new Set(allWorkouts.map(w => weekOf(w.date)));
  const cur = dateFromStr(weekOf(todayStr()));
  let n = 0;
  while (weeks.has(isoDate(cur))) { n++; cur.setDate(cur.getDate() - 7); }
  return n;
}

function showSummary(w, elapsedMs) {
  summaryWorkout = w;
  const el = document.getElementById("summary-screen");
  const statue = statueOfDay();
  const quote = closingQuote();

  const rows = w.exercises.map(ex => {
    const prev = lastSessionOf(ex.name, w.date, w.id);
    const vol = exVolume(ex), prevVol = prev ? exVolume(prev.ex) : null;
    return { ex, vol, prevVol, reps: exReps(ex), prevReps: prev ? exReps(prev.ex) : null };
  });
  const compared = rows.filter(r => r.prevVol !== null);
  const vol = rows.reduce((t, r) => t + r.vol, 0);
  const sets = w.exercises.reduce((t, e) => t + e.sets.length, 0);
  const reps = rows.reduce((t, r) => t + r.reps, 0);
  const cmpVol = compared.reduce((t, r) => t + r.vol, 0), cmpPrevVol = compared.reduce((t, r) => t + r.prevVol, 0);
  const cmpReps = compared.reduce((t, r) => t + r.reps, 0), cmpPrevReps = compared.reduce((t, r) => t + r.prevReps, 0);
  const volPct = cmpPrevVol ? Math.round((cmpVol - cmpPrevVol) / cmpPrevVol * 100) : null;
  const repDelta = compared.length ? cmpReps - cmpPrevReps : null;
  const beat = compared.filter(r => r.vol > r.prevVol).length;
  const prs = workoutPRs(w);

  const time = elapsedMs !== null ? formatElapsed(elapsedMs) : w.durationMin ? w.durationMin + "" : "—";
  const delta = (n, suffix) => n === null ? "" :
    '<div class="sum-delta ' + (n >= 0 ? "up" : "down") + '">' + (n >= 0 ? "▲ " : "▼ ") + Math.abs(n) + suffix + '</div>';

  const maxVol = Math.max(1, ...rows.map(r => Math.max(r.vol, r.prevVol || 0)));
  const exRows = rows.map((r, i) =>
    '<div class="sum-ex' + (i >= 3 ? " extra" : "") + '">' +
      '<div class="sum-ex-text"><span class="sum-ex-name">' + esc(r.ex.name) + '</span> <span class="sum-ex-sets">' + esc(setsSummary(r.ex.sets)) + '</span></div>' +
      '<div class="sum-ex-bars">' +
        '<div class="sum-bar today" style="width:' + (r.vol / maxVol * 100).toFixed(1) + '%"></div>' +
        (r.prevVol !== null ? '<div class="sum-bar last" style="width:' + (r.prevVol / maxVol * 100).toFixed(1) + '%"></div>' : '') +
      '</div>' +
      '<div class="sum-ex-delta ' + (r.prevVol === null ? "" : r.vol >= r.prevVol ? "up" : "down") + '">' +
        (r.prevVol === null ? "new" : (r.vol >= r.prevVol ? "+" : "−") + Math.abs(Math.round(r.vol - r.prevVol)).toLocaleString("en-US") + " lbs") +
      '</div>' +
    '</div>').join("");

  const callout = prs.length
    ? "New PR · " + prs.map(esc).join(", ")
    : compared.length ? "Beat it on " + beat + " of " + compared.length : "";

  const week = durationWeek();
  const weekMin = week.reduce((t, d) => t + d.min, 0);
  const weekSessions = (() => {
    const sun = dateFromStr(todayStr()); sun.setDate(sun.getDate() - sun.getDay());
    return allWorkouts.filter(x => x.date >= isoDate(sun) && x.date <= todayStr()).length;
  })();

  el.innerHTML =
    '<img class="sum-img" src="' + statue.src + '" alt="" style="transform:translateY(' + statue.shift + '%)">' +
    '<div class="sum-scrim"></div>' +
    '<blockquote class="sum-quote">' +
      '<p>“' + esc(quote.text) + '”</p>' +
      '<footer>' + esc(quote.author) + '</footer>' +
    '</blockquote>' +
    '<div class="sum-body">' +
      '<header class="sum-head">' +
        '<div><div class="sum-eyebrow">✓ Workout complete</div><div class="sum-name">' + esc(workoutName(w)) + '</div></div>' +
        '<div class="sum-date">' + dateFromStr(w.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + '</div>' +
      '</header>' +
      '<section class="sum-stats">' +
        '<div class="sstat"><div class="sstat-label">Time</div><div class="sstat-value">' + time + '</div><div class="sstat-sub">' + (elapsedMs !== null || w.durationMin ? "min" : "not timed") + '</div></div>' +
        '<div class="sstat"><div class="sstat-label">Volume</div><div class="sstat-value">' + Math.round(vol).toLocaleString("en-US") + '</div>' + (volPct !== null ? delta(volPct, "%") : '<div class="sstat-sub">lbs</div>') + '</div>' +
        '<div class="sstat"><div class="sstat-label">Sets</div><div class="sstat-value">' + sets + '</div><div class="sstat-sub">' + w.exercises.length + (w.exercises.length === 1 ? " exercise" : " exercises") + '</div></div>' +
        '<div class="sstat"><div class="sstat-label">Reps</div><div class="sstat-value">' + reps + '</div>' + (repDelta !== null ? delta(repDelta, "") : '<div class="sstat-sub">total</div>') + '</div>' +
      '</section>' +
      (rows.length
        ? '<section class="sum-exs">' +
            '<div class="sum-exs-head"><span>vs last time</span><span class="sum-callout">' + callout + '</span></div>' +
            exRows +
            (rows.length > 3 ? '<button class="link-btn sum-see-all" onclick="this.parentElement.classList.add(\'show-all\');this.remove()">See all ' + rows.length + '</button>' : '') +
          '</section>'
        : '') +
      '<div class="sum-week"><span class="sum-week-label">This week</span>' +
        '<span><b>' + weekMin + '</b> min · <b>' + weekSessions + '</b> ' + (weekSessions === 1 ? "session" : "sessions") + ' · streak <b class="accent">' + weekStreak() + '</b> wk</span></div>' +
      '<div class="sum-note hidden" id="sum-note">' +
        '<textarea class="input-field notes-input" id="sum-note-text" placeholder="How did it feel?">' + esc(w.notes || "") + '</textarea>' +
        '<button class="btn-secondary" onclick="window._saveSummaryNote(this)">Save note</button>' +
      '</div>' +
      '<div class="sum-actions">' +
        '<button class="sum-note-btn" onclick="document.getElementById(\'sum-note\').classList.toggle(\'hidden\')">' + (w.notes ? "Edit note" : "Add note") + '</button>' +
        '<button class="sum-done" onclick="window._closeSummary()">Done</button>' +
      '</div>' +
    '</div>';

  el.classList.remove("hidden", "leaving");
  document.body.classList.add("no-scroll");
}

window._saveSummaryNote = async function(btn) {
  const text = document.getElementById("sum-note-text").value;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "workouts", summaryWorkout.id), { notes: text });
    summaryWorkout.notes = text;
    toast("Note saved");
    document.getElementById("sum-note").classList.add("hidden");
  } catch (e) {
    console.error(e);
    toast("Couldn't save note — try again");
  }
  btn.disabled = false;
};

window._closeSummary = function() {
  const el = document.getElementById("summary-screen");
  showView("dashboard");
  el.classList.add("leaving");
  setTimeout(() => {
    el.classList.add("hidden");
    el.classList.remove("leaving");
    el.innerHTML = "";
    document.body.classList.remove("no-scroll");
  }, 500);
};

// ── Progress ─────────────────────────────────────────────────
const PROGRESS_RANGES = { "3M": 3, "6M": 6, "1Y": 12, "All": null };
let progressRange = "All";

// One point per session of an exercise, oldest first. Bodyweight lifts (no weight logged) track reps instead.
function exerciseSessions(name) {
  const sessions = [...allWorkouts].reverse()
    .flatMap(w => (w.exercises || []).filter(e => e.name === name && e.sets?.length).map(ex => ({ date: w.date, ex })));
  const byReps = sessions.every(s => !exTop(s.ex));
  return {
    byReps,
    points: sessions.map(({ date, ex }) => {
      const top = byReps ? Math.max(...ex.sets.map(s => parseInt(s.reps) || 0)) : exTop(ex);
      const topReps = byReps ? top : Math.max(0, ...ex.sets.filter(s => (parseFloat(s.weight) || 0) === top).map(s => parseInt(s.reps) || 0));
      return { date, ex, top, topReps, vol: exVolume(ex) };
    })
  };
}

function progressExerciseNames() {
  const counts = {};
  allWorkouts.forEach(w => (w.exercises || []).forEach(e => { counts[e.name] = (counts[e.name] || 0) + 1; }));
  return counts;
}

function monthYear(d) {
  return dateFromStr(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function renderProgress() {
  const el = document.getElementById("view-progress");
  const counts = progressExerciseNames();
  const names = Object.keys(counts);

  if (!names.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-title">No data yet</div>' +
      '<div class="empty-sub">Log a few workouts to see your strength charts</div></div>';
    return;
  }

  let name = localStorage.getItem("progress_ex");
  if (!counts[name]) name = names.sort((a, b) => counts[b] - counts[a])[0];

  const lib = Object.entries(EXERCISES).find(([, list]) => list.some(e => e.name === name));
  const group = lib ? lib[0] : (allWorkouts.flatMap(w => w.exercises || []).find(e => e.name === name)?.muscleGroup || "");
  const lower = LOWER_IS_BETTER.has(name);
  const { byReps, points: all } = exerciseSessions(name);

  const months = PROGRESS_RANGES[progressRange];
  let points = all;
  if (months) {
    const cut = dateFromStr(todayStr());
    cut.setMonth(cut.getMonth() - months);
    points = all.filter(p => p.date >= isoDate(cut));
  }

  // Exercise picker: a real <select> laid over the pill, grouped by muscle
  const byGroup = {};
  names.forEach(n => {
    const g = Object.entries(EXERCISES).find(([, list]) => list.some(e => e.name === n))?.[0] || "Other";
    (byGroup[g] = byGroup[g] || []).push(n);
  });
  const options = Object.keys(byGroup).sort().map(g =>
    '<optgroup label="' + esc(g) + '">' +
      byGroup[g].sort().map(n => '<option value="' + esc(n) + '"' + (n === name ? " selected" : "") + '>' + esc(n) + '</option>').join("") +
    '</optgroup>').join("");

  const unit = byReps ? "reps" : "lbs";
  const latest = all[all.length - 1];
  const best = lower ? Math.min(...all.map(p => p.top)) : Math.max(...all.map(p => p.top));

  let headline;
  if (points.length) {
    const first = points[0], last = points[points.length - 1];
    const diff = last.top - first.top;
    const improved = lower ? diff < 0 : diff > 0;
    const deltaText = diff === 0 ? "no change" : (diff > 0 ? "▲ " : "▼ ") + Math.abs(diff) + " " + unit + (lower ? " assistance" : "");
    headline =
      '<div class="prog-eyebrow">Latest top set · ' + shortDate(last.date) + '</div>' +
      '<div class="prog-headline">' +
        '<span class="prog-big">' + last.top + '</span>' +
        '<span class="prog-unit">' + (byReps ? "reps" : "lbs × " + last.topReps) + '</span>' +
        '<span class="prog-delta' + (improved ? " up" : "") + '">' + deltaText + '</span>' +
      '</div>' +
      '<div class="prog-since">since ' + monthYear(first.date) + (lower ? " · lower is better" : "") + '</div>';
  } else {
    headline = '<div class="prog-eyebrow">No sessions in this range</div>' +
      '<div class="prog-since">Last logged ' + shortDate(latest.date) + '</div>';
  }

  // Estimated one-rep max (Epley) only makes sense for normal weighted lifts
  const e1rm = !byReps && !lower && latest.topReps > 0 && latest.topReps <= 12
    ? Math.round(latest.top * (1 + latest.topReps / 30)) : null;
  const bestVol = points.length ? Math.max(...points.map(p => p.vol)) : 0;

  el.innerHTML =
    '<header class="prog-head">' +
      '<div class="prog-title">' +
        '<div class="prog-group">' + esc(group) + '</div>' +
        '<h2 class="prog-name">' + esc(name) + '</h2>' +
      '</div>' +
      '<label class="ex-picker">Change' +
        '<select aria-label="Choose exercise" onchange="window._progressPick(this.value)">' + options + '</select>' +
      '</label>' +
    '</header>' +

    '<div class="range-seg" role="group" aria-label="Time range">' +
      Object.keys(PROGRESS_RANGES).map(r =>
        '<button class="' + (r === progressRange ? "on" : "") + '" aria-pressed="' + (r === progressRange) + '" onclick="window._progressRange(\'' + r + '\')">' + r + '</button>'
      ).join("") +
    '</div>' +

    '<section class="prog-top">' + headline + '</section>' +

    (points.length > 1 ? '<div class="prog-chart"><canvas id="prog-chart" aria-label="' + esc(name) + ' top set over time" role="img"></canvas></div>' : '') +

    '<section class="prog-stats">' +
      '<div class="pstat"><div class="pstat-label">Est. 1RM</div><div class="pstat-value">' + (e1rm ?? "—") + '</div></div>' +
      '<div class="pstat"><div class="pstat-label">Sessions</div><div class="pstat-value">' + points.length + '</div></div>' +
      '<div class="pstat"><div class="pstat-label">Best vol</div><div class="pstat-value">' + (bestVol ? Math.round(bestVol).toLocaleString("en-US") : "—") + '</div></div>' +
      '<div class="pstat"><div class="pstat-label">Best</div><div class="pstat-value accent">' + best + '</div></div>' +
    '</section>' +

    '<section class="prog-history">' +
      '<div class="today-section-head">History</div>' +
      all.slice(-5).reverse().map(p =>
        '<div class="hist-row">' +
          '<span class="hist-date">' + shortDate(p.date) + '</span>' +
          '<span class="hist-sets">' + esc(setsSummary(p.ex.sets)) + '</span>' +
          '<span class="hist-vol">' + (p.vol ? Math.round(p.vol).toLocaleString("en-US") : "—") + '</span>' +
        '</div>').join("") +
    '</section>';

  if (points.length > 1) drawProgressChart(points, lower, unit);
}

function drawProgressChart(points, lower, unit) {
  const canvas = document.getElementById("prog-chart");
  if (!canvas || !window.Chart) return;
  if (progressChart) progressChart.destroy();
  Chart.defaults.font.family = "'IBM Plex Sans', system-ui, sans-serif";

  const ctx = canvas.getContext("2d");
  const fill = ctx.createLinearGradient(0, 0, 0, 180);
  fill.addColorStop(0, "rgba(224,138,69,0.22)");
  fill.addColorStop(1, "rgba(224,138,69,0)");
  const spansYears = points[0].date.slice(0, 4) !== points[points.length - 1].date.slice(0, 4);
  const last = points.length - 1;

  progressChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: points.map(p => dateFromStr(p.date).toLocaleDateString("en-US",
        spansYears ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" })),
      datasets: [{
        data: points.map(p => p.top),
        borderColor: "#E08A45", backgroundColor: fill,
        fill: "start",
        borderWidth: 2.25, tension: 0.3,
        pointRadius: points.map((_, i) => i === last ? 5 : 0),
        pointHoverRadius: 5,
        pointBackgroundColor: "#0B0C0E", pointBorderColor: "#E08A45", pointBorderWidth: 2.5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#15171A", borderColor: "#2C3036", borderWidth: 1,
          titleColor: "#F2F1EE", bodyColor: "#B4B7BC", padding: 10, displayColors: false,
          callbacks: { label: c => c.parsed.y + " " + unit }
        }
      },
      scales: {
        x: { ticks: { color: "#8B8F96", maxTicksLimit: 4, maxRotation: 0, font: { size: 10 } }, grid: { display: false }, border: { display: false } },
        // Lower-is-better lifts are flipped so the line still rises as you improve
        y: { position: "right", reverse: lower, ticks: { color: "#8B8F96", maxTicksLimit: 4, font: { size: 10 } }, grid: { color: "#1C1F23" }, border: { display: false } }
      }
    }
  });
}

window._progressPick = function(name) {
  localStorage.setItem("progress_ex", name);
  renderProgress();
};

window._progressRange = function(r) {
  progressRange = r;
  renderProgress();
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
