# Kita Management Dashboard

Web-based information system for managing daily operations in a kindergarten (*Kita*). The application supports staff workflows (attendance, play areas, lunch planning), parent communication, and role-specific dashboards. Developed as an academic thesis project with a production-oriented architecture.

**Supported languages:** German (default) and English (`/de/…`, `/en/…`).

---

## Project overview

The system centralizes kindergarten administration in a single Next.js application:

| Module | Description |
|--------|-------------|
| **Play Board** | Drag-and-drop placement of children and educators across play zones |
| **Lunch Board** | Daily lunch group planning and table assignments |
| **Attendance** | Child and educator attendance tracking |
| **Roster management** | Students, parents, teachers, classes, and age groups |
| **Announcements & events** | Institution-wide and class-scoped notices |
| **Staff messaging** | Group chat for educators and administrators |
| **Dashboards** | Role-specific home views with charts and summaries |

Access is enforced at multiple layers: middleware route rules, server-action guards, and detail-page ownership checks (fail-closed by default).

---

## Technology stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS |
| **UI / interaction** | `@dnd-kit`, Recharts, React Big Calendar, React Hook Form |
| **Authentication** | [Clerk](https://clerk.com/) (`@clerk/nextjs`) |
| **Backend** | Next.js Server Actions, Route Handlers |
| **Validation** | Zod |
| **Database** | PostgreSQL 14 |
| **ORM** | Prisma 5 |
| **Media** | Cloudinary (optional) |
| **i18n** | JSON dictionaries (`src/locales/de.json`, `en.json`) |

---

## Architecture overview

The application follows a layered architecture: browser UI → Next.js server (auth, RBAC, business logic) → Prisma → PostgreSQL.

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

A detailed architecture diagram is available in [`docs/architecture-kindergarten-system.png`](docs/architecture-kindergarten-system.png) (source: [`docs/architecture-kindergarten-system.mmd`](docs/architecture-kindergarten-system.mmd)).

**Authorization model**

- **Middleware** (`src/middleware.ts`) — locale routing and route-level RBAC via `src/lib/routeAccess.ts`
- **Server actions** — centralized role checks in `src/lib/actionAuth.ts`
- **Detail pages** — resource-scoped access in `src/lib/pageAccess.ts` (prevents IDOR on profiles)

---

## User roles

Roles are stored in Clerk `publicMetadata.role` and mirrored in application logic.

| Role | Typical access |
|------|----------------|
| **admin** | Full system access: rosters, play/lunch boards, staff attendance, admin list |
| **teacher** | Supervised classes, attendance, play/lunch boards, messaging, own profile |
| **parent** | Own children’s profiles, attendance, announcements, events |
| **student** | Own profile, attendance, announcements, events |

Route permissions are defined in `src/lib/routeAccess.ts`. Unknown or missing roles are denied access (fail-closed).

---

## Authentication

- **Provider:** Clerk handles sign-in, sessions, and user identity.
- **Sign-in URL:** configured via `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (default path: `/sign-in`).
- **Role assignment:** each Clerk user must have `publicMetadata.role` set to one of `admin`, `teacher`, `parent`, or `student`.
- **Database linkage:** user IDs and usernames in PostgreSQL (e.g. `teacher1`, `parent1`) must correspond to Clerk accounts for profile and permission checks to work.

For local demos, create Clerk users matching seeded usernames after running the database seed.

---

## Prerequisites

- **Node.js** 20 LTS (recommended)
- **npm** 9+
- **Docker** (optional, for local PostgreSQL)
- **Clerk** application with publishable and secret keys
- **PostgreSQL** 14+ (local Docker container or hosted instance)

---

## Environment variables

Copy the template and fill in your values:

```bash
cp .env_example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `POSTGRES_USER` | Docker only | Postgres username (used by `docker-compose.yml`) |
| `POSTGRES_PASSWORD` | Docker only | Postgres password |
| `POSTGRES_DB` | Docker only | Postgres database name |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | Sign-in path (e.g. `/sign-in`) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name (image uploads) |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY` | No | Cloudinary API key |

Never commit `.env` to version control.

---

## Local development

### 1. Start PostgreSQL

Using Docker Compose (database only):

```bash
docker compose up -d postgres
```

Ensure `DATABASE_URL` in `.env` points to the running instance, for example:

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DB_NAME
```

### 2. Install dependencies

```bash
npm install
```

### 3. Prepare the database

Apply migrations and load demo data:

```bash
npx prisma migrate deploy
npx prisma db seed
```

The seed is idempotent: if data already exists, it skips re-seeding. **Use seed data for development and demos only.**

### 4. Configure Clerk

1. Create a Clerk application.
2. Add the keys to `.env`.
3. Create users whose usernames/IDs match seeded records (e.g. `admin1`, `teacher1`, `parent1`).
4. Set each user’s `publicMetadata.role` to the appropriate role.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to the locale-prefixed sign-in or role home (`/de/admin`, `/de/teacher`, etc.).

### Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Production server (see note below) |
| `npm run lint` | ESLint |
| `npx prisma migrate dev` | Create/apply migrations during development |
| `npx prisma studio` | Browse database in a web UI |

---

## Database setup

**Schema:** defined in `prisma/schema.prisma` (DBML export in `prisma/dbml/`).

**Migrations:** stored in `prisma/migrations/`. Apply with:

```bash
npx prisma migrate deploy    # production / CI
npx prisma migrate dev       # development (creates new migrations)
```

**Seed:** `prisma/seed.ts` populates demo admins, age groups, classes, zones, teachers, parents, children, lessons, events, and announcements. Run explicitly:

```bash
npx prisma db seed
```

---

## Docker workflow

`docker-compose.yml` defines two services:

| Service | Purpose |
|---------|---------|
| `postgres` | PostgreSQL 14 with a persistent volume |
| `app` | Builds and runs the Next.js application |

**Recommended local workflow:** run only Postgres in Docker and the Next.js app on the host (`npm run dev`).

```bash
docker compose up -d postgres
npm install && npx prisma migrate deploy && npx prisma db seed
npm run dev
```

To run the full stack via Compose, a root `Dockerfile` is required for the `app` service build. If it is not present in the repository, use the host-based workflow above or deploy to a platform such as Railway (see below).

---

## Deployment (Railway)

Railway is suitable for hosting this Next.js + PostgreSQL stack.

### 1. Create project

1. Connect the GitHub repository to [Railway](https://railway.app/).
2. Add a **PostgreSQL** plugin; Railway provides `DATABASE_URL` automatically.

### 2. Configure environment

Set at minimum:

- `DATABASE_URL` (from Railway Postgres)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NODE_ENV=production`

Add Cloudinary variables if image uploads are used.

### 3. Build and start commands

| Setting | Suggested value |
|---------|-----------------|
| **Build command** | `npm ci && npx prisma generate && npm run build` |
| **Start command** | `npx prisma migrate deploy && npm run start` |

Run database migrations before or as part of each deploy. **Do not run `prisma db seed` in production** unless you intentionally reset demo data.

### 4. Clerk production setup

- Add your Railway deployment URL to Clerk allowed origins and redirect URLs.
- Ensure production Clerk users have the correct `publicMetadata.role`.

### 5. Post-deploy checks

- Sign in with each role and verify dashboard access.
- Confirm middleware redirects unknown routes to the role home or sign-in.
- Verify database connectivity (`prisma migrate deploy` succeeds in deploy logs).

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
docs/                    # Thesis architecture diagram
```

---

## Known limitations

Documented honestly for academic review and demo planning:

- **Clerk ↔ database coupling** — users must exist in both Clerk and PostgreSQL with matching IDs/usernames; there is no automatic provisioning sync.
- **Seed data is for development** — the seed script creates fictional demo records and must not be used on production databases with real personal data.
- **Partial Docker setup** — `docker-compose.yml` references an application image build; a `Dockerfile` may need to be added separately for full containerized deployment.
- **Production start script** — the current `npm start` script may run migrations and seed; review `package.json` before production deployment and adjust the start command on Railway if needed.
- **i18n coverage** — German and English are supported, but not every string may be externalized to locale files yet.
- **Mobile UX** — core boards work on tablets; some interactions are optimized for desktop-first workflows.
- **Email** — Nodemailer is included as a dependency; outbound email is not a primary documented feature path.
- **Scope** — the system models a single institution; multi-tenant kindergarten chains are out of scope.

---

## License

Academic / thesis project. All rights reserved by the author unless otherwise stated.
