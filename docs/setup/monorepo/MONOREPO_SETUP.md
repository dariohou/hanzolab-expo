# Monorepo Setup - Turborepo + pnpm + Expo

## Overview

This guide sets up a production-ready monorepo using:

- **Turborepo 2+** - Build orchestration and caching
- **pnpm 9+** - Fast, space-efficient package manager
- **Expo SDK 52+** - Mobile app framework
- **TypeScript** - Strict mode enabled

---

## Prerequisites

- Node.js 20+ (use `nvm` for version management)
- pnpm 9+ (`npm install -g pnpm`)
- Xcode (for iOS development)
- Android Studio (for Android development)
- Docker (for Supabase local development)

---

## Step 1: Initialize Project

```bash
# Create project directory
mkdir expo-research && cd expo-research

# Initialize npm project
npm init -y

# Enable pnpm workspaces
echo 'node-linker=hoisted' > .npmrc
```

---

## Step 2: Root Package.json

Create `package.json` in root:

```json
{
  "name": "expo-research",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "clean": "turbo clean",
    "typecheck": "turbo typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "prettier": "^3.3.0",
    "turbo": "^2.0.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

## Step 3: Turborepo Configuration

Create `turbo.json` in root:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".expo/**", ".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## Step 4: TypeScript Base Configuration

Create `tsconfig.base.json` in root:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-native",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true
  },
  "exclude": ["node_modules", "dist", ".expo", ".turbo"]
}
```

---

## Step 5: Create Directory Structure

```bash
# Create apps directory
mkdir -p apps/qigong apps/walking apps/gtg

# Create packages directory
mkdir -p packages/ui packages/timer-core
mkdir -p packages/auth packages/state packages/utils

# Create infrastructure directory
mkdir -p infrastructure/supabase/docker infrastructure/supabase/migrations
mkdir -p infrastructure/xavia-ota/docker

# Create docs directory
mkdir -p docs/setup/infrastructure docs/setup/monorepo docs/setup/apps
mkdir -p docs/setup/packages docs/setup/ci-cd docs/implementation
mkdir -p docs/database docs/auth

# Create .github/workflows directory
mkdir -p .github/workflows
```

---

## Step 6: Create Shared UI Package

Create `packages/ui/package.json`:

```json
{
  "name": "@company/ui",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./components/*": "./src/components/*.tsx",
    "./theme": "./src/theme/index.ts"
  },
  "scripts": {
    "lint": "eslint src/**/*.ts*",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.3.0",
    "react-native": "^0.76.0"
  },
  "dependencies": {
    "react-native-safe-area-context": "^4.12.0",
    "react-native-screens": "^3.35.0",
    "expo-linear-gradient": "~13.0.0",
    "nativewind": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.5.0"
  }
}
```

Create `packages/ui/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "references": []
}
```

---

## Step 7: Create Timer Core Package

Create `packages/timer-core/package.json`:

```json
{
  "name": "@company/timer-core",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/**/*.ts*",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.3.0"
  },
  "dependencies": {
    "react-native-reanimated": "~3.16.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.5.0"
  }
}
```

Create `packages/timer-core/src/types.ts`:

```typescript
export interface TimerConfig {
  duration: number; // total seconds
  restDuration?: number; // rest between intervals
  intervals?: number; // number of intervals
  autoStart?: boolean;
  soundEnabled?: boolean;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  remainingSeconds: number;
  elapsedSeconds: number;
  currentInterval: number;
}

export type TimerEvent =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'TICK' }
  | { type: 'COMPLETE' }
  | { type: 'INTERVAL_COMPLETE' };
```

---

## Step 9: Create Auth Package

Create `packages/auth/package.json`:

```json
{
  "name": "@company/auth",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/**/*.ts*",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "@react-native-async-storage/async-storage": "^2.0.0",
    "expo-secure-store": "^14.0.0",
    "expo-apple-authentication": "^7.0.0"
  },
  "peerDependencies": {
    "react": "^18.3.0",
    "react-native": "^0.76.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.5.0"
  }
}
```

