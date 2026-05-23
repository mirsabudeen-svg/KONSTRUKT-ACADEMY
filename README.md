# KONSTRUKT Robotics Academy

Premium dark-mode LMS for students ages 9–16. Built with Next.js App Router, Tailwind CSS, shadcn/ui, and Clerk.

## Phase 1 ✓

- Next.js 16 + Tailwind v4 + shadcn/ui
- Clerk auth with protected routes
- Spaceship dashboard shell with sidebar

## Phase 2 ✓

- Supabase schema + RLS, mission track, strict unlock logic

## Phase 3 (current)

- AI Terminal split UI (chat + WHAT/STYLE/DETAILS prompt assistant)
- Vercel AI SDK + Claude (`/api/chat`) with Kontraktor system prompt (Brownout Rule)
- Token check + deduct 1 per generation via Supabase

## Quick start

```bash
cd konstrukt-academy
cp .env.example .env.local
# Add Clerk keys from https://dashboard.clerk.com
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Clerk setup

1. Create a Clerk application.
2. Copy publishable and secret keys into `.env.local`.
3. Enable sign-in/sign-up paths: `/sign-in`, `/sign-up`.
4. (Phase 2) Add a JWT template named `supabase` for Supabase RLS.

## Roadmap

| Phase | Scope |
|-------|--------|
| 1 | Scaffolding, Clerk, sidebar ✓ |
| 2 | Supabase, mission track, lock/unlock ✓ |
| 3 | AI Terminal, Claude, token deduction ✓ |
| 4 | Admin print queue Kanban, trainer token refills |

## Project rules

See the master architecture doc in your Cursor rules / project brief for schema, hardware constraints (sequential servo motion), and token economy.
