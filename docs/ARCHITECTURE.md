# Expo Cross-Platform App Infrastructure - 2026

## Overview

This document outlines the complete infrastructure setup for building three cross-platform mobile applications (Qigong, Walking, Greasing the Groove) using Expo as the foundation.

**Goals:**

- Self-hosted infrastructure (minimize costs, maximize control)
- Shared foundation across all three apps
- Clean code architecture with monorepo structure
- Development on VPS with preview → production pipeline
- Future-proof for scaling and separation

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOCAL DEV VPS                                   │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  Web Dev Server (expo start --web)                                    │ │
│   │         ↓                                                             │ │
│   │  live.your-domain.com ─── instant updates, hot reload                │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  Supabase (Testing)                                                  │ │
│   │  • qigong_db, walking_db, gtg_db                                     │ │
│   │  • Export migrations → git → GitHub → prod Supabase                  │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  Build Artifacts Storage                                             │ │
│   │  /var/www/{app}/releases/                                            │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  Expo Orbit + Physical Device Testing                                 │ │
│   │  • Run npx expo start --dev-client                                   │ │
│   │  • Expo Orbit on Mac connects → installs build on iPhone              │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ git push to main
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GITHUB ACTIONS                                 │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  CI Pipeline                                                          │ │
│   │  • Lint                                                               │ │
│   │  • TypeScript check                                                   │ │
│   │  • Tests                                                              │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  Build Pipeline                                                       │ │
│   │  • Build web app                                                      │ │
│   │  • Build iOS (.ipa)                                                   │ │
│   │  • Build Android (.apk)                                               │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  Deploy Pipeline                                                      │ │
│   │  • Deploy to preview.your-domain.com                                 │ │
│   │  • Upload native builds to artifacts                                  │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ automatic on main
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRODUCTION VPS                                    │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  Supabase (Production)                                               │ │
│   │  • qigong_db, walking_db, gtg_db (isolated)                          │ │
│   │  • Separate from dev, clean production data                           │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  Web Apps                                                             │ │
│   │  • prod.your-domain.com                                              │ │
│   │  • Previous build in releases/previous/                              │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │  Storage Structure                                                    │ │
│   │  /var/www/{app}/                                                     │ │
│   │    ├── current/         ← Currently running                          │ │
│   │    ├── releases/         ← All builds with timestamps                  │ │
│   │    │   ├── 20240101120000/                                           │ │
│   │    │   ├── 20240102000000/                                           │ │
│   │    │   └── previous/      ← Last rollback point                       │ │
│   │    └── rollback.log                                                 │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Domain Configuration

| Domain                    | Environment | Purpose                            | Update Mechanism                           |
| ------------------------- | ----------- | ---------------------------------- | ------------------------------------------ |
| `live.your-domain.com`    | Development | Fast web iteration, hot reload     | Direct file changes (instant)              |
| `preview.your-domain.com` | Staging     | Pipeline testing before production | GitHub Actions on push to main             |
| `prod.your-domain.com`    | Production  | Live users                         | GitHub Actions with manual approval option |

---

## Tech Stack Summary

| Component            | Technology        | Version     | Notes                               |
| -------------------- | ----------------- | ----------- | ----------------------------------- |
| **Mobile Framework** | Expo SDK          | 52+         | Managed workflow                    |
| **Routing**          | Expo Router       | 4+          | File-based routing                  |
| **State Management** | Legend-State      | v3 (beta)   | Local-first, Supabase sync built-in |
| **UI**               | NativeWind        | v5          | Tailwind CSS v4 for RN              |
| **Animation**        | Reanimated        | ~3.16       | Complex timer sequences             |
| **Simple Animation** | react-native-ease | latest      | Micro-interactions (future)         |
| **Local Database**   | Legend-State      | -           | Uses expo-sqlite under the hood     |
| **Backend**          | Supabase          | self-hosted | Docker deployment                   |
| **Auth**             | Supabase Auth     | latest      | Apple Sign In built-in              |
| **Payments**         | RevenueCat        | future      | StoreKit integration                |
| **Maps**             | OpenStreetMap     | -           | Free tiles                          |
| **CI/CD**            | GitHub Actions    | -           | Local builds + SSH deploy           |
| **Monorepo**         | Turborepo         | 2+          | Workspace management                |
| **Package Manager**  | pnpm              | 9+          | Fast, space efficient               |

---

## Testing Matrix

| Method               | Device         | Speed    | Use Case            |
| -------------------- | -------------- | -------- | ------------------- |
| **Web (Live)**       | Browser        | Instant  | UI/UX development   |
| **Web (Preview)**    | Browser        | 3-5 min  | Pipeline testing    |
| **iOS Simulator**    | Xcode          | 5-10 min | iOS UI testing      |
| **Physical iPhone**  | Expo Orbit     | Fast     | Real device testing |
| **Android Emulator** | Android Studio | 5-10 min | Android UI testing  |
| **Physical Android** | Direct APK     | Fast     | Real device testing |

---

## Key Decisions

### 1. Supabase (Self-Hosted)

**Why:** Full auth system with Apple Sign In, PostgreSQL databases, auto-generated REST API, Edge Functions, and storage in one package. Battle-tested, well-documented.