---

## Step 10: Create State Package (Legend-State)

Create `packages/state/package.json`:

```json
{
  "name": "@company/state",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/**/*.ts*",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@legendapp/state": "@beta",
    "@legendapp/persist": "latest",
    "expo-sqlite": "~14.0.0",
    "@supabase/supabase-js": "^2.45.0"
  },
  "peerDependencies": {
    "react": "^18.3.0",
    "react-native": "^0.76.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.5.0"
  }
}
```

---

## Step 11: Create Utils Package

Create `packages/utils/package.json`:

```json
{
  "name": "@company/utils",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/**/*.ts*",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

---

## Step 12: Create Example App (GTG - Simplest First)

Create `apps/gtg/package.json`:

```json
{
  "name": "@company/gtg",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "build": "expo build",
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "eslint app/**/*.tsx src/**/*.ts*",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react": "^18.3.0",
    "react-native": "^0.76.0",
    "@legendapp/state": "@beta",
    "nativewind": "^5.0.0",
    "@company/ui": "workspace:*",
    "@company/timer-core": "workspace:*",
    "@company/auth": "workspace:*",
    "@company/state": "workspace:*",
    "@company/utils": "workspace:*"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@types/react": "^18.3.0",
    "typescript": "^5.5.0",
    "expo-dev-client": "~4.0.0"
  }
}
```

Create `apps/gtg/app.json`:

```json
{
  "expo": {
    "name": "GTG",
    "slug": "gtg",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "gtg",
    "userInterfaceStyle": "automatic",
    "splash": {
      "backgroundColor": "#1a1a1a",
      "resizeMode": "contain"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.gtg",
      "supportsTablet": true,
      "infoPlist": {
        "UIBackgroundModes": ["fetch", "remote-notification"]
      }
    },
    "android": {
      "package": "com.yourcompany.gtg",
      "adaptiveIcon": {
        "backgroundColor": "#1a1a1a"
      }
    },
    "plugins": [
      "expo-router",
      [
        "expo-build-properties",
        {
          "ios": {
            "newArchEnabled": true
          },
          "android": {
            "newArchEnabled": true
          }
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

Create `apps/gtg/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <View className="flex-1 bg-background">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1a1a1a' },
        }}
      />
    </View>
  );
}
```

Create `apps/gtg/app/index.tsx`:

```tsx
import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-4xl font-bold text-white mb-8">GTG</Text>
      <Text className="text-gray-400 text-center px-8 mb-8">
        Greasing the Groove - Get stronger using this technique
      </Text>
      <Link href="/exercises" className="px-6 py-3 bg-primary rounded-lg">
        <Text className="text-white font-semibold">Get Started</Text>
      </Link>
    </View>
  );
}
```

---

## Step 13: App.json for Expo Router

Create `apps/gtg/eas.json`:

```json
{
  "cli": {
    "version": ">= 13.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com"
      }
    }
  }
}
```

---

## Step 14: NativeWind Configuration

Create `apps/gtg/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1a1a',
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#ec4899',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
};
```

Create `apps/gtg/babel.config.js`:

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
    'nativewind/babel',
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { version: 'legacy' }],
    'react-native-reanimated/plugin', // Must be last
  ].filter(Boolean),
};
```

Create `apps/gtg/nativewind-env.d.ts`:

```typescript
/// <reference types="nativewind/types" />
```

---

## Step 15: TypeScript Config for Apps

Create `apps/gtg/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@company/ui": ["../../packages/ui/src"],
      "@company/timer-core": ["../../packages/timer-core/src"],
      "@company/auth": ["../../packages/auth/src"],
      "@company/state": ["../../packages/state/src"],
      "@company/utils": ["../../packages/utils/src"]
    },
    "outDir": "./dist"
  },
  "include": ["app/**/*", "src/**/*", "*.ts", "*.tsx", ".expo/types/**/*.ts", ".expo/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Step 16: GitHub Actions CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-typecheck:
    name: Lint and Typecheck
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck all packages
        run: pnpm typecheck

      - name: Lint all packages
        run: pnpm lint

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Test all packages
        run: pnpm test

  build-apps:
    name: Build Apps
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, test]
    strategy:
      fail-fast: false
      matrix:
        app: [qigong, walking, gtg]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build ${{ matrix.app }}
        run: pnpm --filter @company/${{ matrix.app }} build
        env:
          # Add any build env vars here
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY }}
```

---

## Step 17: Local Build Workflow

Create `.github/workflows/build-local.yml`:

```yaml
name: Local Build

