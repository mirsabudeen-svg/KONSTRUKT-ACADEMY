# KONSTRUKT Academy — Pre-Deployment Checklist

## Build

- [ ] `npm run build` passes with 0 errors
- [ ] No TypeScript errors
- [ ] No ESLint errors (`npm run lint`)
- [ ] Bundle size acceptable

## Database

- [ ] All migrations run (001–012)
- [ ] Seed data verified
- [ ] RLS policies tested
- [ ] Indexes created

## Environment Variables

- [ ] All 7 required vars set
- [ ] No dev vars in production
- [ ] `NEXT_PUBLIC_APP_URL` set to Vercel URL

Required variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_MESHY_API_KEY`

## Features

- [ ] Auth flow works (sign in/out)
- [ ] Student dashboard loads
- [ ] Mission submission works
- [ ] AI Tutor responds
- [ ] Trainer review + approval works
- [ ] XP awarded correctly
- [ ] Notifications appear
- [ ] Mobile layout works

## Security

- [ ] Rate limiting active
- [ ] Input sanitization in place
- [ ] Security headers configured
- [ ] No `console.log` with sensitive data

## Performance

- [ ] Largest pages load < 3s
- [ ] No memory leaks
- [ ] Images optimized
