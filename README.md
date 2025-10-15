# Live Streaming App with Overlays

A full-stack React + Python application to play livestream videos (HLS/MP4) with custom overlays. Users can input a livestream URL, control playback, and manage overlays in real-time.

---

## Table of Contents

- [Project Overview](#project-overview)  
- [Setup Instructions](#setup-instructions)  
- [Running the App](#running-the-app)  
- [Frontend Usage](#frontend-usage)  
- [Backend API Documentation](#backend-api-documentation)  
- [Overlays Management](#overlays-management)  
- [Supported Formats](#supported-formats)  
- [Notes](#notes)  
- [License](#license)  

---

## Project Overview

The project consists of:

1. **Frontend (React)**  
   - Livestream player  
   - Overlay editor  
   - Playback controls: play/pause, volume, timeline  

2. **Backend (Python / FastAPI or Flask)**  
   - CRUD API endpoints for overlays  
   - Stream start/stop endpoints  

---

## Setup Instructions

### Clone the Repository


git clone https://github.com/500085019/Python-Assignment.git
cd Python-Assignment

## Frontend Setup
cd frontend
npm install
npm start

###Backend Setup (Python)
cd backend
python -m venv venv

###Running the App

Start the backend first.

Start the frontend React app.

Open http://localhost:3000 in your browser.

Enter a livestream URL (HLS .m3u8 or MP4) and click Play.


Frontend Usage

Stream URL Input: Paste the HLS or MP4 link.

Playback Controls:

Play / Pause

Volume adjustment

Timeline slider to navigate the video

Overlay Controls:

Toggle overlays on/off

Edit or delete overlays

Add new overlays

### Backend API Documentation
Base URL
http://localhost:5000/api
Overlay Endpoints

GET /overlays – List all overlays

POST /overlays – Create a new overlay

{
  "name": "Live Badge",
  "type": "text",  // "text" or "shape"
  "content": "🔴 LIVE",
  "position": { "x": 20, "y": 20 },
  "size": { "width": 100, "height": 40 },
  "zIndex": 2,
  "opacity": 0.9
}
PUT /overlays/{id} – Update overlay by ID

DELETE /overlays/{id} – Delete overlay by ID

Stream Endpoints

POST /stream/start – Start a livestream

{
  "url": "https://example.com/stream.m3u8",
  "title": "Livestream Session",
  "description": "Active livestream"
}
POST /stream/stop – Stop livestream

GET /stream/status – Check current stream status

### Supported Formats

HLS streams (.m3u8) – Recommended for live streaming

MP4 files (.mp4) – Recorded video

WebM files (.webm) – Optional

### Suported Fomrat
RTSP streams are not supported directly in browsers. Convert RTSP to HLS or MP4 for playback.

### Notes
Ensure the backend is running before starting the frontend.

The frontend dynamically handles HLS streams using hls.js.

Overlays are rendered on top of the video with configurable transparency and positioning.
