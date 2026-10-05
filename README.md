# Ma Voiture

A French-language web app to track what your cars cost: fuel fills and EV charging, maintenance, insurance and other expenses, with reminders and statistics. Vehicles can be shared with your family.

**Live:** [ma-voiture-sandy.vercel.app](https://ma-voiture-sandy.vercel.app). Use **« Essayer la démo »** to explore it without an account.

## Features

- **Garage:** your vehicles (petrol, diesel, hybrid, plug-in hybrid, electric), odometer, photo, documents.
- **Expenses:** fuel fills and charges (full-tank consumption), maintenance, insurance instalments and other costs, with attachments (photos, PDF).
- **Maintenance:** history and a timeline. A maintenance entry with an interval creates its next reminder automatically.
- **Insurance:** contracts per vehicle. The monthly instalments are generated as expenses.
- **Reminders:** by date or odometer, optionally recurring, with overdue and due-soon badges.
- **Statistics:** charts per vehicle and period, consumption, cost per km and CO₂ per km.
- **Family:** create or join families with an invite link, then share each vehicle as read-only or editable.
- **Demo mode:** a per-visitor sandbox with seeded data and a guided tour. Nothing is written to the database.

## Stack

- [Next.js 15](https://nextjs.org) (App Router, React Server Components, middleware), React 18, TypeScript
- [Supabase](https://supabase.com): Postgres with row-level security, Auth, Storage
- Tailwind CSS 4, Motion, Recharts
- Vitest + Testing Library, ESLint, Prettier, GitHub Actions
- Deployed on Vercel

## Getting started

Requirements: Node.js 22 and a Supabase project that has this app's schema.

```bash
git clone https://github.com/alxandre-r/ma-voiture.git
cd ma-voiture
npm install
cp .env.example .env.local   # then fill in the three values
npm run dev                  # http://localhost:3000
```

| Variable | Where to find it | Exposed to the browser |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page, `anon` key | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, `service_role` key | **no**: server only, it bypasses RLS |

> The database schema (tables, views, RLS policies, triggers, RPCs) lives in the Supabase project. It is not versioned as migrations in this repository yet, so a fresh project cannot be bootstrapped from the repo alone. The demo mode (`/demo`) runs without any database.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve it |
| `npm test` | Run the test suite once (`test:watch`, `test:ui` also exist) |
| `npm run lint` | ESLint (including the accessibility rules) |
| `npx tsc --noEmit` | Type-check, tests included |
| `npx prettier --write .` | Format |

CI (`.github/workflows/ci.yml`) runs the type-check, ESLint and the tests on every push to `main` and on every pull request.

## How it is built

- **Reads happen on the server.** Each page (`app/(app)/<page>/page.tsx`) is a Server Component. It loads its data through `lib/data/*` (deduplicated with React `cache()`) and passes it to a `*Client.tsx` component. Filtering by vehicle and period happens on the client.
- **Writes go through API routes.** Client hooks call `app/api/*` and then run `router.refresh()`. The routes validate their bodies (`lib/validation/body.ts`) and check access rights (`lib/api/vehicleAccess.ts`). Multi-row writes go through Postgres functions, so they are atomic.
- **Security relies on the database.** Queries run as the signed-in user under row-level security. The service-role client (`lib/supabase/admin.ts`) is used only by a few routes, and only after an explicit check in code.
- **Middleware** (`middleware.tsx`) refreshes the Supabase session and protects the private pages.
- **Demo mode.** A `mv_demo` cookie swaps the whole backend for a sandbox:
  - every data fetcher has a demo twin in `lib/demo/data.ts`;
  - every API route has a demo handler in `lib/demo/api/`;
  - the visitor's changes are kept as a compressed journal in the cookie.

## Deployment

The app is deployed on Vercel. Set the three environment variables in the Vercel project settings. For authentication emails, also set the Site URL in Supabase → Authentication → URL Configuration.
