# DOCTAR Frontend — Next.js

Standalone Next.js web app for DOCTAR: prescription upload/review UI and an
AI health chat assistant (doctor/hospital search, medicine & symptom info,
emergency first-aid guidance, medicine label scanning). Talks to the
[DOCTAR API](../Doctar-AI-Backend) purely over HTTP — no shared code or
build step with the backend, so this app can be deployed independently.

## Stack

- **Next.js 15** (App Router) — **React 19**
- **Tailwind CSS** — styling
- Browser **Web Speech API** for voice input (client-side only, hidden in
  browsers without support, e.g. Firefox)

## Quick start

```bash
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL (see below)
npm install
npm run dev                        # → http://localhost:3000 (redirects to /chat)
```

This app expects the DOCTAR API to be reachable at whatever URL you set in
`NEXT_PUBLIC_API_URL` — it does not bundle or start the backend. Run the
backend separately (see its own README) before using features that hit the
API (chat, prescription upload, auth).

On Windows, `start.bat` runs `npm run dev` for just this app.

Production build:

```bash
npm run build && npm start
```

## Configuration (`.env.local`)

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_API_URL` | Base URL of the DOCTAR API. Local dev default: `http://localhost:8000`. In production, set to the backend's deployed URL. |

Since the frontend and backend are separate deployments, also make sure the
backend's `CORS_ORIGINS` includes this app's actual deployed origin —
otherwise API requests will be rejected by CORS.

## App structure

```
src/
├── app/
│   ├── chat/          # main chat UI route
│   ├── login/ signup/  # auth pages
│   └── page.tsx        # redirects to /chat
├── components/
│   ├── ChatInterface.tsx   # chat UI + voice input
│   ├── ChatWidget*.tsx     # floating chat bubble
│   ├── UploadZone.tsx      # prescription upload
│   └── MedicineEditor.tsx  # review/edit extracted medicines
├── contexts/           # React context providers (e.g. auth)
└── lib/
    ├── api.ts           # prescription API client
    ├── auth.ts           # auth API client
    └── chatSessions.ts   # chat session history API client
```

## Features

| Feature | Notes |
|---------|-------|
| Prescription reader | Upload image/PDF → OCR + AI extraction (backend) → review/edit → download bilingual (EN/HI) PDF |
| AI health chat | Doctor/hospital search, medicine & symptom info, emergency first-aid guidance, all via one backend endpoint; supports English, Hindi, and Hinglish |
| Voice input | Mic button next to Send transcribes speech into the text field for review before sending (never auto-sent) |
| Medicine label scan | Camera button in chat sends a photo to the backend for Gemini-vision label reading |
| Accounts & chat history | Sign up / log in (cookie-based session against the backend); logged-in users get persistent, named chat history in a sidebar. Anonymous chat still works without logging in. |

## Deploy notes

- Standard Next.js app — deployable to any platform that runs `next build` +
  `next start` (Vercel, Railway, a Node host, Docker, etc.). No special
  `next.config.ts` output mode is set, so pick whatever your host expects.
- Set `NEXT_PUBLIC_API_URL` as a build-time/runtime env var on the host —
  it's inlined into the client bundle at build time (`NEXT_PUBLIC_*`
  convention), so it must be set *before* `next build` runs, not just at
  runtime.
- Cookie-based auth requires the backend's `CORS_ORIGINS` to exactly match
  this app's deployed origin. In production (`NODE_ENV=production` on the
  backend) the auth cookie is set with `Secure; SameSite=None`, i.e. it's
  built for exactly this split-repo, cross-site setup (e.g. frontend on
  Vercel, backend on Railway) — both sides must be served over HTTPS, or
  the browser will silently refuse to store/send the cookie.
