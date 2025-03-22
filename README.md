# CodeColab

## Overview

CodeColab is a real-time collaborative coding platform designed for developers, educators, and technical teams who need a seamless workspace for remote programming, brainstorming, and discussions. This platform integrates live code editing, an interactive whiteboard, and video communication, enabling users to work together efficiently without switching between multiple applications.

## Key Features

✅ **Real-Time Code Editing** – Supports collaborative coding with syntax highlighting and auto-completion
✅ **Interactive Whiteboard** – Allows users to draw diagrams, visualize ideas, and share notes
✅ **Live Video & Audio Chat** – Facilitates instant communication during coding sessions
✅ **User Authentication & Session Management** – Secure login and private collaboration sessions
✅ **Code Execution** – Run code in a secure environment with multiple language support

## Technology Stack

- **Frontend**: React 19, Monaco Editor, Fabric.js, PeerJS (WebRTC)
- **Backend**: Node.js, Express, Socket.IO
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Deployment**: Firebase Hosting, Node.js (Express) Backend

## Project Structure

```
codecolab/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── contexts/   # React context providers
│   │   ├── hooks/      # Custom React hooks
│   │   ├── pages/      # Page components
│   │   ├── services/   # API services
│   │   ├── styles/     # CSS styles
│   │   └── utils/      # Utility functions
│   └── public/         # Static assets
├── backend/            # Node.js backend
│   ├── src/
│   │   ├── routes/     # API routes
│   │   ├── middleware/ # Express middleware
│   │   ├── socket/     # Socket.IO handlers
│   │   ├── config/     # Configuration
│   │   └── utils/      # Utility functions
└── firebase/           # Firebase configuration and functions
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Firebase account

### Setup Instructions

#### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your Firebase and API keys:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   VITE_RAPIDAPI_KEY=your_judge0_api_key
   ```
4. Start the development server:
   ```
   npm run dev
   ```

#### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your configuration:
   ```
   PORT=3000
   PEER_PORT=9000
   FRONTEND_URL=http://localhost:5173
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_client_email
   ```
4. Start the development server:
   ```
   npm run dev
   ```

## Use Cases

- **Pair Programming & Code Reviews** – Developers can code together in real time
- **Remote Coding Interviews** – Recruiters can assess candidates in a live coding environment
- **Online Coding Workshops** – Educators can teach coding interactively
- **Team Collaboration** – Teams can brainstorm, debug, and build software together

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.
