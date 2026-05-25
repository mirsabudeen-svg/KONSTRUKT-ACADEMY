# KONSTRUKT Academy — Supabase Setup Guide

## 1. Create Supabase project

Create a project at [supabase.com](https://supabase.com) and copy:

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role (server only) |

Add these to `.env.local` in `konstrukt-academy/`.

---

## 2. Migration order

Run in **Supabase Dashboard → SQL Editor** in this order:

| # | File | Purpose |
|---|------|---------|
| 1 | `supabase/migrations/002_foundation_prd_schema.sql` | Core schema, ENUMs, RLS, cohorts |
| 2 | `supabase/migrations/003_submission_code_stl.sql` | `code` / `stl` submission types + storage bucket |
| 3 | `supabase/migrations/004_tutor_conversations.sql` | AI tutor chat tables + RLS |
| 4 | `supabase/migrations/005_trainer_review_notifications.sql` | Submission feedback + notifications |
| 5 | `supabase/migrations/006_gamification.sql` | XP, streaks, challenges, leveling |

> **Do not run** legacy `001_schema.sql` — `002` replaces it.

---

## 3. Clerk JWT template (required for RLS)

Clerk Dashboard → **JWT Templates** → **New template**:

- **Name:** `supabase` (must match `getToken({ template: 'supabase' })` in code)
- **Algorithm:** HS256
- **Signing key:** Supabase **JWT Secret** (Project Settings → API → JWT Settings)

Claims:

```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "sub": "{{user.id}}"
}
```

Enable the template for your application.

---

## 4. Clerk webhook (recommended)

Clerk → **Webhooks** → endpoint:

```
https://your-domain.com/api/webhooks/clerk
```

Events: `user.created`, `user.updated`, `user.deleted`

Copy signing secret → `CLERK_WEBHOOK_SECRET` in `.env.local`

The webhook upserts `users` rows and creates default progress for new students.

---

## 5. Create test users in Clerk

Clerk Dashboard → **Users** → **Create user**

Create these **6 users** (same password for local testing):

| # | Email | Password | Public metadata |
|---|-------|----------|-----------------|
| 1 | `admin@konstrukt.io` | `Test1234!` | `{"role": "admin"}` |
| 2 | `trainer1@konstrukt.io` | `Test1234!` | `{"role": "trainer"}` |
| 3 | `trainer2@konstrukt.io` | `Test1234!` | `{"role": "trainer"}` |
| 4 | `student1@konstrukt.io` | `Test1234!` | `{"role": "student"}` |
| 5 | `student2@konstrukt.io` | `Test1234!` | `{"role": "student"}` |
| 6 | `student3@konstrukt.io` | `Test1234!` | `{"role": "student"}` |

Copy each user's **Clerk User ID** (`user_…`).

---

## 6. Run seed data

Open `supabase/seed.sql` and replace every placeholder:

| Placeholder | Assign to |
|-------------|-----------|
| `[ADMIN_CLERK_ID]` | admin@konstrukt.io |
| `[TRAINER_1_CLERK_ID]` | trainer1@konstrukt.io |
| `[TRAINER_2_CLERK_ID]` | trainer2@konstrukt.io |
| `[STUDENT_1_CLERK_ID]` | student1@konstrukt.io |
| `[STUDENT_2_CLERK_ID]` | student2@konstrukt.io |
| `[STUDENT_3_CLERK_ID]` | student3@konstrukt.io |

Run the full script in **SQL Editor**.

### What gets seeded

- **10 modules** — full curriculum track
- **2 cohorts** — Kannur (trainer1) + Kozhikode (trainer2)
- **3 students** at different progress stages (advanced / beginner / fresh)
- **5 submissions** — approved + pending samples
- **4 print queue items** — completed + waiting
- **2 tutor conversations** — sample Socratic chats

---

## 7. Verify seed

Run `supabase/verify.sql` in SQL Editor.

Expected counts:

```
modules             → 10
cohorts             → 2
progress            → 30  (3 students × 10 modules)
submissions         → 5
print_queue         → 4
tutor_conversations → 2
tutor_messages      → 6
```

Full manual QA: `docs/TEST_CHECKLIST.md`

---

## 8. Local dev

```bash
cd konstrukt-academy
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in as a test user.

### Required env vars

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

See `.env.example` for the full list.

---

## 9. Cohort notes

- **Batch 01 — Kannur:** student1, student2 → trainer1
- **Batch 02 — Kozhikode:** student3 → trainer2

Trainers only see students in cohorts where `cohorts.trainer_id` matches their Clerk ID. Admins see all.

---

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| RLS blocks all queries | Confirm Clerk JWT template `supabase` + HS256 secret |
| User has no progress | Run seed or sign up via webhook; `ensureStudentProfile` backfills |
| Trainer dashboard empty | Assign `trainer_id` on cohort + student `cohort_id` |
| Seed fails on FK | Replace **all** `[…_CLERK_ID]` placeholders before running |
| Tutor chat empty | Run migration `004` + set `OPENAI_API_KEY` |
