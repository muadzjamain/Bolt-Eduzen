# EduZen

EduZen is an AI-powered educational platform that combines study assistance with well-being support.

## Features

- **AI Study Companion**
  - OCR for lecture notes and textbooks
  - AI-powered summarization
  - Automated quiz generation
  - Progress tracking
  - Google Workspace integration

- **Well-being Assistant**
  - Mental health support
  - Stress detection
  - Guided breathing exercises
  - Study-life balance scheduling

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your Google Cloud and Firebase credentials:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_GOOGLE_CLOUD_VISION_API_KEY=your_vision_api_key
```

3. Start the development server:
```bash
npm start
```

## Tech Stack

- React
- Firebase
- Google Cloud Vision API
- Google Gemini API
- Firebase ML Kit
- Google Dialogflow
- Material-UI
