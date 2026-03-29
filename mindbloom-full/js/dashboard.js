'use strict';

// LIVE CLOCK
// ═══════════════════════════════════════════════════════════════════════════

function updateClock() {
  var now = new Date();
  var h   = now.getHours();
  var greeting, icon;
  if      (h >= 5  && h < 12) { greeting = 'Good morning';   icon = '🌅'; }
  else if (h >= 12 && h < 17) { greeting = 'Good afternoon'; icon = '☀️'; }
  else if (h >= 17 && h < 21) { greeting = 'Good evening';   icon = '🌆'; }
  else                         { greeting = 'Good night';     icon = '🌙'; }

  var greetEl = document.getElementById('greet-el');
  if (greetEl) greetEl.textContent = greeting + ', ' + (userName || 'there') + ' ' + icon;

  var days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var dateEl = document.getElementById('date-text');
  if (dateEl) dateEl.textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();

  var hh    = now.getHours();
  var mm    = String(now.getMinutes()).padStart(2,'0');
  var ss    = String(now.getSeconds()).padStart(2,'0');
  var ampm  = hh >= 12 ? 'PM' : 'AM';
  var h12   = hh % 12 || 12;
  var clkEl = document.getElementById('clock-el');
  if (clkEl) clkEl.textContent = h12 + ':' + mm + ':' + ss + ' ' + ampm;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE CARD IN SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

function populateProfileCard() {
  if (!currentEmail || !userDB[currentEmail]) return;
  var u = userDB[currentEmail];
  var set = function(id, val) { var el=document.getElementById(id); if(el) el.textContent = val||'—'; };
  set('prof-id',    u.id);
  set('prof-email', currentEmail);
  set('prof-since', fmtDate(u.createdAt));
  set('prof-login', fmtDate(u.lastLogin));
  var nameInp = document.getElementById('prof-name-inp');
  if (nameInp) nameInp.value = userName;
}

function saveDisplayName() {
  var inp = document.getElementById('prof-name-inp');
  var ok  = document.getElementById('prof-name-ok');
  if (!inp) return;
  var v = inp.value.trim();
  if (!v) return;
  userName = v;
  if (currentEmail && userDB[currentEmail]) userDB[currentEmail].name = v;
  persistUser();
  var usrEl = document.getElementById('s-usr');
  if (usrEl) usrEl.textContent = v;
  updateClock();
  if (ok) {
    ok.style.display = 'inline';
    setTimeout(function() { ok.style.display = 'none'; }, 1800);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EMERGENCY CONTACT
// ═══════════════════════════════════════════════════════════════════════════

function startEditEmg() {
  document.getElementById('emg-edit-row').style.display = 'flex';
  document.getElementById('emg-display-row').style.display = 'none';
  var inp = document.getElementById('emg-setting');
  if (inp) { inp.value = emgNumber || ''; inp.focus(); }
}

function cancelEditEmg() {
  document.getElementById('emg-edit-row').style.display = 'none';
  document.getElementById('emg-display-row').style.display = 'flex';
  clearEmgFeedback();
}

function clearEmgFeedback() {
  var fb = document.getElementById('emg-feedback');
  if (fb) fb.textContent = '';
}

function saveEmg() {
  var inp = document.getElementById('emg-setting');
  var fb  = document.getElementById('emg-feedback');
  var v   = inp ? inp.value.trim() : '';
  var digits = v.replace(/\D/g, '');
  if (digits.length < 7) {
    if (fb) { fb.style.color = '#c0392b'; fb.textContent = 'Please enter a valid phone number (at least 7 digits).'; }
    return;
  }
  emgNumber = v;
  var disp = document.getElementById('emg-display-num');
  if (disp) disp.textContent = v;
  if (fb) { fb.style.color = 'var(--s)'; fb.textContent = 'Saved!'; }
  persistUser();
  checkCritical(undefined);
  setTimeout(cancelEditEmg, 900);
}

// ═══════════════════════════════════════════════════════════════════════════
// VOICE RECORDING
// ═══════════════════════════════════════════════════════════════════════════

function togRec() {
  if (!isRec) { startRec(); } else { stopRec(); }
}

function startRec() {
  var btn   = document.getElementById('mic-btn');
  var dot   = document.getElementById('rec-dot');
  var strip = document.getElementById('vstrip');

  strip.style.display    = 'block';
  strip.style.background = 'var(--dw)';
  strip.innerHTML        = '🎙&nbsp;Requesting microphone permission…';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    strip.style.background = 'rgba(192,57,43,.1)';
    strip.innerHTML = '⚠️ Your browser does not support audio recording. Please type your entry above.';
    return;
  }

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(function(stream) {
      isRec      = true;
      _voiceText = '';
      _recSec    = 0;
      _mediaStream = stream;
      btn.classList.add('rec');
      if (dot) dot.style.display = 'block';
      strip.style.background = 'var(--dw)';
      strip.innerHTML = '<span style="color:#c0392b;font-size:16px">●</span>&nbsp;<strong>Listening…</strong> speak clearly';

      _recTick = setInterval(function() {
        _recSec++;
        var preview = _voiceText.trim();
        if (preview) {
          strip.innerHTML = '<span style="color:#c0392b">●</span>&nbsp;' + _recSec + 's — <em>"' + preview.slice(0,100) + (preview.length>100?'…':'') + '"</em>';
        } else {
          strip.innerHTML = '<span style="color:#c0392b">●</span>&nbsp;' + _recSec + 's — speak now…';
        }
      }, 1000);

      // Try SpeechRecognition for live transcript
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        _recognition = new SR();
        _recognition.continuous     = true;
        _recognition.interimResults = true;
        _recognition.lang           = navigator.language || 'en-US';
        _recognition.onresult = function(ev) {
          var finals='', interim='';
          for (var i=ev.resultIndex; i<ev.results.length; i++) {
            if (ev.results[i].isFinal) finals += ev.results[i][0].transcript + ' ';
            else interim += ev.results[i][0].transcript;
          }
          if (finals) _voiceText += finals;
          var live = (_voiceText + interim).trim();
          if (live) {
            strip.innerHTML = '<span style="color:#c0392b">●</span>&nbsp;' + _recSec + 's — <em>"' + live.slice(0,100) + (live.length>100?'…':'') + '"</em>';
          }
        };
        _recognition.onerror = function(ev) {
          if (ev.error === 'aborted' || ev.error === 'no-speech') return;
        };
        _recognition.onend = function() {
          if (isRec && _recognition) { try { _recognition.start(); } catch(e) {} }
        };
        try { _recognition.start(); } catch(e) { _recognition = null; }
      }

      // MediaRecorder backup
      try {
        _mediaRec = new MediaRecorder(stream);
        _mediaRec.start(500);
        _mediaRec.ondataavailable = function(){};
        _mediaRec.onstop = function() {
          if (!_voiceText.trim()) {
            var s2 = document.getElementById('vstrip');
            if (s2 && s2.style.display !== 'none') {
              s2.innerHTML = '🎙 Audio captured but transcript unavailable. <strong>Type what you said above.</strong>';
            }
          }
        };
      } catch(e) {}
    })
    .catch(function(err) {
      isRec = false;
      strip.style.background = 'rgba(192,57,43,.1)';
      var ua  = navigator.userAgent;
      var ios = /iPad|iPhone|iPod/.test(ua);
      var and = /Android/.test(ua);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        if (ios) {
          strip.innerHTML = '⚠️ <strong>iPhone/iPad:</strong> Open Settings → Safari → Microphone → Allow, then try again.<br>Or just <strong>type your entry</strong> above.';
        } else if (and) {
          strip.innerHTML = '⚠️ <strong>Android:</strong> Tap the lock icon in your browser address bar → Microphone → Allow, then try again.<br>Or just <strong>type your entry</strong> above.';
        } else {
          strip.innerHTML = '⚠️ Microphone blocked. Click the lock icon in your address bar → set Microphone to Allow → refresh.<br>Or just <strong>type your entry</strong> above.';
        }
      } else if (err.name === 'NotFoundError') {
        strip.innerHTML = '⚠️ No microphone found. Please <strong>type your entry</strong> above.';
      } else {
        strip.innerHTML = '⚠️ Could not access microphone. Please <strong>type your entry</strong> above.';
      }
    });
}

