# AI Interview Prep Web App

A full-stack web application to generate role-specific interview questions with AI, save interview sessions, and review answers with notes and pinning.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT
- AI: OpenAI Chat Completions API

## Project Structure

```text
.
├─ backend/
│  ├─ config/
│  ├─ controllers/
│  ├─ middlewares/
│  ├─ models/
│  ├─ routes/
│  ├─ scripts/
│  └─ server.js
├─ frontend/
│  ├─ src/
│  └─ vite.config.js
└─ README.md
```

## Prerequisites

- Node.js 18+ (recommended)
- npm
- MongoDB connection string
- OpenAI API key

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
CLIENT_ORIGIN=http://localhost:5173

# Optional model overrides
OPENAI_MODEL_QUESTIONS=gpt-4o-mini
OPENAI_MODEL_EXPLAIN=gpt-4o-mini
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Important:
- Never commit `.env`.
- If a key was exposed previously, rotate/revoke it immediately.

## Installation

Install dependencies for both apps:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run Locally

1. Start backend:

```bash
cd backend
npm run dev
```

2. Start frontend (new terminal):

```bash
cd frontend
npm run dev
```

## Base URL Configuration (Important)

Frontend API base URL is defined in:

- `frontend/src/utils/apiPaths.js`

Current behavior:

```js
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
```

For production, set `VITE_API_BASE_URL` to your deployed backend URL.

## Available Scripts

Backend (`backend/package.json`):

- `npm run start` - start server
- `npm run dev` - start with nodemon

Frontend (`frontend/package.json`):

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - lint project

## API Overview

Base path: `/api`

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile` (protected)

AI:
- `POST /api/ai/generate-questions` (protected)
- `POST /api/ai/generate-explanation` (protected)

Sessions:
- `POST /api/sessions/create` (protected)
- `GET /api/sessions/my-sessions` (protected)
- `GET /api/sessions/:id` (protected)
- `DELETE /api/sessions/:id` (protected)

Questions:
- `POST /api/questions/add` (protected)
- `POST /api/questions/:id/pin` (protected)
- `POST /api/questions/:id/note` (protected)

Protected routes require header:

```http
Authorization: Bearer <token>
```

## Deployment Notes

- Set all backend env vars on your hosting platform.
- Set `CLIENT_ORIGIN` on backend to your deployed frontend URL (comma-separated if multiple).
- Set `VITE_API_BASE_URL` on frontend to your deployed backend URL.
- Ensure CORS allows your deployed frontend URL.
- Keep secrets in environment settings, not in code.
- Vercel SPA routing is configured via `vercel.json` (root and `frontend/vercel.json`) to avoid `404: NOT_FOUND` on client-side routes.

## Troubleshooting

- 401 errors: token missing/expired in `localStorage`.
- 429 errors: OpenAI rate limit or quota issue; retry later.
- 500 on AI routes: verify `OPENAI_API_KEY` and model names.
- Network/CORS errors: confirm frontend `BASE_URL`, backend port, and CORS origin list.
