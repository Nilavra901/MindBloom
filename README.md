# MindBloom

AI-powered Mental Health & Memory Assistance Platform

---

## Overview

MindBloom is an AI-based system designed to assist users in maintaining mental well-being and preserving personal memories. The platform enables users to interact through text or voice, store meaningful experiences, and gain insights into emotional patterns.

The system focuses on combining **AI interaction, memory tracking, and visualization** to provide a supportive digital environment.

---

## Features

* AI-based conversational assistant for mental support
* Memory storage and retrieval system
* Voice and text interaction support
* Emotion-aware responses (basic level)
* Dashboard for insights and activity tracking
* Visualization of stored memories

---

## Tech Stack

### Frontend

* React.js
* Tailwind CSS

### Backend

* FastAPI
* Python

### Database

* MongoDB

### AI Integration

* Optimized AI model with improved performance and reduced complexity 

---

## Project Structure

```
MindBloom/
│
├── frontend/        # React application
├── backend/         # FastAPI server
├── models/          # AI / data models
├── utils/           # Helper functions
├── requirements.txt
└── README.md
```

---

## Installation

### Clone the repository

```bash
git clone https://github.com/RajanyaSaha-27/MindBloom.git
cd MindBloom
```

---

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Create a `.env` file in the backend directory:

```
MONGO_URI=your_mongodb_uri
GEMINI_API_KEY=your_api_key
```

---

## Usage

1. Start backend server
2. Run frontend application
3. Open browser at:

```
http://localhost:5173
```

4. Interact with the AI assistant
5. Store and explore memories

---

## Use Cases

* Personal mental health tracking
* Memory journaling
* Emotional pattern observation
* AI-based conversational support

---

## Limitations

* Emotion detection is not highly advanced
* Depends on external AI API availability
* Limited personalization in current version

---

## Future Improvements

* Advanced emotion detection using ML
* Personalized recommendations
* Mobile application support
* Multi-user / caregiver mode

---

## Contributing

Contributions are welcome.

```
Fork → Clone → Create Branch → Commit → Push → Pull Request
```

---