on:
  workflow_dispatch:
    inputs:
      app:
        description: 'App to build'
        required: true
        type: choice
        options:
          - qigong
          - walking
          - gtg
      platform:
        description: 'Platform to build for'
        required: true
        type: choice
        options:
          - ios
          - android
          - all

jobs:
  build-ios:
    name: Build iOS
    runs-on: macos-latest
    if: inputs.platform == 'ios' || inputs.platform == 'all'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest

      - name: Install Apple provisioning profile
        env:
          APPLE_PROVISIONING_PROFILE: ${{ secrets.APPLE_PROVISIONING_PROFILE }}
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
        run: |
          # Create certificate files
          echo "$APPLE_CERTIFICATE" | base64 -d > certificate.p12

          # Import to keychain
          security import certificate.p12 -P "$APPLE_CERTIFICATE_PASSWORD" -A -t cert -f pkcs12 -k /Library/Keychains/system.keychain

      - name: Build iOS (Local)
        run: |
          cd apps/${{ inputs.app }}
          eas build --local --platform ios --profile production
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

  build-android:
    name: Build Android
    runs-on: ubuntu-latest
    if: inputs.platform == 'android' || inputs.platform == 'all'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Build Android (Local)
        run: |
          cd apps/${{ inputs.app }}
          eas build --local --platform android --profile production
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          ANDROID_KEYSTORE: ${{ secrets.ANDROID_KEYSTORE }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
```

---

## Step 18: Prettier Configuration

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Create `.prettierignore`:

```
node_modules/
.expo/
dist/
.turbo/
*.local
coverage/
.env
.env.*
!.env.example
```

---

## Step 19: Install All Dependencies

```bash
# Install dependencies
pnpm install

# Verify monorepo structure
pnpm list --depth -1
```

Expected output:

```
├── @company/auth@0.1.0
├── @company/state@0.1.0
├── @company/gtg@0.1.0 (app)
├── @company/qigong@0.1.0 (app) - will be created later
├── @company/timer-core@0.1.0
├── @company/ui@0.1.0
├── @company/utils@0.1.0
├── @company/walking@0.1.0 (app) - will be created later
├── expo-research (root)
├── turbo@2.0.0
└── typescript@5.5.0
```

---

## Step 20: Verify Build

```bash
# Test typecheck on all packages
pnpm typecheck

# Test lint on all packages
pnpm lint

# Test build on GTG app
pnpm --filter @company/gtg build
```

---

## Troubleshooting

### pnpm workspace issues

If packages aren't linking correctly:

```bash
# Clean and reinstall
rm -rf node_modules
pnpm store prune
pnpm install
```

### Turborepo cache issues

```bash
# Clear turbo cache
pnpm turbo clean
rm -rf .turbo
```

### NativeWind not working

Ensure babel config has the correct plugin order:

```javascript
// babel.config.js - order matters!
module.exports = {
  plugins: [
    'nativewind/babel',
    'react-native-reanimated/plugin', // Must be LAST
  ],
};
```

---

## Next Steps

After completing setup:

1. Review `docs/ARCHITECTURE.md` for app-specific requirements
2. Set up Supabase on VPS (see `infrastructure/supabase/`)
3. Start implementing GTG app as first production app
4. Establish CI/CD pipeline before writing production code
