# KONSTRUKT Academy — Test Checklist

Use this after running migrations, creating Clerk test users, and executing `supabase/seed.sql` with real Clerk IDs.

Test password for all seeded accounts: `Test1234!`

---

## Auth Tests

- [ ] Sign up as new student → lands on `/dashboard`
- [ ] Sign in as `trainer1@konstrukt.io` → can access `/trainer/dashboard`
- [ ] Sign in as `student1@konstrukt.io` → cannot access `/trainer/dashboard` (redirects)
- [ ] Sign in as `admin@konstrukt.io` → can access `/trainer/dashboard`

---

## Student Dashboard Tests

- [ ] `student1@konstrukt.io` → sees **4 completed**, **1 in_progress**, **5 locked**
- [ ] `student2@konstrukt.io` → sees **1 completed**, **1 pending_review**, **8 locked**
- [ ] `student3@konstrukt.io` → sees **1 in_progress**, **9 locked**
- [ ] Locked modules show lock icon
- [ ] Completed modules show badge
- [ ] In-progress modules show continue button

---

## Mission Tests

- [ ] Click unlocked mission → goes to `/missions/[id]`
- [ ] See mission brief + checklist
- [ ] Submit form appears for in-progress missions
- [ ] Submit code → progress changes to `pending_review`
- [ ] Locked missions show "Mission locked" message

---

## AI Tutor Tests

- [ ] Tutor chat button (🤖) appears on unlocked missions
- [ ] Ask "What is a servo?" → educational Socratic response
- [ ] Ask "Write the code for me" → guiding response (not full solution)
- [ ] Refresh page → conversation history loads
- [ ] Switch missions → separate conversation per module

---

## Trainer Tests

- [ ] Login as `trainer1@konstrukt.io`
- [ ] Access `/trainer/dashboard`
- [ ] See print queue with test items (completed + waiting)
- [ ] Move card between Kanban columns
- [ ] Click Refill +5 → student tokens increase
- [ ] Trainer 1 sees Batch 01 students only (student1, student2)
- [ ] Trainer 2 sees Batch 02 student (student3) only

---

## Token Tests

- [ ] Student 1 with 8 tokens → shows **8** in sidebar
- [ ] After AI Terminal generation → tokens decrease by 1
- [ ] Student with 0 tokens → generation disabled on `/ai-terminal`
- [ ] Trainer refill → tokens increase by 5

---

## Supabase Verification

Run `supabase/verify.sql` in SQL Editor and confirm:

| Table | Expected count |
|-------|----------------|
| modules | 10 |
| cohorts | 2 |
| progress | 30 |
| submissions | 5 |
| print_queue | 4 |
| tutor_conversations | 2 |
| tutor_messages | 6 |

---

## Environment

- [ ] `.env.local` has Clerk, Supabase, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- [ ] Clerk JWT template `supabase` configured (HS256 + JWT secret)
- [ ] Clerk webhook → `/api/webhooks/clerk` (optional but recommended)
