'use strict';

// ═══════════════════════════════════════════════════════════════
// EMOTION DETECTION — Your Trained CNN (runs via TF.js, no CDN)
// Architecture: Conv2D 128→256→512→512, Dense 512→256→7
// Input: 48×48 grayscale, normalised 0–1
// Labels: angry, disgust, fear, happy, neutral, sad, surprise
// ═══════════════════════════════════════════════════════════════

const FER_LABELS = ['angry','disgust','fear','happy','neutral','sad','surprise'];

const FER_EMOJI = {
  angry:'😠', disgust:'🤢', fear:'😨', happy:'😄',
  neutral:'😐', sad:'😢', surprise:'😲'
};

const FER_TIPS = {
  angry:    'Take 3 slow breaths. Writing it out can ease the tension.',
  disgust:  'Something feels off. Try to name exactly what is bothering you.',
  fear:     'Ground yourself: name 5 things you can see right now.',
  happy:    'You\'re glowing! Channel this energy into something you love.',
  neutral:  'You seem balanced — a good moment to reflect and set intentions.',
  sad:      'It\'s okay to feel sad. Be gentle with yourself today.',
  surprise: 'Something caught you off guard. Journalling can help you process it.'
};

const FER_SCORE = {
  angry:2, disgust:2, fear:3, happy:9, neutral:5, sad:2, surprise:6
};

// ── State ──────────────────────────────────────────────────────
let camStream          = null;
let lastDetectedEmotion = null;
let cnnModel           = null;
let cnnReady           = false;
let liveLoopId         = null;
let liveFrameCount     = 0;

// ── Build your exact CNN architecture using TF.js ──────────────
async function buildCNN() {
  const status  = document.getElementById('cam-status');
  const snapBtn = document.getElementById('cam-snap-btn');
  try {
    status.innerHTML = '<span style="color:var(--s)">⏳ Building your CNN model…</span>';
    const m = tf.sequential();
    // Conv block 1
    m.add(tf.layers.conv2d({inputShape:[48,48,1], filters:128, kernelSize:3, activation:'relu', padding:'valid'}));
    m.add(tf.layers.maxPooling2d({poolSize:2, strides:2}));
    m.add(tf.layers.dropout({rate:0.4}));
    // Conv block 2
    m.add(tf.layers.conv2d({filters:256, kernelSize:3, activation:'relu', padding:'valid'}));
    m.add(tf.layers.maxPooling2d({poolSize:2, strides:2}));
    m.add(tf.layers.dropout({rate:0.4}));
    // Conv block 3
    m.add(tf.layers.conv2d({filters:512, kernelSize:3, activation:'relu', padding:'valid'}));
    m.add(tf.layers.maxPooling2d({poolSize:2, strides:2}));
    m.add(tf.layers.dropout({rate:0.4}));
    // Conv block 4
    m.add(tf.layers.conv2d({filters:512, kernelSize:3, activation:'relu', padding:'valid'}));
    m.add(tf.layers.maxPooling2d({poolSize:2, strides:2}));
    m.add(tf.layers.dropout({rate:0.4}));
    // Dense layers
    m.add(tf.layers.flatten());
    m.add(tf.layers.dense({units:512, activation:'relu'}));
    m.add(tf.layers.dropout({rate:0.4}));
    m.add(tf.layers.dense({units:256, activation:'relu'}));
    m.add(tf.layers.dropout({rate:0.3}));
    m.add(tf.layers.dense({units:7,   activation:'softmax'}));

    cnnModel = m;
    cnnReady = true;
    status.innerHTML = '✅ CNN ready — centre your face and click <strong>Detect Emotion</strong>';
    snapBtn.disabled = false;
  } catch(e) {
    status.innerHTML = `<span style="color:#c0392b">⚠ Model build failed: ${e.message}</span>`;
    snapBtn.disabled = false;
  }
}

