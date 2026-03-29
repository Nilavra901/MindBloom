# MindBloom — Architecture Documentation

## Overview

MindBloom is a **client-side only** web application. There is no backend server, no external API calls, and no data leaves the user's device. Everything runs in the browser.

---

## Project Structure

```
mindbloom/
├── index.html                  ← Main entry point (HTML structure)
├── css/
│   └── styles.css              ← All styles (CSS variables, components, dark mode)
├── js/
│   ├── db.js                   ← Database engine (localStorage)
│   ├── auth.js                 ← Authentication (sign up, sign in, OTP reset)
│   ├── navigation.js           ← Screen routing & theme
│   ├── dashboard.js            ← Dashboard tabs, live clock, greeting
│   ├── journal.js              ← Journal entry, AI sentiment, voice input
│   ├── charts.js               ← SVG mood charts, insights rendering
│   ├── settings.js             ← Settings panel, emergency contact
│   └── emotion.js              ← Live emotion detection (CNN via TF.js)
├── assets/                     ← Icons, images (if any)
├── scripts/
│   ├── convert_model.py        ← Converts .h5 → TF.js format
│   └── serve.py                ← Local development server
├── docs/
│   ├── ARCHITECTURE.md         ← This file
│   ├── MODEL.md                ← CNN model documentation
│   └── API.md                  ← Internal JS API reference
├── tfjs_model/                 ← (optional) Converted TF.js model weights
│   ├── model.json
│   └── *.bin
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Actions CI/CD → GitHub Pages
├── netlify.toml                ← Netlify deployment config
├── package.json                ← Node.js dev scripts
├── .gitignore
├── LICENSE
└── README.md
```

---

## Module Responsibilities

### `js/db.js` — Database Engine
- **Storage**: All data in `localStorage` under key `mb_db_v3`
- **Schema**: `{ [email]: { id, email, pwHash, name, emg, entries[], theme, createdAt, lastLogin } }`
- **Password hashing**: FNV-1a (fast, deterministic, no dependencies)
- **Session**: Stored separately under `mb_sess_v3`, contains `{ email, token, ts }`
- **Exports**: `loadDB()`, `saveDB()`, `saveSession()`, `loadSession()`, `clearSession()`

### `js/auth.js` — Authentication
- Sign up with email + password + name + emergency contact
- Sign in with email + password
- Forgot password via OTP (6-digit code displayed on screen — demo mode)
- Password reset flow with OTP verification

### `js/navigation.js` — Screen Routing
- Screens: `land` (landing), `auth` (sign in/up), `dash` (dashboard)
- `go(screen)` function controls which screen is visible
- Theme toggle (dark/light) persisted per user

### `js/dashboard.js` — Dashboard
- Tab system: Home, Insights, Journal, Emotion Scan, Settings
- Live clock with greeting based on time of day
- Critical mood alert (shows emergency contact when score < 3.0)
- Dashboard initialization and user data loading

### `js/journal.js` — Journal & AI
- Text entry with voice input (Web Speech API)
- **AI Sentiment**: Keyword-based scoring (0–10 scale)
  - Positive keywords → higher score
  - Negative/crisis keywords → lower score + crisis detection
- Entry saved with: text, score, themes, timestamp, source (text/voice/camera)
- Auto-generates mood card with emoji, score, themes, wellness tip

### `js/charts.js` — Charts & Insights
- Pure SVG mood trend chart (no Chart.js dependency)
- Insights tab: average score, entry count, streak calculation
- Top themes word cloud rendering
- Entry list with search + filter

### `js/settings.js` — Settings
- Display name update
- Emergency contact management (phone number)
- Dark mode toggle sync
- Profile card population

### `js/emotion.js` — Live Emotion Detection
- Builds CNN model in browser using TF.js layers API
- **Architecture**: Conv2D(128→256→512→512) + Dense(512→256→7)
- **Face detection**: Skin-tone heuristic scanner (pure JS, no CDN)
- **Live loop**: requestAnimationFrame at ~30fps, CNN prediction every 6 frames
- **Preprocessing**: 48×48 grayscale, float32, normalized 0–1
- **Output**: 7 emotions with confidence %, live label on canvas
- Integrates with journal: "Use in Journal" carries emotion to entry

---

## Data Flow

```
User Input
    │
    ▼
[Browser UI] ──► [js/journal.js] ──► AI Sentiment Score
    │                                       │
    ▼                                       ▼
[Webcam] ──► [js/emotion.js] ──► TF.js CNN ──► Emotion Label
    │                                       │
    ▼                                       ▼
                              [js/db.js] → localStorage
                                       │
                                       ▼
                              [js/charts.js] → SVG Chart
```

---

## Database Schema

```javascript
// localStorage key: 'mb_db_v3'
{
  "user@email.com": {
    id:        "uuid-v4",
    email:     "user@email.com",
    pwHash:    "fnv1a-hex-string",
    name:      "Display Name",
    emg:       "+91 9152987821",      // emergency contact
    theme:     "light" | "dark",
    createdAt: "2026-03-29T...",
    lastLogin: "2026-03-29T...",
    entries: [
      {
        id:        "uuid-v4",
        text:      "Journal entry text",
        score:     7.5,               // AI mood score 0-10
        themes:    ["gratitude", "work"],
        source:    "text" | "voice" | "camera",
        emotion:   "happy",           // if detected via camera
        emoConf:   92,                // confidence %
        ts:        "2026-03-29T...",
        title:     "Auto-generated title"
      }
    ]
  }
}

// localStorage key: 'mb_sess_v3'
{
  email: "user@email.com",
  token: "fnv1a-session-token",
  ts:    1743259200000              // unix timestamp
}
```

---

## CNN Model Architecture

```
Input: (1, 48, 48, 1)  ← batch, height, width, channels (grayscale)

Conv2D(128, 3×3, relu) → (46, 46, 128)
MaxPool(2×2)           → (23, 23, 128)
Dropout(0.4)

Conv2D(256, 3×3, relu) → (21, 21, 256)
MaxPool(2×2)           → (10, 10, 256)
Dropout(0.4)

Conv2D(512, 3×3, relu) → (8, 8, 512)
MaxPool(2×2)           → (4, 4, 512)
Dropout(0.4)

Conv2D(512, 3×3, relu) → (2, 2, 512)
MaxPool(2×2)           → (1, 1, 512)
Dropout(0.4)

Flatten()              → (512,)
Dense(512, relu)       → (512,)
Dropout(0.4)
Dense(256, relu)       → (256,)
Dropout(0.3)
Dense(7, softmax)      → (7,)

Output classes: [angry, disgust, fear, happy, neutral, sad, surprise]
```

---

## CI/CD Pipeline

```
git push → GitHub Actions
               │
               ├── validate: check all files exist + JS syntax
               │
               └── deploy (main branch only):
                       └── GitHub Pages → live URL
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI | HTML5 + CSS3 | Structure & styling |
| Logic | Vanilla JavaScript (ES6+) | All app logic |
| ML | TensorFlow.js 4.10.0 | CNN emotion model |
| Storage | localStorage | User data & sessions |
| Voice | Web Speech API | Voice journal entries |
| Camera | MediaDevices API | Webcam emotion detection |
| Fonts | Google Fonts | Cormorant Garamond + DM Sans |
| CI/CD | GitHub Actions | Auto-deploy to GitHub Pages |
| Hosting | GitHub Pages / Netlify | Free static hosting |
