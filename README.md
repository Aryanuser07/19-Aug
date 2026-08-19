# 🚀 Team Collaboration Platform

> **Discord / Slack Hybrid Workspace** featuring Real-time Chat Streams, WebRTC Audio/Video Lounge, Admin Drag-and-Drop User Migration, and Encrypted Breakout Mini-Meetings.

![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square&logo=typescript)
![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=flat-square&logo=nodedotjs)
![Socket.io](https://img.shields.io/badge/Socket.io-4.7-black?style=flat-square&logo=socketdotio)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ed?style=flat-square&logo=docker)

---

## 🌟 Key Features

### 💬 Real-Time Chat & Channels
- **Multi-Room Navigation**: Switch between organization rooms (e.g. Common Lounge, MERN Stack Hub, PHP Dev Lounge).
- **Topic-Based Channels**: Instant messaging in `#general-chat`, `#mern-discussion`, `#php-discussion`, etc.
- **Persistent Message Storage**: Backed by MongoDB with real-time Socket.io broadcasting.

### 🎙️ WebRTC Voice & Video Lounge
- **Discord-Style Auto-Connect**: Seamlessly connects to WebRTC audio calls when clicking a voice channel.
- **Live Audio Level Meters**: Web Audio API volume analyzers (`AudioAnalyzer`) render dynamic visual speech indicators around participant cards.
- **Opt-In Video Feeds**: Audio-only media capture by default with camera toggle controls.
- **Mute & Deafen Controls**: Instant local and peer connection sender track silencing.
- **Clean Disconnect & Room Isolation**: Automatic WebRTC peer connection teardown and media track disposal on channel switches to eliminate audio bleed.

### 🎛️ Admin Drag-and-Drop User Migration
- **Kanban-Style Board**: Admins get an exclusive dashboard powered by `@dnd-kit/core`.
- **Forced Channel Move**: Admins can drag any online user card into a channel container to forcibly auto-switch their active channel in real-time.
- **Real-Time WebRTC Migration**: Dragging a user into a voice channel automatically connects their client to the WebRTC lounge.

### 🔐 Private Breakout Mini-Meetings
- **Isolated WebRTC Sessions**: Admins can launch encrypted private breakout rooms.
- **Mid-Call Invites**: Admins inside an ongoing breakout meeting can invite additional online team members mid-call.
- **Smart Participant Filtering**: Invite modals automatically filter out current participants and users already in a breakout session.

### 🛡️ Role-Based Access Control (RBAC) & Multi-Tab Presence
- **Defense-in-Depth Authorization**: Roles (`admin`, `mern-dev`, `php-dev`, `common`) guarded at both Express API routes and Socket ACK callbacks.
- **Multi-Tab Presence Tracking**: Tracks active socket connections per user to prevent premature offline status updates when closing individual browser tabs.

---

## 🛠️ Tech Stack

| Domain | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18 + Vite |
| **Language** | TypeScript |
| **Styling** | Vanilla CSS + Tailwind CSS (Dark Mode Glassmorphism) |
| **State Management** | Zustand (Workspace Store & Auth Store) |
| **Drag & Drop** | `@dnd-kit/core` |
| **Real-time Engine** | Socket.io Client |
| **WebRTC & Audio** | Native WebRTC Peer Connections, Web Audio API |
| **Backend API** | Node.js + Express |
| **Database** | MongoDB + Mongoose |
| **Authentication** | JWT (JSON Web Tokens) + bcryptjs |
| **Containerization** | Docker (Multi-stage build) + Docker Compose |
| **SFU (Optional)** | LiveKit SFU (`livekit-server`) |

---

## 🔑 Demo User Accounts (Auto-Seeded)

The application automatically seeds 4 demo user accounts on boot:

| Role | Email | Password | Allowed Access |
| :--- | :--- | :--- | :--- |
| **Admin Lead** | `admin@team.com` | `admin123` | All Rooms, Drag & Drop Dashboard, Breakout Creator |
| **MERN Developer** | `test_mern@team.com` | `mern123` | Common Area, MERN Stack Hub |
| **PHP Developer** | `peter_php@team.com` | `php123` | Common Area, PHP Dev Lounge |
| **Common User** | `alex_common@team.com` | `common123` | Common Area Only |

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Node.js**: `v20.x` or higher
- **MongoDB**: Local MongoDB instance running on `localhost:27017` or MongoDB Atlas URI

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/Aryanuser07/19-Aug.git
cd 19-Aug

# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

Create `.env` inside `server/`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/team_collaboration
JWT_SECRET=supersecret_jwt_key_team_collaboration_2026
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### 3. Run Development Servers

**Backend API & Socket Server**:
```bash
cd server
npm run dev
# Server running on http://localhost:5000
```

**Frontend React Vite App**:
```bash
cd client
npm run dev
# Frontend running on http://localhost:5173
```

Open `http://localhost:5173` in your browser and use the Quick-Login buttons to switch between Admin and Developer accounts.

---

## 🐳 Running with Docker Compose

To launch MongoDB, Node.js Express API, and LiveKit SFU using Docker Compose:

```bash
# Build and launch all services
docker-compose up --build
```

Services exposed:
- **Client Dev Server**: `http://localhost:5173`
- **Express Backend API**: `http://localhost:5000`
- **MongoDB Database**: `localhost:27017`
- **LiveKit SFU Server**: `localhost:7880`

---

## 📁 Repository Structure

```
.
├── client/                     # Vite React Frontend App
│   ├── src/
│   │   ├── components/        # Layout, Chat, Voice, Admin, Navigation
│   │   ├── config/            # Dev seed user configurations
│   │   ├── hooks/             # useWebRTC signaling & audio hooks
│   │   ├── services/          # Socket.io client & AudioAnalyzer
│   │   ├── store/             # Zustand workspace & auth stores
│   │   └── pages/             # Login & main dashboard pages
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Node.js Express Backend & Socket Server
│   ├── src/
│   │   ├── config/            # Seed user definitions & MongoDB connection
│   │   ├── controllers/       # Auth & Room REST controllers
│   │   ├── middleware/        # JWT auth & RBAC route guards
│   │   ├── models/            # Mongoose schemas (User, Room, Channel, Message)
│   │   ├── sockets/           # Socket.io event handlers & presence store
│   │   └── server.ts          # Server entry point
│   ├── Dockerfile             # Multi-stage production build
│   └── package.json
├── docker-compose.yml          # Multi-container orchestra (Mongo + Express + LiveKit)
├── livekit.yaml                # LiveKit SFU configuration
└── README.md
```

---

## 📡 Key Socket.io API Protocols

| Event Name | Direction | Description |
| :--- | :--- | :--- |
| `chat:send_message` | Client ➔ Server | Send text message with RBAC verification |
| `admin:force_move_user` | Client ➔ Server | Forcibly migrate a user to a target channel |
| `user:force_switch_channel` | Server ➔ Client | Triggers automatic channel switch on target user client |
| `admin:create_breakout` | Client ➔ Server | Create an isolated private mini-meeting |
| `admin:invite_to_breakout` | Client ➔ Server | Invite additional members to an active breakout |
| `breakout:invited` | Server ➔ Client | Real-time pop-up invitation for breakout session |
| `webrtc:join_voice_room` | Client ➔ Server | Join WebRTC mesh audio/video channel |
| `webrtc:signal` | Client ➔ Server ➔ Client | WebRTC SDP Offer/Answer and ICE candidate exchange |
| `presence:sync` | Server ➔ Client | Real-time workspace online presence broadcast |

---

## 📄 License

This project is proprietary and confidential. Copyright © 2026. All Rights Reserved.