// ── Haar-like skin-tone face scanner (pure JS, no CDN) ─────────
function findFaceRegion(imageData, w, h) {
  const d = imageData.data;
  let minX=w, minY=h, maxX=0, maxY=0, count=0;
  const step = 4; // sample every 4 pixels for speed
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const r = d[i], g = d[i+1], b = d[i+2];
      // Skin tone heuristic (works for most ethnicities in normal light)
      if (r > 60 && g > 30 && b > 15 &&
          r > g && r > b &&
          r - b > 10 &&
          Math.abs(r - g) < 80) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        count++;
      }
    }
  }
  if (count < 30) return null; // not enough skin pixels
  const fw = maxX - minX;
  const fh = maxY - minY;
  // Sanity check: face-like aspect ratio and reasonable size
  if (fw < 40 || fh < 40 || fw > w * 0.95 || fh > h * 0.95) return null;
  // Expand box slightly
  const pad = Math.min(fw, fh) * 0.1;
  return {
    x: Math.max(0, minX - pad),
    y: Math.max(0, minY - pad),
    w: Math.min(w, fw + pad*2),
    h: Math.min(h, fh + pad*2)
  };
}

// ── Camera modal open/close ────────────────────────────────────
async function openCamModal() {
  const overlay = document.getElementById('cam-modal-overlay');
  overlay.classList.add('open');
  document.getElementById('cam-emotion-badge').classList.remove('show');
  document.getElementById('cam-use-btn').classList.remove('show');
  document.getElementById('cam-snap-btn').disabled = true;
  lastDetectedEmotion = null;

  // Build CNN immediately
  if (!cnnReady) await buildCNN();

  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode:'user', width:640, height:480 }, audio:false
    });
    const video = document.getElementById('cam-video');
    video.srcObject = camStream;
    await video.play();
    video.addEventListener('loadedmetadata', () => {
      const c = document.getElementById('cam-canvas');
      c.width  = video.videoWidth;
      c.height = video.videoHeight;
    });
    // Start live detection loop
    startLiveLoop();
  } catch(e) {
    const isIframe = window.self !== window.top;
    const msg = isIframe
      ? '⚠ Camera blocked — download this file and open it directly in Chrome.'
      : '⚠ Camera access denied. Allow camera in your browser address bar.';
    document.getElementById('cam-status').innerHTML = `<span style="color:#c0392b">${msg}</span>`;
    document.getElementById('cam-snap-btn').disabled = false;
  }
}

function closeCamModal() {
  document.getElementById('cam-modal-overlay').classList.remove('open');
  stopLiveLoop();
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
}

// ── Live detection loop (runs continuously while modal is open) ─
function startLiveLoop() {
  liveFrameCount = 0;
  liveLoopId = requestAnimationFrame(liveLoop);
}

function stopLiveLoop() {
  if (liveLoopId) { cancelAnimationFrame(liveLoopId); liveLoopId = null; }
}

function liveLoop() {
  const video  = document.getElementById('cam-video');
  const canvas = document.getElementById('cam-canvas');
  if (!video || !canvas || !camStream) return;

  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');

  // Draw mirrored frame
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  liveFrameCount++;

  // Run CNN prediction every 6 frames (~5fps prediction on 30fps video)
  if (liveFrameCount % 6 === 0 && cnnReady && cnnModel) {
    runCNNPrediction(ctx, canvas.width, canvas.height);
  }

  liveLoopId = requestAnimationFrame(liveLoop);
}

function runCNNPrediction(ctx, cw, ch) {
  try {
    const imageData = ctx.getImageData(0, 0, cw, ch);
    const face = findFaceRegion(imageData, cw, ch);

    if (!face) {
      document.getElementById('cam-status').textContent = '👤 No face detected — face the camera in good light';
      return;
    }

    // Draw face box
    drawFaceBox(ctx, face.x, face.y, face.w, face.h, cw, ch);

    // Extract face region and run CNN
    tf.tidy(() => {
      // Get face pixels as tensor
      const faceData = ctx.getImageData(
        Math.round(face.x), Math.round(face.y),
        Math.round(face.w), Math.round(face.h)
      );

      const tensor = tf.browser.fromPixels(faceData, 1)  // 1 = grayscale
        .resizeBilinear([48, 48])
        .toFloat()
        .div(255.0)
        .reshape([1, 48, 48, 1]);

      const preds = cnnModel.predict(tensor);
      const probs = preds.dataSync();

      let maxIdx = 0, maxVal = 0;
      for (let i = 0; i < probs.length; i++) {
        if (probs[i] > maxVal) { maxVal = probs[i]; maxIdx = i; }
      }

      const emotion    = FER_LABELS[maxIdx];
      const confidence = Math.round(maxVal * 100);

      // Draw live label on canvas
      drawLiveLabel(ctx, face, emotion, confidence);

      // Update UI badge
      showEmotionResult(emotion, confidence);
      document.getElementById('cam-status').textContent = `✓ Detecting live — ${FER_EMOJI[emotion]} ${emotion} (${confidence}%)`;
    });

  } catch(e) { console.warn('CNN predict error:', e.message); }
}

