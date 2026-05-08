# Expo Cross-Platform App Infrastructure

A production-ready monorepo setup for building three cross-platform mobile applications (Qigong, Walking, Greasing the Groove) using Expo and modern best practices.

---

## Project Structure

```
expo-research/
├── apps/                    # Mobile applications
│   ├── gtg/                # Greasing the Groove app
│   ├── walking/            # City Walking app
│   └── qigong/             # Qigong app
├── packages/               # Shared packages
│   ├── ui/                 # NativeWind UI components
│   ├── exercise-data/      # Exercise definitions
│   ├── timer-core/         # Reusable timer logic
│   ├── auth/               # Supabase auth wrapper
│   ├── storage/            # SQLite + sync logic
│   └── utils/              # Shared utilities
├── infrastructure/        # Server setup
│   └── supabase/          # Supabase self-hosted config
├── scripts/               # Deployment & maintenance scripts
├── docs/                  # Documentation
└── .github/workflows/      # CI/CD pipelines
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- GitHub account (for CI/CD)
- SSH access to dev and production VPS

### Setup

```bash
# Install pnpm
npm install -g pnpm@9

# Install dependencies
pnpm install

# Typecheck all packages
pnpm typecheck

# Start development (on VPS)
pnpm --filter @company/gtg dev
```

---

## Domain Architecture

| Domain                    | Purpose              | Update Mechanism                 |
| ------------------------- | -------------------- | -------------------------------- |
| `live.your-domain.com`    | Fast web development | Direct file changes (hot reload) |
| `preview.your-domain.com` | Pipeline testing     | GitHub Actions on push to main   |
| `prod.your-domain.com`    | Production users     | GitHub Actions with approval     |

---

## Apps

### GTG (Greasing the Groove)

Simple strength training app using the greasing the groove technique.

**Tech:** Expo Router + Zustand + NativeWind + SQLite

### Walking

City walking routes with map integration and social sharing.

**Tech:** Expo Router + Zustand + NativeWind + OSM Maps

### Qigong

Animated exercise guidance with programs and timers.

**Tech:** Expo Router + Zustand + NativeWind + Lottie

---

## Shared Packages

| Package                  | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| `@company/ui`            | Buttons, cards, inputs, timers           |
| `@company/exercise-data` | Exercise definitions for all apps        |
| `@company/timer-core`    | Reusable timer with Reanimated           |
| `@company/auth`          | Supabase auth wrapper with Apple Sign In |
| `@company/storage`       | SQLite database with cloud sync          |
| `@company/utils`         | Formatters, validators, helpers          |

---

## Deployment Pipeline

### Development Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│  LOCAL DEV VPS (live.your-domain.com)                               │
│                                                                     │
│  1. Code on VPS directly                                            │
│  2. Web: expo start --web → instant updates on live domain          │
│  3. Native: Expo Orbit connects to dev server → install on iPhone    │
│  4. Push to GitHub (main branch)                                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS                                                     │
│                                                                     │
│  1. CI (lint, typecheck, test)                                      │
│  2. Build web + native apps                                         │
│  3. Deploy to preview.your-domain.com                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (automatic on main)
┌─────────────────────────────────────────────────────────────────────┐
│  PRODUCTION VPS (prod.your-domain.com)                              │
│                                                                     │
│  1. Previous build stored for rollback                              │
│  2. New build deployed to current/                                   │
│  3. Health check verification                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## GitHub Actions Workflows

| Workflow                | Trigger         | Purpose                                 |
| ----------------------- | --------------- | --------------------------------------- |
| `ci.yml`                | Every push      | Lint, typecheck, test                   |
| `deploy-preview.yml`    | Push to main    | Deploy to preview domain + build native |
| `deploy-production.yml` | Manual dispatch | Deploy to production                    |
| `sync-migrations.yml`   | Manual dispatch | Apply DB migrations to production       |
| `rollback.yml`          | Manual dispatch | Rollback to previous build              |

---

## Documentation

| Document                                                               | Description                                |
| ---------------------------------------------------------------------- | ------------------------------------------ |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)                                | Full architecture overview                 |
| [IMPLEMENTATION_ORDER.md](docs/implementation/IMPLEMENTATION_ORDER.md) | Step-by-step setup guide                   |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md)                                    | Complete deployment pipeline guide         |
| [TESTING.md](docs/TESTING.md)                                          | Testing on all devices (web, iOS, Android) |
| [SUPABASE_MIGRATIONS.md](docs/database/SUPABASE_MIGRATIONS.md)         | DB migration sync dev → prod               |
| [SUPABASE_SETUP.md](docs/setup/infrastructure/SUPABASE_SETUP.md)       | Supabase VPS installation                  |
| [SUPABASE_DOCKER.md](docs/setup/infrastructure/SUPABASE_DOCKER.md)     | Docker compose configuration               |
| [MONOREPO_SETUP.md](docs/setup/monorepo/MONOREPO_SETUP.md)             | Turborepo + pnpm setup                     |
| [CI_CD_SETUP.md](docs/setup/ci-cd/CI_CD_SETUP.md)                      | GitHub Actions configuration               |
| [SCHEMAS.md](docs/database/SCHEMAS.md)                                 | Database schemas per app                   |
| [AUTH_SETUP.md](docs/auth/AUTH_SETUP.md)                               | Authentication implementation              |

---

## Testing Methods

| Method               | Device         | Speed    | Use Case            |
| -------------------- | -------------- | -------- | ------------------- |
| **Web (Live)**       | Browser        | Instant  | UI/UX development   |
| **Web (Preview)**    | Browser        | 3-5 min  | Pipeline testing    |
| **iOS Simulator**    | Xcode          | 5-10 min | iOS UI testing      |
| **Physical iPhone**  | Expo Orbit     | Fast     | Real device testing |
| **Android Emulator** | Android Studio | 5-10 min | Android UI testing  |
| **Physical Android** | Direct APK     | Fast     | Real device testing |

---

## Scripts

| Script                         | Purpose                            |
| ------------------------------ | ---------------------------------- |
| `scripts/export-migrations.sh` | Export DB schema from dev Supabase |
| `scripts/rollback.sh`          | Manual rollback on production VPS  |

---

## Development Commands

```bash
# All apps
pnpm dev              # Start all dev servers
pnpm build            # Build all apps
pnpm lint             # Lint all packages
pnpm typecheck        # TypeScript check all
pnpm test             # Run tests

