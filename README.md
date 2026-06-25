# Real-Time Chat App

JWT auth + one-to-one real-time chat with Socket.IO, online/offline presence, and persisted message history.
![Login page](https://github.com/pranavmali18/Real-time-communication-/blob/bea665597950a4184df443d4dff018ff3b821f90/assets/login.png)

## Stack
- **Backend:** Node.js, Express, Socket.IO, MongoDB (Mongoose), JWT, bcrypt
- **Frontend:** React (Vite), React Router, Tailwind CSS, `socket.io-client`, Axios

## Project structure
```
chat-app/
├── server/
│   ├── src/
│   │   ├── config/db.js          # MongoDB connection via Mongoose
│   │   ├── models/User.js        # Mongoose User schema + queries
│   │   ├── models/Message.js     # Mongoose Message schema + queries
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

## Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas URI)

### Start MongoDB locally
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

## Setup

### 1. Backend
```bash
cd server
npm install
# edit .env if needed — JWT_SECRET and MONGO_URI especially before deploying
npm run dev      # starts on http://localhost:4000
```
You should see **"MongoDB connected"** in the terminal. Collections are created automatically on first use — no separate DB setup needed.

### 2. Frontend
```bash
cd client
npm install
npm run dev       # starts on http://localhost:5173
```

Open two browser windows (or one normal + one incognito) at `http://localhost:5173`, sign up two different users, and chat between them in real time.

## Environment variables (`server/.env`)
| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | HTTP server port |
| `MONGO_URI` | `mongodb://localhost:27017/chat-app` | MongoDB connection string |
| `JWT_SECRET` | *(set this!)* | Secret used to sign JWT tokens |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin |

## How the pieces fit together

**Auth (JWT)**
- `POST /api/auth/signup` and `/login` return `{ token, user }`. The token is stored in `localStorage` and attached to every REST request via an Axios interceptor, and passed during the Socket.IO handshake (`socket.handshake.auth.token`).
- `requireAuth` middleware verifies the token for REST routes; the Socket.IO `io.use()` middleware verifies it for the websocket connection.

**Real-time messaging (Socket.IO)**
- Each authenticated socket joins a personal room `user:<id>`.
- Sending a message (`message:send`) persists it to MongoDB, then emits `message:new` to both the receiver's room and the sender's room (so other open tabs of the sender also update).
- Typing indicators (`typing:start` / `typing:stop`) and read receipts (`messages:read`) are also room-targeted events.

**Online/Offline status**
- An in-memory `Map<userId, Set<socketId>>` tracks active sockets per user (supports multiple tabs/devices).
- On a user's *first* socket connecting, the server sets `is_online: true` in MongoDB and broadcasts `user:online`.
- On their *last* socket disconnecting, it sets `is_online: false`, stamps `last_seen`, and broadcasts `user:offline`.

**Message history**
- All messages are persisted in the `messages` collection. `GET /api/messages/:userId` returns the conversation between the current user and `:userId`, with `limit`/`beforeId` cursor-based pagination for infinite-scroll-style loading.
- `GET /api/messages/conversations` powers the sidebar: each conversation partner plus their last message and unread count, via a MongoDB aggregation pipeline.

**MongoDB ObjectId normalization**
- All model methods convert `_id` → `id` (string) before returning data, so the frontend never needs to handle raw ObjectIds.

## Verify data in MongoDB
```bash
mongosh
use chat-app
db.users.find().pretty()
db.messages.find().pretty()
```

## Notes / next steps if you extend this
- **Production secrets:** generate a real `JWT_SECRET` (e.g. `openssl rand -hex 32`) and use a proper `MONGO_URI` (e.g. MongoDB Atlas) before deploying.
- **Scaling Socket.IO horizontally:** the online-users map is in-process; if you run multiple server instances you'll want the [Socket.IO Redis adapter](https://socket.io/docs/v4/redis-adapter/) so presence and message delivery work across instances.
- **Group chat:** the schema is 1:1 (`sender_id`/`receiver_id`). Adding group chat would mean a `conversations` + `members` collection instead.
- **File/image messages:** currently text-only; would need an upload endpoint (e.g. S3/Cloudinary) and a `type`/`attachment_url` field on messages.
# Real-Time Chat App

JWT auth + one-to-one real-time chat with Socket.IO, online/offline presence, and persisted message history.

## Stack
- **Backend:** Node.js, Express, Socket.IO, MongoDB (Mongoose), JWT, bcrypt
- **Frontend:** React (Vite), React Router, Tailwind CSS, `socket.io-client`, Axios

## Project structure
```
chat-app/
├── server/
│   ├── src/
│   │   ├── config/db.js          # MongoDB connection via Mongoose
│   │   ├── models/User.js        # Mongoose User schema + queries
│   │   ├── models/Message.js     # Mongoose Message schema + queries
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

## Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas URI)

### Start MongoDB locally
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

## Setup

### 1. Backend
```bash
cd server
npm install
# edit .env if needed — JWT_SECRET and MONGO_URI especially before deploying
npm run dev      # starts on http://localhost:4000
```
You should see **"MongoDB connected"** in the terminal. Collections are created automatically on first use — no separate DB setup needed.

### 2. Frontend
```bash
cd client
npm install
npm run dev       # starts on http://localhost:5173
```

Open two browser windows (or one normal + one incognito) at `http://localhost:5173`, sign up two different users, and chat between them in real time.

## Environment variables (`server/.env`)
| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | HTTP server port |
| `MONGO_URI` | `mongodb://localhost:27017/chat-app` | MongoDB connection string |
| `JWT_SECRET` | *(set this!)* | Secret used to sign JWT tokens |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin |

## How the pieces fit together

**Auth (JWT)**
- `POST /api/auth/signup` and `/login` return `{ token, user }`. The token is stored in `localStorage` and attached to every REST request via an Axios interceptor, and passed during the Socket.IO handshake (`socket.handshake.auth.token`).
- `requireAuth` middleware verifies the token for REST routes; the Socket.IO `io.use()` middleware verifies it for the websocket connection.

**Real-time messaging (Socket.IO)**
- Each authenticated socket joins a personal room `user:<id>`.
- Sending a message (`message:send`) persists it to MongoDB, then emits `message:new` to both the receiver's room and the sender's room (so other open tabs of the sender also update).
- Typing indicators (`typing:start` / `typing:stop`) and read receipts (`messages:read`) are also room-targeted events.

**Online/Offline status**
- An in-memory `Map<userId, Set<socketId>>` tracks active sockets per user (supports multiple tabs/devices).
- On a user's *first* socket connecting, the server sets `is_online: true` in MongoDB and broadcasts `user:online`.
- On their *last* socket disconnecting, it sets `is_online: false`, stamps `last_seen`, and broadcasts `user:offline`.

**Message history**
- All messages are persisted in the `messages` collection. `GET /api/messages/:userId` returns the conversation between the current user and `:userId`, with `limit`/`beforeId` cursor-based pagination for infinite-scroll-style loading.
- `GET /api/messages/conversations` powers the sidebar: each conversation partner plus their last message and unread count, via a MongoDB aggregation pipeline.

**MongoDB ObjectId normalization**
- All model methods convert `_id` → `id` (string) before returning data, so the frontend never needs to handle raw ObjectIds.

## Verify data in MongoDB
```bash
mongosh
use chat-app
db.users.find().pretty()
db.messages.find().pretty()
```

## Notes / next steps if you extend this
- **Production secrets:** generate a real `JWT_SECRET` (e.g. `openssl rand -hex 32`) and use a proper `MONGO_URI` (e.g. MongoDB Atlas) before deploying.
- **Scaling Socket.IO horizontally:** the online-users map is in-process; if you run multiple server instances you'll want the [Socket.IO Redis adapter](https://socket.io/docs/v4/redis-adapter/) so presence and message delivery work across instances.
- **Group chat:** the schema is 1:1 (`sender_id`/`receiver_id`). Adding group chat would mean a `conversations` + `members` collection instead.
- **File/image messages:** currently text-only; would need an upload endpoint (e.g. S3/Cloudinary) and a `type`/`attachment_url` field on messages.