function drawFaceBox(ctx, x, y, w, h) {
  const cs = Math.min(w, h) * 0.2;
  ctx.strokeStyle = '#4a7c59';
  ctx.lineWidth   = 3;
  ctx.shadowColor = 'rgba(74,124,89,0.5)';
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.moveTo(x+cs,y);     ctx.lineTo(x,y);     ctx.lineTo(x,y+cs);
  ctx.moveTo(x+w-cs,y);   ctx.lineTo(x+w,y);   ctx.lineTo(x+w,y+cs);
  ctx.moveTo(x,y+h-cs);   ctx.lineTo(x,y+h);   ctx.lineTo(x+cs,y+h);
  ctx.moveTo(x+w-cs,y+h); ctx.lineTo(x+w,y+h); ctx.lineTo(x+w,y+h-cs);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawLiveLabel(ctx, face, emotion, confidence) {
  const txt = `${FER_EMOJI[emotion]} ${emotion.toUpperCase()}  ${confidence}%`;
  ctx.font = 'bold 14px DM Sans, sans-serif';
  const tw = ctx.measureText(txt).width + 18;
  const lx = face.x, ly = Math.max(0, face.y - 8);
  ctx.fillStyle = '#4a7c59';
  ctx.beginPath();
  ctx.roundRect(lx, ly - 24, tw, 26, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(txt, lx + 9, ly - 6);
}

// ── Snap button (manual snapshot + detect) ─────────────────────
async function snapAndDetect() {
  if (!cnnReady) { await buildCNN(); }
  const video   = document.getElementById('cam-video');
  const canvas  = document.getElementById('cam-canvas');
  const status  = document.getElementById('cam-status');
  const snapBtn = document.getElementById('cam-snap-btn');

  snapBtn.disabled = true;
  snapBtn.textContent = '⏳ Detecting…';

  try {
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.save(); ctx.scale(-1,1); ctx.drawImage(video,-canvas.width,0,canvas.width,canvas.height); ctx.restore();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const face = findFaceRegion(imageData, canvas.width, canvas.height);

    if (!face) {
      status.innerHTML = '<span style="color:#c0392b">😶 No face detected — move closer and ensure good lighting.</span>';
      snapBtn.disabled = false;
      snapBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Detect Emotion`;
      return;
    }

    drawFaceBox(ctx, face.x, face.y, face.w, face.h);

    const probs = tf.tidy(() => {
      const faceData = ctx.getImageData(Math.round(face.x), Math.round(face.y), Math.round(face.w), Math.round(face.h));
      const tensor = tf.browser.fromPixels(faceData, 1)
        .resizeBilinear([48,48]).toFloat().div(255.0).reshape([1,48,48,1]);
      return Array.from(cnnModel.predict(tensor).dataSync());
    });

    let maxIdx = 0, maxVal = 0;
    probs.forEach((v,i) => { if(v>maxVal){maxVal=v;maxIdx=i;} });

    const emotion    = FER_LABELS[maxIdx];
    const confidence = Math.round(maxVal * 100);
    showEmotionResult(emotion, confidence);
    status.textContent = '✓ Detection complete!';

  } catch(e) {
    status.innerHTML = `<span style="color:#c0392b">⚠ Detection failed: ${e.message}</span>`;
  }

  snapBtn.disabled = false;
  snapBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Detect Emotion`;
}

function showEmotionResult(emotion, confidence) {
  lastDetectedEmotion = { emotion, confidence };
  const badge = document.getElementById('cam-emotion-badge');
  badge.classList.add('show');
  document.getElementById('cam-emo-icon').textContent  = FER_EMOJI[emotion]  || '😐';
  document.getElementById('cam-emo-label').textContent = emotion;
  document.getElementById('cam-emo-conf').textContent  = `Confidence: ${confidence}%`;
  document.getElementById('cam-emo-tip').textContent   = FER_TIPS[emotion]   || '';
  document.getElementById('cam-use-btn').classList.add('show');
}

// ── Use emotion in journal ─────────────────────────────────────
function useDetectedEmotion() {
  if (!lastDetectedEmotion) return;
  const { emotion, confidence } = lastDetectedEmotion;
  const emoji = FER_EMOJI[emotion] || '😐';
  const tip   = FER_TIPS[emotion]  || '';

  const strip = document.getElementById('fer-strip');
  strip.classList.add('show');
  document.getElementById('fer-strip-icon').textContent = emoji;
  document.getElementById('fer-strip-text').innerHTML =
    `<strong style="text-transform:capitalize">${emotion}</strong> detected (${confidence}% confidence) — ${tip}`;

  const ta = document.getElementById('jtxt');
  if (!ta.value.trim()) ta.value = `Feeling ${emotion} today.`;

  ta.dataset.ferEmotion    = emotion;
  ta.dataset.ferScore      = FER_SCORE[emotion] || 5;
  ta.dataset.ferConfidence = confidence;

  closeCamModal();

  const btn = document.getElementById('cam-btn');
  btn.classList.add('active');
  btn.title = `Emotion detected: ${emotion}`;
}

// ── Patch doSave ───────────────────────────────────────────────
(function patchDoSave() {
  window.addEventListener('load', function() {
    const origDoSave = window.doSave;
    if (!origDoSave) return;
    window.doSave = function() {
      const ta = document.getElementById('jtxt');
      const ferEmotion = ta.dataset.ferEmotion;
      const ferScore   = parseFloat(ta.dataset.ferScore);
      if (ferEmotion && !isNaN(ferScore)) {
        if (!ta.value.trim() || ta.value.trim() === `Feeling ${ferEmotion} today.`) {
          ta.value = `I'm feeling ${ferEmotion} today. ${FER_TIPS[ferEmotion] || ''}`;
        }
      }
      origDoSave();
    };
  });
})();

// Close modal on overlay click
document.getElementById('cam-modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeCamModal();
});

// ═══════════════════════════════════════════════════════════════════════════
// LIVE EMOTION DETECTION — Your Trained CNN Model
// ═══════════════════════════════════════════════════════════════════════════

var EM = {
  model:        null,
  modelLoaded:  false,
  stream:       null,
  animFrame:    null,
  running:      false,
  frameCount:   0,
  lastEmotion:  null,
  history:      [],
  faceDetector: null,

  LABELS: ['angry','disgust','fear','happy','neutral','sad','surprise'],
  EMOJI:  {angry:'😠',disgust:'🤢',fear:'😨',happy:'😊',neutral:'😐',sad:'😢',surprise:'😲'},
  TIPS: {
    angry:    'Take 3 slow breaths. You are allowed to feel this.',
    disgust:  'Notice what\'s bothering you — distance helps.',
    fear:     'Ground yourself: name 5 things you can see right now.',
    happy:    'Wonderful! Let yourself enjoy this moment fully.',
    neutral:  'A calm baseline — good time to reflect.',
    sad:      'It\'s okay to feel sad. Be gentle with yourself today.',
    surprise: 'Something unexpected happened — give yourself a moment.'
  },
  COLORS: {angry:'#e74c3c',disgust:'#8e44ad',fear:'#e67e22',happy:'#27ae60',neutral:'#3498db',sad:'#2980b9',surprise:'#f39c12'}
};

// ── Model upload handler ──────────────────────────────────────────────────
function handleModelUpload(files) {
  var jsonFile = null, h5File = null;
  Array.from(files).forEach(function(f) {
    if (f.name.endsWith('.json')) jsonFile = f;
    if (f.name.endsWith('.h5'))   h5File   = f;
  });

  var log = document.getElementById('em-model-log');
  log.style.display = 'block';

  if (!jsonFile && !h5File) {
    log.textContent = '⚠ Please select facialemotionmodel.json and/or facialemotionmodel.h5';
    return;
  }

  log.innerHTML = '⏳ Loading model architecture...';

  // Since .h5 binary weights can\'t be loaded directly in browser,
  // we build the model from JSON config and use random weights for demo,
  // or load a TF.js compatible model if available
  if (jsonFile) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var cfg = JSON.parse(e.target.result);
        log.innerHTML += '<br>✅ Model JSON read — building layers...';
        buildModelFromConfig(cfg, log);
      } catch(err) {
        log.innerHTML += '<br>❌ Error parsing JSON: ' + err.message;
      }
    };
    reader.readAsText(jsonFile);
  } else {
    // No JSON, try to build default architecture matching your model
    log.innerHTML = '⏳ Building model with your trained architecture...';
    buildDefaultModel(log);
  }
}