# Individual app
pnpm --filter @company/gtg dev
pnpm --filter @company/gtg build

# Shared packages
pnpm --filter @company/ui lint
pnpm --filter @company/auth typecheck
```

---

## Environment Variables

Create `.env` in each app:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-domain.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Required GitHub Secrets:

```
DEV_VPS_HOST, DEV_VPS_USER, DEV_VPS_KEY
PROD_VPS_HOST, PROD_VPS_USER, PROD_VPS_KEY
EXPO_TOKEN, ANDROID_KEYSTORE, APPLE_CERTIFICATE
```

---

## Infrastructure

### Dev VPS (Supabase Testing)

- Local Supabase for development/testing
- Export migrations → commit to git → apply to prod

### Production VPS (Supabase Production)

- Separate production Supabase instance
- Clean production data
- Previous builds stored for rollback

---

## Tech Stack

| Layer           | Technology               |
| --------------- | ------------------------ |
| Mobile          | Expo SDK 52+             |
| Routing         | Expo Router 4+           |
| State           | Zustand 5+               |
| UI              | NativeWind 4+ (Tailwind) |
| Animation       | Lottie 6+                |
| Local DB        | expo-sqlite              |
| Backend         | Supabase (self-hosted)   |
| Auth            | Supabase Auth            |
| Maps            | OpenStreetMap            |
| CI/CD           | GitHub Actions           |
| Monorepo        | Turborepo 2+             |
| Package Manager | pnpm 9+                  |

---

## License

Private - All rights reserved
