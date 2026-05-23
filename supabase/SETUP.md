# Supabase setup

## 1. Create project

Create a project at [supabase.com](https://supabase.com) and copy:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role key → `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose to client)

## 2. Run SQL

In **SQL Editor**, run in order:

1. **`supabase/migrations/002_foundation_prd_schema.sql`** — full PRD schema (ENUMs, cohorts, RLS)
2. **`supabase/migrations/003_submission_code_stl.sql`** — `code` / `stl` submission types + storage bucket
3. **`supabase/seed.sql`** — 10 mission modules

> **Note:** `002` replaces the earlier `001_schema.sql`. Do not run both. `002` drops and recreates core tables (dev reset). Backup first if you have production data.

## 3. Clerk JWT template (required for RLS)

In [Clerk Dashboard](https://dashboard.clerk.com) → **JWT Templates** → **New template**:

- Name: `supabase` (must match code: `getToken({ template: 'supabase' })`)
- Signing algorithm: HS256
- Signing key: paste your Supabase **JWT Secret** (Project Settings → API → JWT Settings)

Claims:

```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "sub": "{{user.id}}"
}
```

Enable the template for your application.

## 4. Clerk webhook (recommended)

Clerk → **Webhooks** → endpoint:

`https://your-domain.com/api/webhooks/clerk`

Events: `user.created`, `user.updated`, `user.deleted`

Copy signing secret → `CLERK_WEBHOOK_SECRET` in `.env.local`

## 5. Cohort setup (trainers)

After migration, create cohorts via SQL or Phase 4 admin UI:

```sql
INSERT INTO cohorts (name, start_date, trainer_id)
VALUES ('Batch 01 - Kannur', '2026-06-01', 'clerk_trainer_user_id');

UPDATE users SET cohort_id = '<cohort_uuid>' WHERE id = 'clerk_student_user_id';
```

Trainers only see students in cohorts where `cohorts.trainer_id` matches their Clerk id. Admins see all.

## 6. Verify

1. Sign up a test student
2. Assign to a cohort (optional for student self-view; required for trainer RLS)
3. Open `/missions` — Mission 1 **in_progress**, others **locked**
4. Confirm `users`, `progress`, `modules` rows in Table Editor