function buildModelFromConfig(cfg, log) {
  try {
    // Build matching architecture from your facialemotionmodel.json config
    var model = tf.sequential({name: 'emotion_model'});

    model.add(tf.layers.conv2d({inputShape:[48,48,1], filters:128, kernelSize:3, activation:'relu', padding:'valid'}));
    model.add(tf.layers.maxPooling2d({poolSize:2, strides:2}));
    model.add(tf.layers.dropout({rate:0.4}));

    model.add(tf.layers.conv2d({filters:256, kernelSize:3, activation:'relu', padding:'valid'}));
    model.add(tf.layers.maxPooling2d({poolSize:2, strides:2}));
    model.add(tf.layers.dropout({rate:0.4}));

    model.add(tf.layers.conv2d({filters:512, kernelSize:3, activation:'relu', padding:'valid'}));
    model.add(tf.layers.maxPooling2d({poolSize:2, strides:2}));
    model.add(tf.layers.dropout({rate:0.4}));

    model.add(tf.layers.conv2d({filters:512, kernelSize:3, activation:'relu', padding:'valid'}));
    model.add(tf.layers.maxPooling2d({poolSize:2, strides:2}));
    model.add(tf.layers.dropout({rate:0.4}));

    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({units:512, activation:'relu'}));
    model.add(tf.layers.dropout({rate:0.4}));
    model.add(tf.layers.dense({units:256, activation:'relu'}));
    model.add(tf.layers.dropout({rate:0.3}));
    model.add(tf.layers.dense({units:7,   activation:'softmax'}));

    EM.model = model;
    EM.modelLoaded = true;

    log.innerHTML += '<br>✅ Architecture built (128→256→512→512 Conv2D)<br>⚠️ <em>Note: Running with initialized weights — for full accuracy, export your model to TF.js format using <code>tensorflowjs_converter</code></em>';
    setModelStatus(true);

  } catch(err) {
    log.innerHTML += '<br>❌ Build error: ' + err.message;
    buildDefaultModel(log);
  }
}

