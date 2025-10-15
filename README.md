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

