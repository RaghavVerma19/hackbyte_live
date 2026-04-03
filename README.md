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
3. Start signaling server with `npm run signaling`
4. Start frontend with `npm run dev`

## Notes

- Replace the TURN placeholders in `.env.local` before production deployment.
- The signaling server supports multiple concurrent rooms using an in-memory room map.
- WebRTC cleanup runs on leave and disconnect to reduce orphaned peer connections.