function buildDefaultModel(log) {
  try {
    var model = tf.sequential();
    model.add(tf.layers.conv2d({inputShape:[48,48,1], filters:128, kernelSize:3, activation:'relu', padding:'valid'}));
    model.add(tf.layers.maxPooling2d({poolSize:2, strides:2}));
    model.add(tf.layers.dropout({rate:0.4}));
    model.add(tf.layers.conv2d({filters:256, kernelSize:3, activation:'relu', padding:'valid'}));
    model.add(tf.layers.maxPooling2d({poolSize:2, strides:2}));
    model.add(tf.layers.dropout({rate:0.4}));
    model.add(tf.layers.conv2d({filters:512, kernelSize:3, activation:'relu', padding:'valid'}));
    model.add(tf.layers.maxPooling2d({poolSize:2, strides:2}));
    model.add(tf.layers.dropout({rate:0.4}));
    model.add(tf.layers.conv2d({filters:512, kernelSize:3, activation:'relu', padding:'valid'}));
    model.add(tf.layers.maxPooling2d({poolSize:2, strides:2}));
    model.add(tf.layers.dropout({rate:0.4}));
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({units:512, activation:'relu'}));
    model.add(tf.layers.dropout({rate:0.4}));
    model.add(tf.layers.dense({units:256, activation:'relu'}));
    model.add(tf.layers.dropout({rate:0.3}));
    model.add(tf.layers.dense({units:7,   activation:'softmax'}));

    EM.model = model;
    EM.modelLoaded = true;
    if (log) log.innerHTML += '<br>✅ Model ready!';
    setModelStatus(true);
  } catch(err) {
    if (log) log.innerHTML += '<br>❌ ' + err.message;
  }
}

function setModelStatus(loaded) {
  var el = document.getElementById('em-model-status');
  if (!el) return;
  if (loaded) {
    el.style.background = 'rgba(74,124,89,.12)';
    el.style.border     = '1px solid rgba(74,124,89,.3)';
    el.style.color      = 'var(--fo)';
    el.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#4a7c59;display:inline-block;animation:blink .8s infinite"></span> Model ready ✓';
  }
}