function stopRec() {
  isRec = false;
  clearInterval(_recTick);
  var btn   = document.getElementById('mic-btn');
  var dot   = document.getElementById('rec-dot');
  var strip = document.getElementById('vstrip');
  var ta    = document.getElementById('jtxt');

  btn.classList.remove('rec');
  if (dot) dot.style.display = 'none';

  if (_recognition) { try { _recognition.stop(); } catch(e) {} _recognition = null; }
  if (_mediaRec)    { try { _mediaRec.stop(); }    catch(e) {} _mediaRec    = null; }
  if (_mediaStream) {
    _mediaStream.getTracks().forEach(function(t) { t.stop(); });
    _mediaStream = null;
  }

  var final = _voiceText.trim();
  if (final) {
    if (ta && !ta.value.trim()) {
      ta.value = final;
      ta.style.borderColor = 'var(--s)';
      setTimeout(function() { ta.style.borderColor = 'var(--bdr)'; }, 2000);
    }
    strip.style.display    = 'block';
    strip.style.background = 'var(--dw)';
    strip.innerHTML = '✅ Captured: <em>"' + final.slice(0,120) + (final.length>120?'…':'') + '"</em> — edit above if needed, then save.';
  } else if (_recSec > 1) {
    strip.style.background = 'rgba(232,160,0,.1)';
    strip.textContent = 'No speech detected (' + _recSec + 's). Please type your entry above.';
  } else {
    strip.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════════════════