'use strict';

═══════════════════════════════════════════════ -->
<div class="cam-modal-overlay" id="cam-modal-overlay">
  <div class="cam-modal">
    <button class="cam-close-btn" onclick="closeCamModal()">✕</button>
    <h3>Emotion Check</h3>
    <p class="cam-sub">Let your face do the talking — we'll detect your emotion in real time.</p>

    <div class="cam-video-wrap">
      <video id="cam-video" autoplay muted playsinline></video>
      <canvas id="cam-canvas"></canvas>
    </div>

    <div class="cam-status" id="cam-status">Initialising camera…</div>

    <div class="cam-emotion-badge" id="cam-emotion-badge">
      <div class="cam-emo-icon" id="cam-emo-icon">😐</div>
      <div class="cam-emo-info">
        <div class="cam-emo-label" id="cam-emo-label">neutral</div>
        <div class="cam-emo-conf" id="cam-emo-conf">Confidence: —</div>
        <div class="cam-emo-tip" id="cam-emo-tip"></div>
      </div>
    </div>

    <div class="cam-actions">
      <button class="cam-snap-btn" id="cam-snap-btn" onclick="snapAndDetect()" disabled>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        Detect Emotion
      </button>
      <button class="cam-use-btn" id="cam-use-btn" onclick="useDetectedEmotion()">✓ Use This Emotion</button>
    </div>
  </div>
</div>

<script>
// ═══════════════════════════════════════════════════════════════