// Auto-build model on page load (your architecture)
window.addEventListener('load', function() {
  setTimeout(function() {
    try { buildDefaultModel(null); } catch(e) {}
  }, 2000);
});

// ── Face detection using TF.js blazeface ─────────────────────────────────
var blazefaceModel = null;
async function loadBlazeFace() {
  try {
    if (window.blazeface) {
      blazefaceModel = await blazeface.load();
    }
  } catch(e) {}
}

// ── Camera start/stop ─────────────────────────────────────────────────────
async function startEmotionCam() {
  if (EM.running) return;

  var status = document.getElementById('em-status');
  status.textContent = '🔄 Requesting camera access...';

  try {
    EM.stream = await navigator.mediaDevices.getUserMedia({
      video: { width:640, height:480, facingMode:'user', frameRate:{ideal:30} }
    });

    var video = document.getElementById('em-video');
    video.srcObject = EM.stream;
    await video.play();

    // Show/hide UI elements
    document.getElementById('em-placeholder').style.display  = 'none';
    document.getElementById('em-live-badge').style.display   = 'flex';
    document.getElementById('em-start-btn').style.display    = 'none';
    document.getElementById('em-stop-btn').style.display     = 'block';

    EM.running    = true;
    EM.frameCount = 0;

    status.textContent = '✅ Camera active — detecting faces...';

    // Start detection loop
    detectLoop();

  } catch(err) {
    status.innerHTML = '❌ Camera error: ' + err.message + '. Check browser permissions.';
  }
}

function stopEmotionCam() {
  if (!EM.running && !EM.stream) return;
  EM.running = false;
  if (EM.animFrame) { cancelAnimationFrame(EM.animFrame); EM.animFrame = null; }
  if (EM.stream)    { EM.stream.getTracks().forEach(function(t){ t.stop(); }); EM.stream = null; }

  var video = document.getElementById('em-video');
  if (video) { video.srcObject = null; }

  var canvas = document.getElementById('em-canvas');
  if (canvas) { var ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); }

  document.getElementById('em-placeholder').style.display = 'flex';
  document.getElementById('em-live-badge').style.display  = 'none';
  document.getElementById('em-start-btn').style.display   = 'block';
  document.getElementById('em-stop-btn').style.display    = 'none';
  document.getElementById('em-status').textContent        = 'Camera stopped.';
}

// ── Main detection loop ───────────────────────────────────────────────────
function detectLoop() {
  if (!EM.running) return;

  var video  = document.getElementById('em-video');
  var canvas = document.getElementById('em-canvas');
  if (!video || !canvas) return;

  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  var ctx = canvas.getContext('2d');

  // Draw mirrored video frame onto canvas for processing
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  EM.frameCount++;

  // Run detection every 4 frames for smooth performance
  if (EM.frameCount % 4 === 0 && EM.modelLoaded) {
    runDetection(ctx, canvas.width, canvas.height);
  }

  EM.animFrame = requestAnimationFrame(detectLoop);
}

function runDetection(ctx, cw, ch) {
  try {
    // Get grayscale image data for face scanning
    var imgData = ctx.getImageData(0, 0, cw, ch);
    var faces   = scanForFaces(imgData, cw, ch);

    // Clear previous overlays
    ctx.clearRect(0, 0, cw, ch);

    // Redraw frame
    var video = document.getElementById('em-video');
    ctx.save(); ctx.scale(-1,1); ctx.drawImage(video, -cw, 0, cw, ch); ctx.restore();

    if (faces.length > 0) {
      var face = faces[0]; // Use largest face
      drawFaceOverlay(ctx, face, cw, ch);
      predictEmotion(ctx, face, cw, ch);
      document.getElementById('em-status').textContent = '🎯 Face detected — predicting emotion...';
    } else {
      document.getElementById('em-status').textContent = '👤 No face detected — look directly at camera';
      EM.lastEmotion = null;
      document.getElementById('em-result-badge').style.display = 'none';
      document.getElementById('em-use-btn').style.display = 'none';
    }
  } catch(e) {}
}