**Setup:** Single Docker stack with separate databases per app (both dev and prod).

**Resource Requirements:**

- Minimum: 4GB RAM, 2 vCPUs, 80GB SSD
- Recommended: 8GB RAM, 4 vCPUs, 160GB SSD
- Estimated cost: $20-40/month (DigitalOcean/Hetzner)

### 2. Local-First Architecture with Legend-State

Mobile apps use **Legend-State** for reactive state management with automatic persistence to expo-sqlite and Supabase sync. This ensures:

- Full offline functionality (data persists locally first)
- Instant UI responses (reactive observables)
- Automatic sync to Supabase when online
- Conflict-free data synchronization
- Privacy (data stays on device until synced)

Legend-State replaces the traditional Zustand + SQLite + manual sync pattern with a single, unified solution purpose-built for local-first Supabase apps.

### 3. Shared Packages Strategy

Three apps with overlapping functionality justify shared packages:

- Exercise definitions shared across all apps
- Timer components used in Qigong and GTG
- Auth wrapper used by all three
- UI components built once, used everywhere

### 4. Database Isolation

One Supabase instance per environment (dev/prod) with three separate PostgreSQL databases:

- `qigong_db` - Qigong app data
- `walking_db` - Walking app data
- `gtg_db` - GTG app data

Auth is shared (users table has `app_id` column). Storage uses folders per app.

### 5. Migration Workflow

```
Local Dev Supabase
    → Export schema via pg_dump
    → Commit .sql to git
    → GitHub Actions
    → Apply to Production Supabase
```

### 6. Separation Path

Each app can be moved to its own VPS when needed:

1. Export database (SQL dump)
2. Export users from auth (filtered by app_id)
3. Export storage folder
4. Spin up new Supabase instance
5. Import everything
6. Update app to point to new Supabase URL

---

## File Structure

```
expo-research/
├── apps/
│   ├── qigong/
│   │   ├── app/              # Expo Router pages
│   │   ├── src/              # Components, hooks, stores
│   │   └── package.json
│   ├── walking/
│   │   ├── app/
│   │   ├── src/
│   │   └── package.json
│   └── gtg/
│       ├── app/
│       ├── src/
│       └── package.json
│
├── packages/
│   ├── ui/                   # NativeWind components
│   ├── timer-core/           # Reusable timer logic (Reanimated)
│   ├── auth/                 # Supabase client wrapper
│   └── utils/                # Shared utilities
│
├── infrastructure/
│   └── supabase/
│       ├── docker/            # Docker compose files
│       ├── migrations/        # Version-controlled migrations
│       └── config/            # Supabase configuration
│
├── docs/
│   ├── ARCHITECTURE.md        # This file
│   ├── DEPLOYMENT.md          # Complete deployment guide
│   ├── TESTING.md             # Testing on all devices
│   ├── LOCAL_FIRST.md         # Legend-State setup guide
│   ├── SUPABASE_MIGRATIONS.md # DB migration guide
│   └── ...
│
├── .github/
│   └── workflows/
│       ├── ci.yml             # Lint, typecheck, test
│       ├── deploy-preview.yml # Deploy to preview domain
│       ├── deploy-production.yml # Deploy to production
│       ├── sync-migrations.yml # Apply DB migrations
│       └── rollback.yml        # Rollback workflow
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## App-Specific Features

### Qigong App

- Animated character guiding through exercises (Lottie 2D)
- Timer per exercise, rest periods, program duration
- Pre-built programs (beginner, intermediate, advanced)
- Custom program builder
- Share programs (export/import JSON)
- Progress tracking

### Walking App

- Route input (distance, preferred spots)
- OpenStreetMap integration
- Custom routing based on location
- Photo capture for Instagram story export
- Share routes (link + image)
- GPS navigation (future)

### Greasing the Groove App

- Exercise library with rep schemes
- Daily/multiple daily tracking
- Progress visualization
- Push notification reminders (future)
- Simple, offline-first

---

## Development Phases

### Phase 1: Foundation (Weeks 1-2)

1. Set up monorepo (Turborepo + pnpm)
2. Configure Supabase on dev VPS
3. Set up GitHub Actions CI/CD
4. Create shared packages (ui, auth, timer-core)
5. Set up Legend-State with Supabase sync
6. Implement GTG app (simplest, learn foundation)

### Phase 2: Walking App (Weeks 5-8)

1. Add maps integration
2. Implement route planning
3. Photo sharing functionality
4. Edge Functions for route optimization

### Phase 3: Qigong App (Weeks 9-14)

1. Implement program builder
2. Add Lottie animations
3. Timer synchronization
4. Program sharing

### Phase 4: Polish & Scale (Weeks 15+)

1. OTA updates (Xavia)
2. Payments (RevenueCat)
3. User profiles and social features
4. Performance optimization

---

## Notes

- Apple Sign In requires Apple Developer Program membership ($99/year)
- Google Sign In requires Google Cloud project (free tier)
- All apps must comply with App Store/Play Store guidelines
- RevenueCat free up to $10k MRR, then 3% fee
- Develop on VPS with live preview domain for fast iteration
- Use GitHub Actions pipeline for preview and production deployments
- Keep previous builds on production VPS for easy rollback
