# HackByte Live

Low-latency video calling app built with Next.js App Router, Tailwind CSS, Socket.io, and WebRTC via `simple-peer`.

## Folder structure

```text
hackbyte_live/
|-- app/
|   |-- globals.css
|   |-- layout.tsx
|   |-- page.tsx
|   `-- room/
|       `-- [id]/
|           `-- page.tsx
|-- components/
|   |-- control-bar.tsx
|   |-- room-client.tsx
|   |-- theme-provider.tsx
|   |-- theme-toggle.tsx
|   `-- video-tile.tsx
|-- lib/
|   `-- utils.ts
|-- server/
|   `-- server.js
|-- .env.example
|-- .gitignore
|-- next.config.ts
|-- next-env.d.ts
|-- package.json
|-- postcss.config.js
|-- README.md
|-- tailwind.config.ts
`-- tsconfig.json
```

## Run locally

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Start backend/signaling server from `C:\Users\DELL\Desktop\hack_byte_node`
4. Start frontend with `npm run dev`

## Separate deployment

Frontend:

- Deploy the Next.js app to Vercel.
- Set `NEXT_PUBLIC_API_BASE_URL` to the public URL of your backend.
- Set `NEXT_PUBLIC_SIGNALING_SERVER_URL` to the public URL of your signaling server.
- Twilio TURN credentials are no longer stored in frontend env vars. The frontend fetches ICE servers from the backend after login.

Backend / signaling server:

- Deploy [server.js](C:\Users\DELL\Desktop\hack_byte_node\server.js) on a Node host like Render, Railway, Fly.io, or a VPS.
- Use [package.json](C:\Users\DELL\Desktop\hack_byte_node\package.json) in the backend project.
- Set `PORT` from your host platform.
- Set `JWT_SECRET` to a strong random value.
- Set `CLIENT_URL` or `CLIENT_URLS` so API and Socket.io CORS allow your frontend domain.
- Set `TRUST_PROXY=true` when deploying behind a reverse proxy.
- Set `TWILIO_ACCOUNT_SID` plus either `TWILIO_API_KEY` and `TWILIO_API_SECRET`, or `TWILIO_AUTH_TOKEN`, to enable Twilio Network Traversal Service.

Example signaling env:

```text
NODE_ENV=production
PORT=4000
JWT_SECRET=replace-with-a-long-random-secret
TRUST_PROXY=true
CLIENT_URLS=https://your-frontend-domain.vercel.app
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your-twilio-api-secret
TWILIO_NTS_TTL=3600
```

## Notes

- Twilio ICE credentials are served from the backend, so there are no TURN secrets in the frontend env anymore.
- The signaling server supports multiple concurrent rooms using an in-memory room map.
- WebRTC cleanup runs on leave and disconnect to reduce orphaned peer connections.
- Production deployments need a separately hosted backend/signaling server plus a real TURN service for restrictive networks.