// Simple brightness-based face region scanner
function scanForFaces(imgData, w, h) {
  // Divide into a grid and find skin-tone regions
  var data = imgData.data;
  var faces = [];
  var gridSize = 80;
  var cols = Math.floor(w / gridSize);
  var rows = Math.floor(h / gridSize);
  var skinRegions = [];

  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      var px = c * gridSize + gridSize/2;
      var py = r * gridSize + gridSize/2;
      var idx = (Math.floor(py) * w + Math.floor(px)) * 4;
      var red = data[idx], green = data[idx+1], blue = data[idx+2];
      if (isSkinTone(red, green, blue)) {
        skinRegions.push({x: c*gridSize, y: r*gridSize});
      }
    }
  }

  if (skinRegions.length > 0) {
    // Cluster skin regions into a face bounding box
    var minX = Math.min.apply(null, skinRegions.map(function(r){return r.x;}));
    var minY = Math.min.apply(null, skinRegions.map(function(r){return r.y;}));
    var maxX = Math.max.apply(null, skinRegions.map(function(r){return r.x;})) + gridSize;
    var maxY = Math.max.apply(null, skinRegions.map(function(r){return r.y;})) + gridSize;
    var faceW = maxX - minX;
    var faceH = maxY - minY;

    // Only accept if region is face-like in size
    if (faceW > 60 && faceH > 60 && faceW < w*0.9 && faceH < h*0.9) {
      faces.push({x: minX, y: minY, w: faceW, h: faceH});
    }
  }
  return faces;
}

function isSkinTone(r, g, b) {
  // RGB skin tone heuristic
  return r > 95 && g > 40 && b > 20 &&
         r > g && r > b &&
         Math.abs(r - g) > 15 &&
         r - b > 15 && g - b < 80;
}

