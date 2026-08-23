# EstateHub

A property marketplace in the spirit of 99acres / MagicBricks, scoped to a working MVP.
Owners and agents list properties, admins moderate them, and buyers search, shortlist and
enquire.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma 7 and PostgreSQL.
Everything in the stack is open source, and the whole thing deploys to Vercel + a hosted
Postgres for roughly the cost of a domain name.

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Data model](#data-model)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Demo accounts](#demo-accounts)
- [Testing](#testing)
- [API reference](#api-reference)
- [Image storage](#image-storage)
- [Deployment](#deployment)
- [Scripts](#scripts)
- [Known limitations](#known-limitations)

---

## Features

**Authentication** — email/password registration and login, four roles (Buyer, Owner, Agent,
Admin), JWT sessions in an httpOnly cookie, soft-ban support.

**Listings** — create, edit and delete with a multi-image gallery, 20+ fields covering type,
listing intent, price, location, configuration, amenities and contact details. Every new or
edited listing enters a moderation queue before it appears publicly.

**Search** — free-text across title/locality/city/address, filters for city, property type,
rent vs sale, price bracket and minimum bedrooms, three sort orders, and server-rendered
pagination. All filter state lives in the URL, so any search is shareable and bookmarkable.

**Dashboards** — role-aware from a single shell:

| Role | Gets |
|---|---|
| Buyer | Saved properties, recently viewed |
| Owner / Agent | The above, plus My listings, Post a property, Edit/Delete, status control, Enquiries received |
| Admin | The above, plus the moderation queue (approve / reject with reason / delete spam) and user management (change role, suspend) |

**SEO** — server-rendered listing pages, per-page metadata, `RealEstateListing` JSON-LD,
a database-driven `sitemap.xml` and `robots.txt`.

---

## Architecture

### Decisions worth knowing

**One Next.js app, not a split frontend/backend.** Pages are Server Components that query
Postgres directly — no internal HTTP hop, so listing pages render server-side and are
crawlable. Route Handlers exist only for mutations and the one public JSON search endpoint.

**Hand-rolled JWT auth instead of NextAuth.** NextAuth v5 has been in beta for a long time.
For an MVP that has to stay maintainable, roughly 120 lines of explicit session code
(`src/lib/auth/`) beats a beta dependency with implicit behaviour. Same httpOnly-cookie
model, and swapping in NextAuth later means rewriting one directory.

**Authorization is layered, not scattered.**

| Layer | File | Job |
|---|---|---|
| Proxy (edge) | `src/proxy.ts` | Redirect cookie-less visitors away from `/dashboard`. A UX optimisation, *not* the security boundary. |
| Page guards | `src/lib/auth/guards.ts` | `requireUser` / `requireRole` for Server Components. |
| Route guards | `src/lib/api.ts` | `authed` / `authedWithRole` re-read the user row, so a ban or demotion applies immediately rather than at token expiry. |
| Row ownership | each route handler | "is this actually your listing?" checks before every write. |

Each layer is covered by `tests/api-authorization.spec.ts`, so a regression in
any of them fails the build rather than shipping quietly.

**Validation lives in one place.** Zod schemas in `src/lib/validation/` are the single source
of truth; the server re-validates everything regardless of what the client did. Search params
use `.catch()` so a hand-edited query string degrades gracefully instead of throwing a 500.

**URL as state.** Filters, sort and pagination are all query params. No client state library,
the back button works, and results are cacheable.

**Storage is an interface.** `StorageAdapter` has two implementations (`local`, `cloudinary`)
picked by one env var. Adding S3 means writing one file.

### Deliberately not built

No Redis, message queue, microservices, GraphQL, map/geo search, payments or chat. Contact-
seller writes an `Enquiry` row rather than opening a messaging system. These are all
reasonable *next* steps — they are not MVP.

---

## Folder structure

```
Real_estate_website/
├── .github/workflows/ci.yml    # lint → typecheck → unit → e2e
├── tests/                      # Playwright: API + browser
│   ├── global-setup.ts         # migrate, truncate and seed the test database
│   ├── helpers.ts  fixtures.ts
│   ├── api-*.spec.ts           # auth, search, authorization
│   └── e2e-*.spec.ts           # browsing, dashboards
├── prisma/
│   ├── schema.prisma           # models, enums, indexes
│   ├── seed.ts                 # idempotent seeder (users + 20 listings)
│   ├── seed-data.ts            # the 20 sample properties
│   └── migrations/             # SQL migration history
├── storage/uploads/            # local image storage (gitignored, served
│                               #   by /api/files — never from public/)
├── src/
│   ├── app/
│   │   ├── page.tsx            # landing
│   │   ├── properties/         # search + [slug] detail
│   │   ├── login/  register/
│   │   ├── dashboard/          # role-aware: overview, saved, recent,
│   │   │                       #   listings/, enquiries, admin/
│   │   ├── api/                # auth, properties, favorites, enquiries,
│   │   │                       #   uploads, files, admin
│   │   ├── sitemap.ts  robots.ts  not-found.tsx  error.tsx
│   │   └── globals.css         # Tailwind v4 @theme design tokens
│   ├── components/
│   │   ├── ui/                 # Button, Input, Field, Card, Badge, …
│   │   ├── layout/             # header, footer, user menu
│   │   ├── property/           # card, grid, filters, gallery, contact
│   │   ├── home/               # hero, value props, cities, CTA
│   │   ├── auth/               # login/register forms + shell
│   │   └── dashboard/          # property form, uploader, table rows
│   ├── lib/
│   │   ├── prisma.ts           # singleton client (pg driver adapter)
│   │   ├── auth/               # session, password, guards
│   │   ├── storage/            # adapter interface + local + cloudinary
│   │   ├── validation/         # Zod schemas
│   │   ├── queries/            # reusable Prisma queries
│   │   ├── constants.ts  format.ts  api.ts
│   └── proxy.ts                # edge gate for /dashboard
└── .env.example
```

---

## Data model

```
User ─┬─< Property ─┬─< PropertyImage
      │             ├─< Favorite >─┐
      │             ├─< RecentView >┤
      │             └─< Enquiry >───┤
      ├─< Favorite ────────────────┘
      ├─< RecentView
      └─< Enquiry (nullable — anonymous enquiries allowed)
```

Enums: `Role` (BUYER · OWNER · AGENT · ADMIN), `PropertyType` (APARTMENT · VILLA · PLOT ·
COMMERCIAL), `ListingType` (RENT · SALE), `ListingStatus` (PENDING · APPROVED · REJECTED ·
SOLD · INACTIVE).

Notes:

- `Property.status` drives moderation. Public queries hard-code `APPROVED`, so no caller can
  accidentally leak an unreviewed listing.
- `Favorite` and `RecentView` carry a composite unique on `(userId, propertyId)`, which makes
  saving idempotent and lets a re-view bump `viewedAt` instead of inserting a duplicate.
- Prices are `Int` rupees — no floats, no rounding drift.
- `amenities` is a Postgres `text[]`. Promote it to its own table only if you need to filter
  on individual amenities.
- Composite indexes match the real query shapes (`status + city`, `status + listingType +
  type`, `status + price`, `status + createdAt`).
- Deleting a user or property cascades to images, favourites, views and enquiries.

---

## Installation

Requirements: **Node.js 20+** and a **PostgreSQL 14+** database.

```bash
git clone <your-repo-url> estatehub
cd estatehub
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate          # create the schema
npm run db:seed             # 4 demo users + 20 listings with photos
npm run dev
```

Open <http://localhost:3000>.

> The seeder downloads ~15 sample photos from Unsplash into `storage/uploads/` so the demo is
> self-contained. Without a network connection it still succeeds — listings just render with
> a placeholder graphic.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. |
| `AUTH_SECRET` | yes | ≥32 chars, signs session JWTs. Generate: `openssl rand -base64 32`. |
| `AUTH_SESSION_DAYS` | no | Session lifetime in days (default `7`). |
| `STORAGE_DRIVER` | no | `local` (default) or `cloudinary`. |
| `CLOUDINARY_CLOUD_NAME` | if cloudinary | From your Cloudinary dashboard. |
| `CLOUDINARY_API_KEY` | if cloudinary | " |
| `CLOUDINARY_API_SECRET` | if cloudinary | Server-side only — never exposed to the client. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Absolute site URL; used for canonical tags, OG images and the sitemap. |

---

## Database setup

### Option A — Docker (quickest for local work)

```bash
docker run -d --name estatehub-pg \
  -e POSTGRES_USER=realestate \
  -e POSTGRES_PASSWORD=realestate \
  -e POSTGRES_DB=realestate \
  -p 5432:5432 postgres:16-alpine
```

```env
DATABASE_URL="postgresql://realestate:realestate@localhost:5432/realestate?schema=public"
```

### Option B — Supabase (free tier, recommended for deployment)

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string → URI**.
3. Use the **connection pooler** URI (port `6543`) for the app, and append
   `?pgbouncer=true&connection_limit=1` — serverless functions open many short-lived
   connections and will exhaust a direct pool otherwise.
4. Run migrations against the **direct** connection (port `5432`).

### Applying the schema

```bash
npm run db:migrate     # development: creates a new migration and applies it
npm run db:deploy      # production/CI: applies existing migrations only
npm run db:reset       # wipe, re-migrate and re-seed (destructive)
npm run db:studio      # browse the data in Prisma Studio
```

---

## Demo accounts

All use the password **`Password123`**.

| Email | Role | What to look at |
|---|---|---|
| `admin@estatehub.in` | Admin | Moderation queue, user management |
| `owner@estatehub.in` | Owner | My listings, post/edit, enquiries |
| `agent@estatehub.in` | Agent | Same as owner |
| `buyer@estatehub.in` | Buyer | Saved properties, recently viewed |

---

## Testing

148 tests: 67 unit (Vitest) and 81 API + browser (Playwright).

```bash
npm run test          # unit tests — fast, no database
npm run test:e2e      # API + browser tests against a real build
npm run test:all      # both
npm run test:e2e:ui   # Playwright's interactive runner
```

**Unit tests** (`src/**/*.test.ts`) cover pure logic: Indian price formatting and
slug generation, every Zod schema, bcrypt hashing, and session JWTs — including
tampering, `alg: none` downgrades, expiry and secret rotation. They also cover the
storage adapter's path-traversal guards.

**End-to-end tests** (`tests/`) run against the **production build**, not a dev
server or a mock, because a whole class of bug — files written somewhere
`next start` cannot serve them — only appears there. Coverage:

| File | What it protects |
|---|---|
| `api-auth.spec.ts` | Registration, login, logout, user enumeration |
| `api-search.spec.ts` | Every filter, sort order, pagination, junk-input handling |
| `api-authorization.spec.ts` | Who may do what — the highest-risk surface |
| `e2e-browse.spec.ts` | Public browsing, filters, SEO, mobile overflow |
| `e2e-dashboard.spec.ts` | All three dashboards, plus the full listing lifecycle |

The authorization suite asserts the rules that must never silently regress:
buyers cannot create listings, owners cannot approve their own, no one can edit
another user's, pending listings are invisible publicly, an owner's edit
re-enters moderation, enquiring about a hidden listing returns 404 (not 403,
which would confirm it exists), and an admin cannot demote themselves.

### Test database

The suite needs its own database and **refuses to run unless the database name
contains `test`** — it truncates every table on each run.

```bash
createdb realestate_test    # or: psql -c "create database realestate_test"
```

Point `.env.test` at it. `tests/global-setup.ts` then migrates, truncates and
seeds automatically; `playwright.config.ts` builds and starts the app itself, so
`npm run test:e2e` is the only command you need.

In CI the database URL comes from the job environment and takes precedence over
`.env.test`. See `.github/workflows/ci.yml` for a working GitHub Actions setup
(lint → typecheck → unit → e2e, with the Playwright report uploaded on failure).

### A note on flakiness

The suite runs serially against one database and was verified across three
consecutive clean runs. Where a test looked flaky, the cause turned out to be
real application raciness rather than the test — sign-out navigating with
`router.refresh()` failed 6/6 on repeat, which is why the auth flows use a full
document navigation. If a test here starts failing intermittently, suspect the
app first.

---

## API reference

All responses use one envelope: `{ ok: true, data }` or
`{ ok: false, error, fields? }`. Validation failures return `422` with a `fields` map of
per-field messages.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create account, start session |
| `POST` | `/api/auth/login` | — | Sign in |
| `POST` | `/api/auth/logout` | — | Clear session |
| `GET` | `/api/properties` | — | Search (same filters as the UI) |
| `POST` | `/api/properties` | Owner/Agent/Admin | Create listing |
| `PATCH` | `/api/properties/:id` | Owner of it, or Admin | Update listing |
| `DELETE` | `/api/properties/:id` | Owner of it, or Admin | Delete listing |
| `PATCH` | `/api/properties/:id/status` | Owner (limited) / Admin | Approve, reject, mark sold, deactivate |
| `POST` | `/api/favorites` | Any user | Toggle saved |
| `POST` | `/api/enquiries` | — | Contact seller (anonymous allowed) |
| `POST` | `/api/uploads` | Owner/Agent/Admin | Multipart image upload |
| `GET` | `/api/files/:name` | — | Serve an image stored by the `local` driver |
| `PATCH` | `/api/admin/users/:id` | Admin | Change role or suspend |

Search parameters: `q`, `city`, `type`, `listingType`, `minPrice`, `maxPrice`, `bedrooms`,
`sort` (`newest` · `price_asc` · `price_desc`), `page`.

```bash
curl 'http://localhost:3000/api/properties?city=Pune&listingType=RENT&maxPrice=40000'
```

---

## Image storage

`src/lib/storage/` defines a `StorageAdapter` (`upload`, `remove`) and resolves the active
implementation from `STORAGE_DRIVER`.

- **`local`** — writes to `storage/uploads/` and serves the files through
  `GET /api/files/:name`. It deliberately does *not* use `public/`: Next serves that directory
  from a build-time snapshot, so anything written there at runtime 404s under `next start`.
  Going through a route handler means the driver behaves identically in dev and production.
  Filenames are generated server-side (never taken from the client), the route whitelists
  `[A-Za-z0-9._-]` plus four image extensions and re-checks the resolved path stays inside the
  upload directory, and only JPEG/PNG/WebP/AVIF under 5 MB are accepted.
  Works for self-hosting on persistent disk; **not** on Vercel, whose filesystem is read-only
  and ephemeral.
- **`cloudinary`** — signed uploads through the REST API (no SDK dependency). The API secret
  stays server-side, so nobody can upload to your account by reading the client bundle.

To add S3: create `src/lib/storage/s3.ts` implementing the same interface, and add one case
to `getStorage()`. Nothing else in the app knows which backend is in use.

---

## Deployment

### Vercel + Supabase + Cloudinary

1. **Database** — create a Supabase project and apply migrations:
   ```bash
   DATABASE_URL="<direct-connection-uri>" npx prisma migrate deploy
   DATABASE_URL="<direct-connection-uri>" npm run db:seed   # optional
   ```
2. **Images** — create a free Cloudinary account and note the cloud name, API key and secret.
3. **Vercel** — import the repository and set these environment variables. The build
   will succeed without them, so set them *before* your first real visit:
   ```
   DATABASE_URL           = <pooler URI>?pgbouncer=true&connection_limit=1
   AUTH_SECRET            = <openssl rand -base64 32>
   STORAGE_DRIVER         = cloudinary
   CLOUDINARY_CLOUD_NAME  = ...
   CLOUDINARY_API_KEY     = ...
   CLOUDINARY_API_SECRET  = ...
   NEXT_PUBLIC_SITE_URL   = https://your-domain.com
   ```
4. Deploy. `npm run build` runs `prisma generate` first, so the client is always in sync.

> **The build needs neither a database nor `DATABASE_URL`.** Every page that reads
> Postgres renders per request, `/sitemap.xml` is explicitly `force-dynamic` (prerendering
> it would freeze the listing set at build time), and the Prisma client is constructed on
> first use rather than on import — `next build` imports every route module to collect its
> configuration, so an eagerly-built client would fail the build before the environment is
> even wired up. You can therefore deploy and migrate in either order, and a missing
> `DATABASE_URL` surfaces at request time with an actionable message instead of a build
> stack trace.

**Cost at MVP scale:** Vercel Hobby, Supabase free tier and Cloudinary free tier are all
₹0/month. The first real bill is your domain.

### Self-hosting

```bash
npm ci && npm run build && npm run db:deploy && npm start
```
Runs anywhere Node 20 runs — a €5 VPS behind nginx is plenty. `STORAGE_DRIVER=local` is fine
here as long as `storage/uploads/` sits on persistent disk (mount it as a volume in Docker).

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | API + browser tests (Playwright) |
| `npm run test:all` | Both suites |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create + apply a migration (dev) |
| `npm run db:deploy` | Apply migrations (prod/CI) |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Wipe, migrate, reseed |
| `npm run db:studio` | Prisma Studio |

---

## Known limitations

Honest list of what an MVP leaves out.

- **No load testing.** The suite proves correctness, not that the app holds up under
  traffic. The `ILIKE` search below is the first thing that will bend.
- **No email.** Enquiries land in the seller's dashboard; nothing is sent. Wire up Resend or
  Postmark next.
- **No password reset**, and no email verification on signup.
- **Search is `ILIKE`.** Fine for thousands of rows. Move to a `tsvector` column with a GIN
  index (or Meilisearch) when the table gets large.
- **Role changes need a re-login.** Sessions are stateless JWTs, so a role change applies at
  the next sign-in — though bans take effect immediately, because privileged routes re-read
  the user row.
- **No rate limiting.** Add it on `/api/auth/*` and `/api/enquiries` before going public;
  Upstash Redis is the usual cheap answer on Vercel.
- **No map view or geo search.** `pincode` and `address` are stored but not geocoded.
- **`npm audit` reports a high-severity advisory** in `deepmerge-ts`, reached through
  `@prisma/config`. It is a Prisma **CLI**-time dependency, not part of the runtime bundle,
  and the only inputs it merges are your own config files. Downgrading to Prisma 6 to silence
  it would be a worse trade.
