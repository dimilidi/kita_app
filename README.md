# Kita Management Dashboard

A web application for managing day-to-day work in a kindergarten (*Kita*): attendance, play areas, lunch planning, rosters, announcements, and role-based dashboards.

This project was built as part of a bachelor thesis. It uses Next.js with PostgreSQL and Clerk for authentication.

**Languages:** German (default) and English — routes are prefixed with `/de/` or `/en/`.

**Live demo:** [https://kitaapp-production.up.railway.app](https://kitaapp-production.up.railway.app)

---

## Screenshots

### Admin Dashboard

![Admin Dashboard — overview with charts and role statistics](docs/screenshots/admin_dashboard.png)

### Play Board

![Play Board — drag-and-drop placement of children and educators across zones](docs/screenshots/play_board.png)

### Lunch Board

![Lunch Board — daily lunch group and table planning](docs/screenshots/lunch_board.png)

### Attendance

![Attendance — child and educator attendance tracking](docs/screenshots/attendance_page.png)

### Parent Dashboard

![Parent Dashboard — parent view with child status and announcements](docs/screenshots/parent_dashboard.png)

---

## Live Demo

The application is deployed on Railway:

**[https://kitaapp-production.up.railway.app](https://kitaapp-production.up.railway.app)**

Demo access uses [Clerk](https://clerk.com/) accounts with `publicMetadata.role` set to `admin`, `teacher`, `parent`, or `student`. The database seed creates matching records (e.g. `teacher1`, `parent1`) — Clerk usernames/IDs should align with those records for login and permissions to work correctly.

---

## What the app does


| Module                     | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| **Play Board**             | Drag-and-drop placement of children and educators across play zones |
| **Lunch Board**            | Daily lunch group planning and table assignments                    |
| **Attendance**             | Child and educator attendance tracking                              |
| **Rosters**                | Students, parents, teachers, classes, and age groups                |
| **Announcements & events** | Notices for the whole institution or specific classes               |
| **Staff messaging**        | Group chat for educators and administrators                         |
| **Dashboards**             | Home views with charts, tailored to each role                       |


Authorization is checked in three places: middleware (route access), server actions (mutations), and detail pages (e.g. a parent can only open their own child's profile).

---

## Technology stack


| Layer                | Technologies                                              |
| -------------------- | --------------------------------------------------------- |
| **Frontend**         | Next.js 14 (App Router), React 18, Tailwind CSS           |
| **UI / interaction** | `@dnd-kit`, Recharts, React Big Calendar, React Hook Form |
| **Authentication**   | [Clerk](https://clerk.com/) (`@clerk/nextjs`)             |
| **Backend**          | Next.js Server Actions, Route Handlers                    |
| **Validation**       | Zod                                                       |
| **Database**         | PostgreSQL 14                                             |
| **ORM**              | Prisma 5                                                  |
| **Media**            | Cloudinary (optional)                                     |
| **i18n**             | JSON dictionaries (`src/locales/de.json`, `en.json`)      |


---

## Architecture overview

```
Users (Admin / Teacher / Parent / Student)
        │
        ▼ HTTPS
┌───────────────────────────────────────┐
│  Next.js Frontend (React, App Router) │
│  Play Board · Lunch · Attendance · …  │
└───────────────┬───────────────────────┘
                │ Server Actions / API routes
┌───────────────▼───────────────────────┐
│  Application logic                    │
│  Clerk auth · middleware RBAC         │
│  actionAuth · pageAccess · Zod        │
└───────────────┬───────────────────────┘
                │ Prisma ORM
┌───────────────▼───────────────────────┐
│  PostgreSQL                           │
└───────────────────────────────────────┘
```

**How access control works**

- **Middleware** (`src/middleware.ts`) — locale routing and which routes each role can visit (`src/lib/routeAccess.ts`)
- **Server actions** — role checks before writes (`src/lib/actionAuth.ts`)
- **Detail pages** — checks that the logged-in user is allowed to view that specific record (`src/lib/pageAccess.ts`)

---

## User roles

Roles live in Clerk `publicMetadata.role` and are used throughout the app.


| Role        | What they can do                                                     |
| ----------- | -------------------------------------------------------------------- |
| **admin**   | Everything: rosters, boards, staff attendance, admin list            |
| **teacher** | Their classes, attendance, play/lunch boards, messaging, own profile |
| **parent**  | Their children's profiles, attendance, announcements, events         |
| **student** | Own profile, attendance, announcements, events                       |


Route rules are in `src/lib/routeAccess.ts`. If a user has no role or an unknown role, they are sent to sign-in or their home page — the app does not grant access by default.

---

## Authentication

- **Provider:** Clerk (sign-in, sessions, identity)
- **Sign-in URL:** `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (typically `/sign-in`)
- **Roles:** set `publicMetadata.role` to `admin`, `teacher`, `parent`, or `student` in the Clerk dashboard
- **Database link:** PostgreSQL user IDs/usernames (e.g. `teacher1`) must match Clerk accounts, or profile pages and permissions will not line up

For local development, run the seed first, then create Clerk users that match the seeded usernames.

---

## Development challenges

A few things that took real effort during implementation:

- **Drag-and-drop on touch devices** — Play Board and Lunch Board use `@dnd-kit`; desktop worked early, but tablets needed touch sensors, delays, and CSS tweaks (`touch-action`, `draggable={false}` on images) to feel usable.
- **RBAC and middleware** — Route rules had to be ordered carefully (e.g. `/list/lunch-groups` before `/list/lunch`), and server/client code split so client components do not import Clerk server utilities.
- **Multilingual routing** — URLs are prefixed with `/de/` or `/en/`; the middleware remembers the selected language and automatically redirects routes without a language prefix (for example `/admin`) to localized routes such as `/de/admin` or `/en/admin`.
- **Prisma schema growth** — Many relations (students, zones, lunch groups, attendance, chat) led to heavier list queries and more careful use of `include`/`select` in server actions.

---

## Prerequisites

- **Node.js** 20 LTS (recommended)
- **npm** 9+
- **Docker** (optional, for local PostgreSQL)
- **Clerk** application (publishable + secret keys)
- **PostgreSQL** 14+

---

## Environment variables

```bash
cp .env_example .env
```


| Variable                            | Required    | Description                              |
| ----------------------------------- | ----------- | ---------------------------------------- |
| `DATABASE_URL`                      | Yes         | PostgreSQL connection string             |
| `POSTGRES_USER`                     | Docker only | Postgres username (`docker-compose.yml`) |
| `POSTGRES_PASSWORD`                 | Docker only | Postgres password                        |
| `POSTGRES_DB`                       | Docker only | Postgres database name                   |
| `NODE_ENV`                          | No          | `development` locally, `production` on deploy |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes         | Clerk publishable key                    |
| `CLERK_SECRET_KEY`                  | Yes         | Clerk secret key                         |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`     | Yes         | Sign-in path (e.g. `/sign-in`)           |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | No          | Cloudinary cloud name (photo uploads)    |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY`    | No          | Cloudinary API key                       |
| `SMTP_HOST`                         | No          | SMTP server for parent ↔ Kita messaging   |
| `SMTP_PORT`                         | No          | SMTP port (often `587`)                  |
| `SMTP_USER`                         | No          | SMTP username                            |
| `SMTP_PASS`                         | No          | SMTP password                            |
| `SMTP_FROM`                         | No          | Sender address (defaults to `SMTP_USER`) |


---

## Local development

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

Point `DATABASE_URL` at the container, for example:

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DB_NAME
```

### 2. Install dependencies

```bash
npm install
```

### 3. Prepare the database

```bash
npx prisma migrate deploy
npx prisma db seed
```

The seed skips if data already exists. **Only use seed data for local dev and demos** — not on a database with real children/parents.

### 4. Configure Clerk

1. Create a Clerk app and add keys to `.env`.
2. Create users matching seeded IDs (e.g. `admin1`, `teacher1`, `parent1`).
3. Set `publicMetadata.role` for each user.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should land on sign-in or a role home like `/de/admin`.

### Useful commands


| Command                  | Purpose                                |
| ------------------------ | -------------------------------------- |
| `npm run dev`            | Dev server                             |
| `npm run build`          | Production build                       |
| `npm run start`          | Production server                      |
| `npm run lint`           | ESLint                                 |
| `npx prisma migrate dev` | Create/apply migrations in development |
| `npx prisma studio`      | Browse the database in a UI            |


---

## Database setup

- **Schema:** `prisma/schema.prisma` (DBML export in `prisma/dbml/`)
- **Migrations:** `prisma/migrations/`

```bash
npx prisma migrate deploy    # apply migrations (deploy / CI)
npx prisma migrate dev         # dev: create new migrations
npx prisma db seed             # demo data
```

---

## Docker workflow

Docker is **optional**. The app runs fine with Node.js on the host; Docker is mainly a convenient way to run PostgreSQL locally, or to test a production-like build in a container.

> **Railway does not use the Dockerfile.** Production deploys on Railway with the native Node.js process: `npm install` → `npm run build` → `npm run start` (see [Deployment (Railway)](#deployment-railway)).

### Option A — Postgres in Docker, app on the host (recommended for daily dev)

```bash
docker compose up -d postgres
npm install && npx prisma migrate deploy && npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Your `.env` `DATABASE_URL` should point at `localhost:5432`.

### Option B — Full stack in Docker (local testing only)

Builds the root `Dockerfile` and runs Next.js together with PostgreSQL. Useful to verify the production build without affecting Railway.

```bash
cp .env_example .env   # fill in Clerk keys and other secrets
docker compose --profile fullstack up -d --build
```

Open [http://localhost:3005](http://localhost:3005).

The app container overrides `DATABASE_URL` to reach Postgres on the Docker network (`postgres:5432`). Clerk keys and other variables still come from `.env` via `env_file`.

First-time demo data (optional):

```bash
docker compose --profile fullstack exec app npx prisma db seed
```

Stop everything:

```bash
docker compose --profile fullstack down
```

---

## Deployment (Railway)

Railway uses **native Node.js deployment** — not Docker. The `Dockerfile` in this repo is for local testing only.

1. Connect the repo to [Railway](https://railway.app/) and add a **PostgreSQL** plugin.
2. Set environment variables: `DATABASE_URL`, Clerk keys, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NODE_ENV=production`.
3. **Build command:** `npm ci && npx prisma generate && npm run build`
4. **Start command:** `npx prisma migrate deploy && npm run start`
5. In Clerk, add your Railway URL to allowed origins and redirect URLs.
6. Assign roles via Clerk `publicMetadata.role` — do **not** run `prisma db seed` on a live deployment unless you want demo data.

Live demo: [https://kitaapp-production.up.railway.app](https://kitaapp-production.up.railway.app)

---

## Project structure (selected)

```
src/
├── app/                 # App Router pages, layouts, API routes
│   ├── [lang]/          # Locale-prefixed routes
│   └── (dashboard)/     # Authenticated dashboard sections
├── components/          # React UI components
├── lib/                 # Server actions, auth, RBAC, utilities
├── locales/             # de.json, en.json translations
└── middleware.ts        # Clerk + locale + RBAC
prisma/
├── schema.prisma        # Data model
├── migrations/          # SQL migrations
└── seed.ts              # Demo data (development)
docs/                    # Thesis architecture diagram (+ screenshots)
```

---

## Known limitations

This is a thesis project, not a commercial product. Some rough edges:

- **Clerk and the database are separate** — you create users in Clerk and records in Postgres manually (or via seed); nothing syncs them automatically.
- **Seed data is fake** — useful for demos, not for real personal data.
- **Docker is optional** — Postgres in Compose covers most local dev; the `Dockerfile` is for optional full-stack local testing, not Railway production.
- `**npm start` in `package.json`** — currently runs migrate + seed + Next.js; adjust the Railway start command if you do not want seed on every boot.
- **Translations** — DE/EN are supported, but some UI strings may still be hardcoded.
- **Mobile** — boards work on tablets after touch fixes, but the UI is still mostly designed for desktop.
- **Single kindergarten** — one institution, no multi-tenant support.
- **Email** — Some email functionality was explored during development, but it is not a core feature of the application.

---

