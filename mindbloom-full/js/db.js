'use strict';


'use strict';

// ════════════════════════════════════════════════════════════════════════════
// MindBloom — Local Database Engine
// Everything defined in dependency order so nothing is called before defined.
// Storage: localStorage (survives tab close, reload, browser restart)
// ════════════════════════════════════════════════════════════════════════════

// ── Storage keys ─────────────────────────────────────────────────────────────
var DB_KEY      = 'mb_db_v3';
var SESSION_KEY = 'mb_sess_v3';

// ── FNV-1a password hash (fast, deterministic, no deps) ──────────────────────
function hashPw(pw) {
  var h = 0x811c9dc5;
  for (var i = 0; i < pw.length; i++) {
    h ^= pw.charCodeAt(i);
    h  = (Math.imul(h, 0x01000193)) >>> 0;
  }
  return h.toString(16);
}

// ── UUID v4 ──────────────────────────────────────────────────────────────────
function makeUUID() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = (c === 'x') ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Email validator ───────────────────────────────────────────────────────────
function isValidEmail(em) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em);
}

// ── Format ISO date for display ───────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return 'Never';
  try {
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })
      + '  ' + d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
  } catch(e) { return iso; }
}

// ── Load/save entire DB ───────────────────────────────────────────────────────
function loadDB() {
  try {
    var raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function saveDB() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(userDB));
  } catch(e) {
    console.warn('MindBloom saveDB failed:', e);
  }
}

// ── Session helpers ───────────────────────────────────────────────────────────
// Session = { email, token, ts } stored in localStorage
// token = hashPw(email + ":" + userId) — ties session to this specific account
// Valid for 30 days

function saveSession(email) {
  var user  = userDB[email];
  if (!user) return;
  var token = hashPw(email + ':' + user.id + ':' + Date.now());
  user.sessionToken = token;
  saveDB();
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      email: email,
      token: token,
      ts:    Date.now()
    }));
  } catch(e) {}
}

function loadSession() {
  try {
    var raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    var s = JSON.parse(raw);
    if (!s || !s.email || !s.token) return null;
    if (Date.now() - s.ts > 30 * 24 * 60 * 60 * 1000) {
      clearSession();
      return null;
    }
    return s;
  } catch(e) { return null; }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
}

// ── Runtime state ─────────────────────────────────────────────────────────────
var userDB        = loadDB();    // all user records keyed by email
var isDark        = false;
var isSignUp      = false;
var isRec         = false;
var currentEmail  = '';
var userName      = '';
var emgNumber     = '';
var entries       = [];          // current user's journal entries

var _clockTimer   = null;
var _recognition  = null;
var _voiceText    = '';
var _recSec       = 0;
var _recTick      = null;
var _mediaRec     = null;
var _mediaStream  = null;

// ── Persist current user's full profile back to DB ────────────────────────────
function persistUser() {
  if (!currentEmail || !userDB[currentEmail]) return;
  var u = userDB[currentEmail];
  u.entries   = entries;
  u.emg       = emgNumber;
  u.theme     = isDark ? 'dark' : 'light';
  u.name      = userName;
  saveDB();
}
