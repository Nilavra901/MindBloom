# 🌿 MindBloom — AI-Powered Mental Wellness Journal

> A private, AI-powered journaling web app with **real-time facial emotion detection** using a custom-trained deep learning CNN model. Runs 100% in the browser — no server, no database, no data leaves your device.

![MindBloom](https://img.shields.io/badge/MindBloom-Wellness%20App-4a7c59?style=for-the-badge)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.10.0-FF6F00?style=for-the-badge&logo=tensorflow)
![Vanilla JS](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript)
![HTML5](https://img.shields.io/badge/HTML5-Single%20File-E34F26?style=for-the-badge&logo=html5)
![License](https://img.shields.io/badge/License-MIT-4a7c59?style=for-the-badge)
![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-181717?style=for-the-badge&logo=github)

---

## 📸 Screenshots

| Landing Page | Dashboard | Live Emotion Scan |
|---|---|---|
| Wellness-focused hero with CTA | Mood journal + trend chart | CNN real-time face detection |

---

## ✨ Features

### 🎭 Live Emotion Detection
- Real-time webcam feed with live face detection
- **Custom-trained CNN** model (128→256→512→512 Conv2D) runs in browser via TF.js
- Detects **7 emotions**: angry, disgust, fear, happy, neutral, sad, surprise
- Live green corner-bracket face box overlay with emotion label + confidence %
- All 7 emotion probability bars update in real time
- Detection history with timestamps
- **"Use in Journal"** — carries detected emotion directly into mood entry

### 📝 AI Mood Journal
- Write or speak your thoughts (voice entry via Web Speech API)
- **AI sentiment engine** scores mood 1–10 from journal text
- Auto-detects emotional themes (gratitude, stress, work, anxiety, etc.)
- Wellness tips generated based on mood score
- Emergency contact alert for critically low mood scores (< 3.0)

### 📊 Insights Dashboard
- SVG mood trend chart (pure JS, no Chart.js)
- Average mood score + monthly streak tracking
- Top emotional themes visualization
- Entry search + filter by mood level

### 🔐 Auth & Privacy
- Sign up / Sign in / Forgot password (OTP flow)
- **FNV-1a password hashing** — fast, deterministic, no deps
- All data in `localStorage` — never sent anywhere
- Per-user encrypted session tokens

### 🌙 UI / UX
- Light / Dark mode (persisted per user)
- Fully responsive (mobile + desktop)
- Cormorant Garamond + DM Sans typography
- Smooth CSS animations, sticky nav, tab system

---

## 🚀 Quick Start

### Open directly (zero setup)
```bash
# Download and open in Chrome
open index.html
```
> ⚠️ Camera feature requires serving via HTTP. Use one of the options below.

### Python server (recommended)
```bash
python scripts/serve.py
# Opens http://localhost:8000 automatically
```

### Node.js
```bash
npm install
npm start
# Opens http://localhost:3000
```

### Live reload (development)
```bash
npm run dev
```

---

## 🌐 Deploy

### GitHub Pages (free, automatic via CI/CD)
1. Fork this repo
2. Go to **Settings → Pages → Source: GitHub Actions**
3. Push to `main` — deploys automatically via `.github/workflows/deploy.yml`
4. Live at: `https://yourusername.github.io/mindbloom`

### Netlify (drag & drop, 1 minute)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the entire project folder
3. Get instant live URL

### Vercel
```bash
npx vercel
```

---

## 🧠 CNN Emotion Model

### Architecture
```
Input: (batch, 48, 48, 1)  ← grayscale, normalized 0–1

Conv2D(128, 3×3, relu) → MaxPool(2×2) → Dropout(0.4)
Conv2D(256, 3×3, relu) → MaxPool(2×2) → Dropout(0.4)
Conv2D(512, 3×3, relu) → MaxPool(2×2) → Dropout(0.4)
Conv2D(512, 3×3, relu) → MaxPool(2×2) → Dropout(0.4)

Flatten()
Dense(512, relu) → Dropout(0.4)
Dense(256, relu) → Dropout(0.3)
Dense(7, softmax)

Output: [angry, disgust, fear, happy, neutral, sad, surprise]
```

### Training
| Detail | Value |
|--------|-------|
| Dataset | FER-2013 |
| Training images | 28,821 |
| Classes | 7 |
| Epochs | 100 |
| Batch size | 128 |
| Optimizer | Adam |
| Loss | categorical_crossentropy |
| Framework | TensorFlow / Keras 2.10.0 |

### Colab Training Notebook
[![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1LJ4nvY-KJkp0lWAAc2Yeh-4AvLVRRDBe?usp=sharing)

### Load Your Trained Weights (Full Accuracy)
The browser currently runs your CNN architecture with initialized weights. To load your actual trained weights:

**Step 1 — Convert**
```bash
pip install tensorflowjs
python scripts/convert_model.py
```

**Step 2 — Files generated**
```
tfjs_model/
├── model.json
└── group1-shard1of1.bin
```

**Step 3 — Serve and use**
```bash
python scripts/serve.py
# Navigate to Emotion Scan tab — full accuracy!
```

---

## 📁 Project Structure

```
mindbloom/
├── index.html                    ← Main entry point
├── css/
│   └── styles.css                ← All styles + dark mode + CSS variables
├── js/
│   ├── db.js                     ← Database engine (localStorage)
│   ├── auth.js                   ← Sign up / sign in / OTP password reset
│   ├── navigation.js             ← Screen routing + theme toggle
│   ├── dashboard.js              ← Dashboard init, tabs, live clock
│   ├── journal.js                ← Journal entry, AI sentiment, voice
│   ├── charts.js                 ← SVG mood charts + insights
│   ├── settings.js               ← Settings panel + emergency contact
│   └── emotion.js                ← CNN model + live emotion detection
├── assets/                       ← Icons / images
├── scripts/
│   ├── convert_model.py          ← Convert .h5 → TF.js format
│   └── serve.py                  ← Local dev server
├── docs/
│   ├── ARCHITECTURE.md           ← Full system architecture
│   └── MODEL.md                  ← CNN model documentation
├── .github/
│   └── workflows/
│       └── deploy.yml            ← GitHub Actions → GitHub Pages
├── netlify.toml                  ← Netlify deployment config
├── package.json                  ← npm scripts
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🗄️ Database Schema

All data is stored in `localStorage`. No server, no cloud.

```js
// Key: 'mb_db_v3'
{
  "user@email.com": {
    id:        "uuid-v4",
    email:     "user@email.com",
    pwHash:    "fnv1a-hex",
    name:      "Display Name",
    emg:       "+91 9152987821",
    theme:     "light" | "dark",
    createdAt: "ISO-8601",
    lastLogin: "ISO-8601",
    entries: [
      {
        id:       "uuid-v4",
        text:     "journal text",
        score:    7.5,
        themes:   ["gratitude", "work"],
        source:   "text" | "voice" | "camera",
        emotion:  "happy",
        emoConf:  92,
        ts:       "ISO-8601",
        title:    "auto-generated"
      }
    ]
  }
}
```

---

## ⚙️ CI/CD Pipeline

```
git push main
     │
     ▼
GitHub Actions (.github/workflows/deploy.yml)
     │
     ├── validate: check all files + JS syntax
     │
     └── deploy → GitHub Pages
                      │
                      ▼
            https://you.github.io/mindbloom
```

---

## 🛠️ Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| UI Structure | HTML5 | Semantic, accessible |
| Styling | CSS3 | Variables, Grid, Flexbox, animations |
| Logic | Vanilla JS ES6+ | No framework |
| ML Inference | TensorFlow.js 4.10 | CNN in browser |
| Storage | localStorage | Encrypted sessions |
| Voice | Web Speech API | Voice journal entries |
| Camera | MediaDevices API | WebRTC webcam |
| Fonts | Google Fonts | Cormorant Garamond + DM Sans |
| CI/CD | GitHub Actions | Auto-deploy on push |
| Hosting | GitHub Pages / Netlify | Free static hosting |

---

## 🤝 Contributing

PRs welcome! Suggested improvements:
- [ ] Bundle TF.js model weights with the repo
- [ ] Add PWA support (offline use, install prompt)
- [ ] Export journal as PDF / JSON
- [ ] Add breathing exercise animations
- [ ] Multi-language support
- [ ] Add unit tests with Jest

---

## 🆘 Mental Health Disclaimer

MindBloom is a **wellness journaling tool**, not a substitute for professional mental health care. If you are in crisis:
- 🇮🇳 India: **iCall — 9152987821**
- 🌍 International: **findahelpline.com**

---

## 👩‍💻 Built By

**Tuba Khan** — AI/ML Engineer  
CNN model trained on FER-2013 with TensorFlow/Keras  
Integrated into browser via TensorFlow.js

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for full details.

---

*🌿 MindBloom — Nurture Your Mind, one entry at a time*
