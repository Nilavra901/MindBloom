'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════

function applyThemeUI() {
  document.getElementById('app').classList.toggle('dk', isDark);
  var lbl = isDark ? '☀️ Light' : '🌙 Dark';
  ['theme-btn','land-theme-btn'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = lbl;
  });
  var chk = document.getElementById('dk-chk');
  if (chk) chk.checked = isDark;
}

function togTheme() {
  isDark = !isDark;
  applyThemeUI();
  renderCharts();
  if (currentEmail && userDB[currentEmail]) {
    userDB[currentEmail].theme = isDark ? 'dark' : 'light';
    saveDB();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD INIT
// ═══════════════════════════════════════════════════════════════════════════

function initDash() {
  var usrEl = document.getElementById('s-usr');
  if (usrEl) usrEl.textContent = userName || 'You';

  // Start live clock
  if (_clockTimer) clearInterval(_clockTimer);
  updateClock();
  _clockTimer = setInterval(updateClock, 1000);

  // Emergency number
  var emgDisp = document.getElementById('emg-display-num');
  if (emgDisp) emgDisp.textContent = emgNumber || 'Not set — tap Change to add';
  var emgInp = document.getElementById('emg-setting');
  if (emgInp) emgInp.value = emgNumber || '';

  // Reset composer
  var ta = document.getElementById('jtxt');
  if (ta) ta.value = '';
  var mr = document.getElementById('mresult');
  if (mr) mr.style.display = 'none';
  var tc = document.getElementById('tip-card');
  if (tc) tc.style.display = 'none';
  var vs = document.getElementById('vstrip');
  if (vs) vs.style.display = 'none';

  updateInsights();
  renderCharts();
  checkCritical(undefined);
  renderEntryList();
  populateProfileCard();
}

function dtab(el, t) {
  document.querySelectorAll('.sit').forEach(function(b) { b.classList.remove('act'); });
  if (el) el.classList.add('act');
  ['home','insights','entries','emotion','settings'].forEach(function(x) {
    var panel = document.getElementById('dt-' + x);
    if (panel) panel.style.display = (x === t) ? 'block' : 'none';
  });
  if (t === 'insights') renderCharts();
  if (t === 'entries')  { renderEntryList(); filterEntries(); }
  if (t === 'settings') {
    var emgDisp = document.getElementById('emg-display-num');
    if (emgDisp) emgDisp.textContent = emgNumber || 'Not set';
    var emgInp = document.getElementById('emg-setting');
    if (emgInp) emgInp.value = emgNumber || '';
    populateProfileCard();
  }
  // Stop camera if navigating away from emotion tab
  if (t !== 'emotion') stopEmotionCam();
}

// ═══════════════════════════════════════════════════════════════════════════