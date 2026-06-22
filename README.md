# Real-Time Chat App

JWT auth + one-to-one real-time chat with Socket.IO, online/offline presence, and persisted message history.
![Login page](https://github.com/pranavmali18/Real-time-communication-/blob/bea665597950a4184df443d4dff018ff3b821f90/assets/login.png)

## Stack
- **Backend:** Node.js, Express, Socket.IO, SQLite (`better-sqlite3`), JWT, bcrypt
- **Frontend:** React (Vite), React Router, Tailwind CSS, `socket.io-client`, Axios

## Project structure
```
chat-app/
├── server/
│   ├── src/
│   │   ├── config/db.js          # SQLite connection + schema
│   │   ├── models/User.js        # user queries
│   │   ├── models/Message.js     # message queries
│   │   ├── middleware/auth.js    # JWT verification middleware
│   │   ├── routes/auth.js        # POST /signup, /login
│   │   ├── routes/users.js       # GET /me, GET / (search)
│   │   ├── routes/messages.js    # GET /:userId, GET /conversations
│   │   ├── sockets/index.js      # Socket.IO: presence, messaging, typing
│   │   └── index.js              # server entry point
│   ├── .env
│   └── package.json
└── client/
    ├── src/
    │   ├── context/AuthContext.jsx   # session + socket lifecycle
    │   ├── components/Sidebar.jsx    # conversation list + user search
    │   ├── components/ChatWindow.jsx # message thread, send, typing
    │   ├── components/ProtectedRoute.jsx
    │   ├── pages/Login.jsx, Signup.jsx, Chat.jsx
    │   ├── utils/api.js               # axios instance w/ JWT header
    │   └── App.jsx
    └── package.json
```
![create account page](https://github.com/pranavmali18/Real-time-communication-/blob/bea665597950a4184df443d4dff018ff3b821f90/assets/create%20account.png)
![chat page](https://github.com/pranavmali18/Real-time-communication-/blob/bea665597950a4184df443d4dff018ff3b821f90/assets/ali.png)
![chat page](https://github.com/pranavmali18/Real-time-communication-/blob/bea665597950a4184df443d4dff018ff3b821f90/assets/bob.png)

## Setup

### 1. Backend
```bash
cd server
npm install
# edit .env if needed — JWT_SECRET especially before deploying anywhere real
npm run dev      # starts on http://localhost:4000
```
SQLite database file `chat.db` is created automatically on first run — no separate DB setup needed.

### 2. Frontend
```bash
cd client
npm install
npm run dev       # starts on http://localhost:5173
```

Open two browser windows (or one normal + one incognito) at `http://localhost:5173`, sign up two different users, and chat between them in real time.

## How the pieces fit together

**Auth (JWT)**
- `POST /api/auth/signup` and `/login` return `{ token, user }`. The token is stored in `localStorage` and attached to every REST request via an Axios interceptor, and passed during the Socket.IO handshake (`socket.handshake.auth.token`).
- `requireAuth` middleware verifies the token for REST routes; the Socket.IO `io.use()` middleware verifies it for the websocket connection.

**Real-time messaging (Socket.IO)**
- Each authenticated socket joins a personal room `user:<id>`.
- Sending a message (`message:send`) persists it to SQLite, then emits `message:new` to both the receiver's room and the sender's room (so other open tabs of the sender also update).
- Typing indicators (`typing:start` / `typing:stop`) and read receipts (`messages:read`) are also room-targeted events.

**Online/Offline status**
- An in-memory `Map<userId, Set<socketId>>` tracks active sockets per user (supports multiple tabs/devices).
- On a user's *first* socket connecting, the server flips `is_online = 1` in SQLite and broadcasts `user:online`.
- On their *last* socket disconnecting, it flips `is_online = 0`, stamps `last_seen`, and broadcasts `user:offline`.

**Message history**
- All messages are persisted in the `messages` table. `GET /api/messages/:userId` returns the conversation between the current user and `:userId`, newest-first internally then reversed for chronological display, with `limit`/`beforeId` pagination for infinite-scroll-style loading.
- `GET /api/messages/conversations` powers the sidebar: each conversation partner plus their last message and unread count, via a correlated subquery per partner.

## Notes / next steps if you extend this
- **Production secrets:** generate a real `JWT_SECRET` (e.g. `openssl rand -hex 32`) before deploying.
- **Scaling Socket.IO horizontally:** the online-users map is in-process; if you run multiple server instances you'll want the [Socket.IO Redis adapter](https://socket.io/docs/v4/redis-adapter/) so presence and message delivery work across instances.
- **Group chat:** the schema is 1:1 (`sender_id`/`receiver_id`). Adding group chat would mean a `conversations` + `conversation_members` table instead.
- **File/image messages:** currently text-only; would need an upload endpoint and a `type`/`attachment_url` column on `messages`.
