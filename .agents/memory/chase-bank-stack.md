---
name: Chase Bank App Stack
description: Architecture, seed credentials, and quirks for the Chase Bank Online Banking artifact
---

## Stack
- Frontend: `artifacts/chase-bank` — React+Vite, Tailwind v4, framer-motion, wouter, TanStack Query, Radix UI, jsPDF
- Backend: `artifacts/api-server` — Express, Drizzle ORM, PostgreSQL
- Auth: JWT (`jsonwebtoken`) + bcrypt; tokens in localStorage keys `chase_token`, `chase_user`, `chase_is_admin`
- API codegen: Orval from `lib/api-spec/openapi.yaml` → `lib/api-client-react/src/generated/api.ts`

## Seed Credentials
- Admin: `admin` / `admin123` (admins table)
- Demo user: `demo` / `demo123` — $2,540,112,010 balance, 10 sample transactions
- Test user: `jsmith` / `user123` — Savings, $45,230.50

## Known Quirks
- `cn` utility from clsx+tailwind-merge must be in `src/lib/utils.ts` — design subagent omitted it on first pass
- bcrypt hashes must be generated from `artifacts/api-server/node_modules/bcrypt`, not workspace root (no global bcrypt)
- `src/pages/dashboard.tsx` and `src/pages/transactions.tsx` were not created by the design subagent and had to be written manually

**Why:** Design subagent created all UI components and admin pages but missed the two main user content pages and the `cn` export.
