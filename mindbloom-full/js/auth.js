'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════

function applyAuthMode() {
  var up = isSignUp;
  document.getElementById('atit').textContent    = up ? 'Create your account' : 'Welcome back';
  document.getElementById('a-sub').textContent   = up ? 'Join MindBloom — it is free' : 'Sign in to continue your journey';
  document.getElementById('a-btn').textContent   = up ? 'Create account' : 'Sign in';
  document.getElementById('a-sw-txt').textContent= up ? 'Already have an account?' : 'New here?';
  document.getElementById('a-sw-lnk').textContent= up ? 'Sign in' : 'Create account';
  document.getElementById('a-name-f').style.display = up ? 'block' : 'none';
  document.getElementById('a-emg-f').style.display  = up ? 'block' : 'none';
  var forgotRow = document.getElementById('a-forgot-row');
  if (forgotRow) forgotRow.style.display = up ? 'none' : 'block';
  var err = document.getElementById('aerr');
  if (err) err.style.display = 'none';
}

function togAuth() {
  isSignUp = !isSignUp;
  applyAuthMode();
  // Clear all fields when switching
  ['a-em','a-pw','a-nm','a-emg'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function showAuthErr(msg) {
  var err = document.getElementById('aerr');
  if (!err) return;
  err.textContent    = msg;
  err.style.display  = 'block';
  var card = document.querySelector('.acard');
  if (card) {
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = 'shake .35s ease';
  }
}

function hideAuthErr() {
  var err = document.getElementById('aerr');
  if (err) err.style.display = 'none';
}

function highlightField(id, isError) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = isError ? '#c0392b' : 'var(--bdr)';
  if (isError) {
    el.focus();
    setTimeout(function() { el.style.borderColor = 'var(--bdr)'; }, 2000);
  }
}

function doAuth() {
  hideAuthErr();

  var em = document.getElementById('a-em').value.trim().toLowerCase();
  var pw = document.getElementById('a-pw').value;

  // ── Field validation ────────────────────────────────────────────────────
  if (!em) {
    showAuthErr('Please enter your email address.');
    highlightField('a-em', true);
    return;
  }
  if (!isValidEmail(em)) {
    showAuthErr('Please enter a valid email address (e.g. name@example.com).');
    highlightField('a-em', true);
    return;
  }
  if (!pw) {
    showAuthErr('Please enter your password.');
    highlightField('a-pw', true);
    return;
  }
  if (pw.length < 6) {
    showAuthErr('Password must be at least 6 characters long.');
    highlightField('a-pw', true);
    return;
  }

  if (isSignUp) {
    // ── SIGN UP ────────────────────────────────────────────────────────────
    var nm  = document.getElementById('a-nm').value.trim();
    var emg = document.getElementById('a-emg').value.trim();

    if (!nm) {
      showAuthErr('Please enter your display name.');
      highlightField('a-nm', true);
      return;
    }

    if (userDB[em]) {
      showAuthErr('An account with this email already exists. Please sign in.');
      highlightField('a-em', true);
      return;
    }

    // ── Create new user record ────────────────────────────────────────────
    var uid  = makeUUID();
    var now  = new Date().toISOString();
    userDB[em] = {
      id:           uid,
      email:        em,
      hash:         hashPw(pw),
      name:         nm,
      emg:          emg || '',
      theme:        'light',
      createdAt:    now,
      lastLogin:    now,
      entries:      [],
      sessionToken: ''
    };
    saveDB();

    // ── Load into session ─────────────────────────────────────────────────
    currentEmail = em;
    userName     = nm;
    emgNumber    = emg || '';
    isDark       = false;
    entries      = [];
    saveSession(em);
    goToDash();

  } else {
    // ── SIGN IN ────────────────────────────────────────────────────────────
    var user = userDB[em];

    if (!user) {
      showAuthErr('No account found with that email. Please create one.');
      highlightField('a-em', true);
      return;
    }

    if (user.hash !== hashPw(pw)) {
      showAuthErr('Incorrect password. Please try again.');
      highlightField('a-pw', true);
      return;
    }

    // ── Restore full profile ──────────────────────────────────────────────
    user.lastLogin = new Date().toISOString();
    saveDB();

    currentEmail = em;
    userName     = user.name;
    emgNumber    = user.emg || '';
    isDark       = (user.theme === 'dark');
    entries      = user.entries ? user.entries.map(function(e) { return Object.assign({}, e); }) : [];

    applyThemeUI();
    saveSession(em);
    goToDash();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD / VERIFICATION / RESET
// ═══════════════════════════════════════════════════════════════════════════

var _fpEmail      = '';   // email being recovered
var _fpCode       = '';   // generated OTP
var _fpCodeExpiry = 0;    // timestamp when code expires (10 min)
var _fpResendTimer = null;

function showForgot() {
  // Hide auth, show forgot screen
  ['s-land','s-auth','s-dash'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.classList.remove('on');
  });
  var el = document.getElementById('s-forgot'); if (el) el.classList.add('on');
  // Reset to step 1
  document.getElementById('fp-step1').style.display = 'block';
  document.getElementById('fp-step2').style.display = 'none';
  document.getElementById('fp-step3').style.display = 'none';
  var err = document.getElementById('fp-err'); if (err) err.style.display = 'none';
  var inp = document.getElementById('fp-em'); if (inp) { inp.value = ''; inp.focus(); }
}

function cancelForgot() {
  var el = document.getElementById('s-forgot'); if (el) el.classList.remove('on');
  var auth = document.getElementById('s-auth'); if (auth) auth.classList.add('on');
  isSignUp = false;
  applyAuthMode();
  if (_fpResendTimer) { clearInterval(_fpResendTimer); _fpResendTimer = null; }
}

function fpShowErr(step, msg) {
  var id = step === 1 ? 'fp-err' : step === 2 ? 'fp-err2' : 'fp-err3';
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent   = msg;
  el.style.display = 'block';
}

function fpHideErr(step) {
  var id = step === 1 ? 'fp-err' : step === 2 ? 'fp-err2' : 'fp-err3';
  var el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function generateOTP() {
  // 6-digit numeric code
  return String(Math.floor(100000 + Math.random() * 900000));
}

function startResendCountdown() {
  var link = document.getElementById('fp-resend-link');
  if (!link) return;
  var secs = 60;
  link.style.pointerEvents = 'none';
  link.style.opacity = '0.4';
  if (_fpResendTimer) clearInterval(_fpResendTimer);
  _fpResendTimer = setInterval(function() {
    secs--;
    link.textContent = 'Resend (' + secs + 's)';
    if (secs <= 0) {
      clearInterval(_fpResendTimer);
      _fpResendTimer = null;
      link.textContent = 'Resend code';
      link.style.pointerEvents = '';
      link.style.opacity = '';
    }
  }, 1000);
}

function sendVerification() {
  fpHideErr(1);
  var em = document.getElementById('fp-em').value.trim().toLowerCase();
  if (!em) { fpShowErr(1, 'Please enter your email address.'); return; }
  if (!isValidEmail(em)) { fpShowErr(1, 'Please enter a valid email address.'); return; }

  var user = userDB[em];
  if (!user) {
    fpShowErr(1, 'No account found with that email. Check for typos or create a new account.');
    return;
  }

  // Generate and "send" OTP
  _fpEmail      = em;
  _fpCode       = generateOTP();
  _fpCodeExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  // In a real app this would be emailed — here we show it in a styled banner
  // because this is a local/offline app with no email server
  document.getElementById('fp-step1').style.display = 'none';
  document.getElementById('fp-step2').style.display = 'block';

  // Show OTP visually (simulated email)
  var sub = document.getElementById('fp-code-sub');
  var masked = em.replace(/(.{2}).+(@.+)/, '$1•••$2');
  sub.innerHTML =
    'A verification code has been sent to <strong>' + masked + '</strong>.' +
    '<div class="otp-demo" style="margin-top:12px">' +
      '<div class="otp-label">📧 Your MindBloom verification code</div>' +
      '<div class="otp-num">' + _fpCode + '</div>' +
      '<div class="otp-note">Valid for 10 minutes · Do not share this code</div>' +
    '</div>';

  var codeInp = document.getElementById('fp-code');
  if (codeInp) { codeInp.value = ''; codeInp.focus(); }
  fpHideErr(2);
  startResendCountdown();
}

function resendCode() {
  _fpCode       = generateOTP();
  _fpCodeExpiry = Date.now() + 10 * 60 * 1000;
  var masked    = _fpEmail.replace(/(.{2}).+(@.+)/, '$1•••$2');
  var sub       = document.getElementById('fp-code-sub');
  sub.innerHTML =
    'A new code has been sent to <strong>' + masked + '</strong>.' +
    '<div class="otp-demo" style="margin-top:12px">' +
      '<div class="otp-label">📧 Your new MindBloom verification code</div>' +
      '<div class="otp-num">' + _fpCode + '</div>' +
      '<div class="otp-note">Valid for 10 minutes · Do not share this code</div>' +
    '</div>';
  var codeInp = document.getElementById('fp-code');
  if (codeInp) { codeInp.value = ''; codeInp.focus(); }
  fpHideErr(2);
  startResendCountdown();
}

function verifyCode() {
  fpHideErr(2);
  var entered = document.getElementById('fp-code').value.trim();
  if (!entered) { fpShowErr(2, 'Please enter the 6-digit verification code.'); return; }
  if (entered.length !== 6 || !/^\d{6}$/.test(entered)) {
    fpShowErr(2, 'The code must be exactly 6 digits.'); return;
  }
  if (Date.now() > _fpCodeExpiry) {
    fpShowErr(2, 'This code has expired. Please request a new one.'); return;
  }
  if (entered !== _fpCode) {
    fpShowErr(2, 'Incorrect code. Please check and try again.'); return;
  }
  // Code verified — move to step 3
  if (_fpResendTimer) { clearInterval(_fpResendTimer); _fpResendTimer = null; }
  document.getElementById('fp-step2').style.display = 'none';
  document.getElementById('fp-step3').style.display = 'block';
  var p1 = document.getElementById('fp-pw1'); if (p1) { p1.value = ''; p1.focus(); }
  var p2 = document.getElementById('fp-pw2'); if (p2) p2.value = '';
  fpHideErr(3);
}

function resetPassword() {
  fpHideErr(3);
  var pw1 = document.getElementById('fp-pw1').value;
  var pw2 = document.getElementById('fp-pw2').value;
  if (!pw1) { fpShowErr(3, 'Please enter a new password.'); return; }
  if (pw1.length < 6) { fpShowErr(3, 'Password must be at least 6 characters long.'); return; }
  if (pw1 !== pw2) { fpShowErr(3, 'Passwords do not match. Please re-enter.'); return; }

  // Update hash in DB
  var user = userDB[_fpEmail];
  if (!user) { fpShowErr(3, 'Account not found. Please restart the recovery.'); return; }
  user.hash      = hashPw(pw1);
  user.lastLogin = new Date().toISOString();
  saveDB();

  // Auto sign-in
  currentEmail = _fpEmail;
  userName     = user.name;
  emgNumber    = user.emg || '';
  isDark       = (user.theme === 'dark');
  entries      = user.entries ? user.entries.map(function(e) { return Object.assign({}, e); }) : [];
  _fpEmail = ''; _fpCode = '';
  applyThemeUI();
  saveSession(currentEmail);

  var el = document.getElementById('s-forgot'); if (el) el.classList.remove('on');
  goToDash();
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTING
// ═══════════════════════════════════════════════════════════════════════════

function go(screen, signup) {
  ['s-land','s-auth','s-dash','s-forgot'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('on');
  });
  var nav = document.getElementById('main-nav');

  if (screen === 'land') {
    document.getElementById('s-land').classList.add('on');
    if (nav) nav.style.display = 'none';

  } else if (screen === 'auth') {
    if (signup !== undefined) {
      isSignUp = !!signup;
      applyAuthMode();
    }
    document.getElementById('s-auth').classList.add('on');
    if (nav) nav.style.display = 'none';

  } else if (screen === 'dash' || screen === 'dash-direct') {
    goToDash();
  }
}

function goToDash() {
  ['s-land','s-auth','s-dash'].forEach(function(id) {
    document.getElementById(id).classList.remove('on');
  });
  document.getElementById('s-dash').classList.add('on');
  var nav = document.getElementById('main-nav');
  if (nav) nav.style.display = 'flex';
  // Reset to home tab
  dtab(document.getElementById('nt-home'), 'home');
  initDash();
}

function doSignOut() {
  persistUser();
  clearSession();
  if (_clockTimer) { clearInterval(_clockTimer); _clockTimer = null; }
  // Reset all state
  currentEmail = '';
  userName     = '';
  emgNumber    = '';
  entries      = [];
  isDark       = false;
  isRec        = false;
  applyThemeUI();
  go('land');
}
