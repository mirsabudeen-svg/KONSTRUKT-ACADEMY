# KONSTRUKT Robotics Academy

Premium dark-mode LMS for students ages 9–16. Built with Next.js App Router, Tailwind CSS, shadcn/ui, and Clerk.

## Phase 1 ✓

- Next.js 16 + Tailwind v4 + shadcn/ui
- Clerk auth with protected routes
- Spaceship dashboard shell with sidebar

## Phase 2 (current)

- Supabase schema (`users`, `modules`, `progress`, `print_queue`) + RLS
- Clerk JWT → Supabase (`supabase` template) + webhook user sync
- 10-module mission track with strict unlock (N+1 after N completed)
- Live AI token count from `users.tokens_remaining`

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
| 3 | AI Terminal (Vercel AI SDK + Claude), token deduction |
| 4 | Admin print queue Kanban, trainer token refills |

## Project rules

See the master architecture doc in your Cursor rules / project brief for schema, hardware constraints (sequential servo motion), and token economy.