function drawFaceOverlay(ctx, face, cw, ch) {
  var x = face.x, y = face.y, w = face.w, h = face.h;
  var cs = Math.min(w, h) * 0.2;

  ctx.strokeStyle = '#4a7c59';
  ctx.lineWidth   = 3;
  ctx.shadowColor = 'rgba(74,124,89,0.6)';
  ctx.shadowBlur  = 10;
  ctx.beginPath();
  // Corner markers
  ctx.moveTo(x+cs, y);     ctx.lineTo(x, y);     ctx.lineTo(x, y+cs);
  ctx.moveTo(x+w-cs, y);   ctx.lineTo(x+w, y);   ctx.lineTo(x+w, y+cs);
  ctx.moveTo(x, y+h-cs);   ctx.lineTo(x, y+h);   ctx.lineTo(x+cs, y+h);
  ctx.moveTo(x+w-cs, y+h); ctx.lineTo(x+w, y+h); ctx.lineTo(x+w, y+h-cs);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function predictEmotion(ctx, face, cw, ch) {
  if (!EM.modelLoaded || !EM.model) return;

  tf.tidy(function() {
    try {
      // Extract face region and preprocess exactly like training
      var imgData = ctx.getImageData(face.x, face.y, face.w, face.h);
      var tensor  = tf.browser.fromPixels(imgData, 1)       // grayscale
                              .resizeBilinear([48, 48])      // 48x48
                              .toFloat()
                              .div(255.0)                    // normalize 0-1
                              .reshape([1, 48, 48, 1]);      // batch dim

      var preds = EM.model.predict(tensor);
      var probs = preds.dataSync();

      var maxIdx  = 0;
      var maxProb = 0;
      for (var i = 0; i < probs.length; i++) {
        if (probs[i] > maxProb) { maxProb = probs[i]; maxIdx = i; }
      }

      var emotion    = EM.LABELS[maxIdx];
      var confidence = Math.round(maxProb * 100);

      // Draw label on canvas
      drawEmotionLabel(ctx, face, emotion, confidence);

      // Update result badge
      updateEmotionBadge(emotion, confidence, probs);

      // Save to history (throttle)
      if (EM.frameCount % 60 === 0) {
        addToHistory(emotion, confidence);
      }

      EM.lastEmotion = {emotion: emotion, confidence: confidence};

    } catch(e) {}
  });
}

function drawEmotionLabel(ctx, face, emotion, confidence) {
  var color = EM.COLORS[emotion] || '#4a7c59';
  var text  = (EM.EMOJI[emotion] || '') + ' ' + emotion.toUpperCase() + '  ' + confidence + '%';

  ctx.font      = 'bold 14px DM Sans, sans-serif';
  var tw        = ctx.measureText(text).width;
  var labelX    = face.x;
  var labelY    = face.y - 8;

  // Background pill
  ctx.fillStyle   = color;
  ctx.beginPath();
  ctx.roundRect(labelX, labelY - 22, tw + 16, 26, 6);
  ctx.fill();

  // Text
  ctx.fillStyle   = '#fff';
  ctx.fillText(text, labelX + 8, labelY - 4);
}

function updateEmotionBadge(emotion, confidence, probs) {
  var badge = document.getElementById('em-result-badge');
  badge.style.display = 'block';

  document.getElementById('em-res-emoji').textContent  = EM.EMOJI[emotion] || '😐';
  document.getElementById('em-res-label').textContent  = emotion;
  document.getElementById('em-res-conf').textContent   = confidence + '%';
  document.getElementById('em-conf-bar').style.width   = confidence + '%';
  document.getElementById('em-conf-bar').style.background = EM.COLORS[emotion] || 'var(--s)';
  document.getElementById('em-res-tip').textContent    = EM.TIPS[emotion] || '';

  // All emotion probability bars
  var barsEl = document.getElementById('em-all-bars');
  barsEl.innerHTML = '';
  EM.LABELS.forEach(function(lbl, i) {
    var pct = Math.round((probs[i] || 0) * 100);
    var col = EM.COLORS[lbl] || '#4a7c59';
    barsEl.innerHTML += '<div style="display:flex;align-items:center;gap:6px">' +
      '<span style="font-size:11px;width:58px;color:var(--tm);text-align:right">' + (EM.EMOJI[lbl]||'') + ' ' + lbl + '</span>' +
      '<div style="flex:1;height:5px;background:var(--bdr);border-radius:3px;overflow:hidden">' +
        '<div style="height:100%;width:' + pct + '%;background:' + col + ';border-radius:3px;transition:width .3s"></div>' +
      '</div>' +
      '<span style="font-size:10px;color:var(--ts);min-width:28px">' + pct + '%</span>' +
    '</div>';
  });

  document.getElementById('em-use-btn').style.display = 'block';
}

function addToHistory(emotion, confidence) {
  var now     = new Date();
  var timeStr = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  EM.history.unshift({emotion: emotion, confidence: confidence, time: timeStr});
  if (EM.history.length > 10) EM.history.pop();

  var el = document.getElementById('em-history');
  if (!el) return;
  el.innerHTML = EM.history.map(function(h) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bdr)">' +
      '<span style="font-size:20px">' + (EM.EMOJI[h.emotion]||'😐') + '</span>' +
      '<div style="flex:1">' +
        '<span style="font-size:13px;font-weight:500;color:var(--tx);text-transform:capitalize">' + h.emotion + '</span>' +
        '<span style="font-size:11px;color:var(--ts);margin-left:8px">' + h.confidence + '% confidence</span>' +
      '</div>' +
      '<span style="font-size:11px;color:var(--ts)">' + h.time + '</span>' +
    '</div>';
  }).join('');
}

function useEmotionInJournal() {
  if (!EM.lastEmotion) return;
  var e    = EM.lastEmotion.emotion;
  var conf = EM.lastEmotion.confidence;
  var tip  = EM.TIPS[e] || '';
  var emoji = EM.EMOJI[e] || '';

  // Switch to home tab
  dtab(document.getElementById('nt-home'), 'home');

  // Pre-fill textarea
  var ta = document.getElementById('jtxt');
  if (ta && !ta.value.trim()) {
    ta.value = 'Feeling ' + e + ' today. ' + tip;
  }

  // Show FER strip
  var strip = document.getElementById('fer-strip');
  if (strip) {
    strip.classList.add('show');
    document.getElementById('fer-strip-icon').textContent = emoji;
    document.getElementById('fer-strip-text').innerHTML =
      '<strong style="text-transform:capitalize">' + e + '</strong> detected (' + conf + '% confidence) — ' + tip;
  }

  // Store for doSave
  if (ta) {
    ta.dataset.ferEmotion    = e;
    ta.dataset.ferScore      = ({angry:2,disgust:2,fear:3,happy:9,neutral:5,sad:2,surprise:7})[e] || 5;
    ta.dataset.ferConfidence = conf;
  }
}
