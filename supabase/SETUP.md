# Supabase setup (Phase 2)

## 1. Create project

Create a project at [supabase.com](https://supabase.com) and copy:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role key → `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose to client)

## 2. Run SQL

In **SQL Editor**, run in order:

1. `supabase/migrations/001_schema.sql`
2. `supabase/seed.sql`

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

> First dashboard visit also runs `ensureStudentProfile` if the webhook has not fired yet.

## 5. Third-party auth (optional)

Supabase Dashboard → **Authentication** → **Third-party** → enable **Clerk** and link your Clerk instance for native JWT verification.

## 6. Verify

1. Sign up a test student
2. Open `/missions` — Mission 1 should be **In Progress**, 2–10 **Locked**
3. In Supabase Table Editor, confirm `users` and `progress` rows exist

To test unlock logic manually, set Mission 1 `progress.status` to `completed` in SQL — Mission 2 should show **Ready** on refresh.
