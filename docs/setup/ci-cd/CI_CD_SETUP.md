# CI/CD Setup - GitHub Actions for Expo

## Overview

This document covers the continuous integration and deployment setup using GitHub Actions, enabling local builds and automated testing.

---

## Build Strategies

### Cloud Build (EAS)
- Default Expo approach
- Requires EAS subscription
- Easy setup, less control

### Local Build (GitHub Actions + EAS CLI)
- Use `eas build --local` 
- Run builds on your own CI/CD runners
- Free (just need GitHub Actions runners)
- More control over build environment

---

## GitHub Actions Workflows

### 1. CI Workflow (Automated on Push)

Located at `.github/workflows/ci.yml`:

**Purpose:** Run on every push to verify code quality

**Jobs:**
1. `lint-and-typecheck` - Verify TypeScript and ESLint pass
2. `test` - Run Jest tests
3. `build-apps` - Test that apps build successfully

### 2. Local Build Workflow (Manual Dispatch)

Located at `.github/workflows/build-local.yml`:

**Purpose:** Manually trigger builds for iOS/Android

**Trigger:** Workflow dispatch with inputs:
- `app`: gtg, qigong, walking
- `platform`: ios, android, all

---

## Secrets Configuration

Required GitHub Secrets:

### For All Apps
```
EXPO_PUBLIC_SUPABASE_URL=https://your-domain.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_TOKEN=your-expo-token
```

### For iOS Builds
```
APPLE_CERTIFICATE=base64-encoded-certificate.p12
APPLE_CERTIFICATE_PASSWORD=cert-password
APPLE_PROVISIONING_PROFILE=base64-encoded-profile
```

### For Android Builds
```
ANDROID_KEYSTORE=base64-encoded-keystore
ANDROID_KEYSTORE_PASSWORD=keystore-password
```

---

## Setting Up Secrets

### 1. Get EAS Token

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Create token
eas token:create --name "GitHub Actions"
```

### 2. Get Apple Certificate

```bash
# Create certificate in Apple Developer Console
# Download as .p12 file

# Convert to base64
base64 -i certificate.p12 -o certificate.base64

# Add to GitHub Secrets as APPLE_CERTIFICATE
```

### 3. Get Android Keystore

```bash
# Generate new keystore (if needed)
keytool -genkey -v -keystore release.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000

# Convert to base64
base64 -i release.keystore -o keystore.base64

# Add to GitHub Secrets as ANDROID_KEYSTORE
```

---

## Local Build Setup

### macOS Runner for iOS

macOS runners come with Xcode pre-installed. No additional setup needed.

### Linux Runner for Android

Android SDK needs to be installed:

```yaml
- name: Setup Android SDK
  uses: android-actions/setup-android@v3
```

### Windows Runner (Alternative)

For Windows-specific builds, use:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
```

---

## Build Caching

### pnpm Cache

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm
```

### Turborepo Cache

Turborepo automatically caches build outputs. Configure in `turbo.json`:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".expo/**", ".next/**", "dist/**"],
      "cache": true
    }
  }
}
```

---

## EAS Build Profiles

### eas.json Structure

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

### Development Build

Used for testing with Expo Go replacement.

```bash
eas build --platform ios --profile development
```

### Preview Build

Used for TestFlight/internal testing.

```bash
eas build --platform ios --profile preview
```

### Production Build

Used for App Store submission.

```bash
eas build --platform ios --profile production
```

---

## Local Build Commands

### iOS Local Build

```bash
# Ensure Xcode is installed
xcode-select --install

# Build for iOS Simulator
eas build --local --platform ios --profile preview --profile development

# Build for iOS Device (requires Apple Developer account)
eas build --local --platform ios --profile production
```

### Android Local Build

```bash
# Install Android SDK (Ubuntu/Debian)
sudo apt update
sudo apt install openjdk-17-jdk
export ANDROID_HOME=/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Build debug APK
eas build --local --platform android --profile preview

# Build release APK
eas build --local --platform android --profile production
```

---

## Workflow Examples

### Complete iOS Build Workflow

```yaml
name: Build iOS

on:
  workflow_dispatch:
    inputs:
      app:
        description: 'App name'
        required: true
        type: choice
        options:
          - gtg
          - qigong
          - walking

jobs:
  build-ios:
    runs-on: macos-latest
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

      - name: Install Apple certificates
        env:
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
        run: |
          # Create certificate
          echo "$APPLE_CERTIFICATE" | base64 -d > certificate.p12
          
          # Import to keychain
          security import certificate.p12 -P "$APPLE_CERTIFICATE_PASSWORD" \
            -A -t cert -f pkcs12 -k /Library/Keychains/system.keychain
          
          # Set keychain settings
          security set-key-partition-list -S apple-tool:apple: \
            -k /Library/Keychains/system.keychain \
            -T /usr/bin/codesign \
            -T /usr/bin/security \
            -T /usr/bin/xcodebuild \
            -T /usr/bin/xcrun

      - name: Build iOS
        run: |
          cd apps/${{ inputs.app }}
          eas build --local --platform ios --profile production
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Upload IPA
        uses: actions/upload-artifact@v4
        with:
          name: ios-build-${{ inputs.app }}
          path: apps/${{ inputs.app }}/ios-build/*.ipa
```

### Complete Android Build Workflow

```yaml
name: Build Android

on:
  workflow_dispatch:
    inputs:
      app:
        description: 'App name'
        required: true
        type: choice
        options:
          - gtg
          - qigong
          - walking

jobs:
  build-android:
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

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Build Android
        run: |
          cd apps/${{ inputs.app }}
          eas build --local --platform android --profile production
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          ANDROID_KEYSTORE: ${{ secrets.ANDROID_KEYSTORE }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: android-build-${{ inputs.app }}
          path: apps/${{ inputs.app }}/android/app/build/outputs/apk/**/*.apk
```

---

## Testing in CI/CD

### Jest Configuration

Create `jest.config.js` in root:

```javascript
module.exports = {
  projects: [
    '<rootDir>/apps/*/jest.config.js',
  ],
  filter: '<rootDir>/packages/*/jest.config.js',
};
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @company/ui test

# Run with coverage
pnpm test -- --coverage
```

---

## Deployment Pipeline

### Automatic Deployment Flow

```
Developer Push → GitHub → CI Pipeline → Build → Test → Deploy
                                            ↓
                                      App Store
```

### Manual Deployment Flow (Recommended for App Store)

1. Run build workflow manually
2. Download artifact (.ipa or .apk)
3. Test on device/simulator
4. Submit via App Store Connect or Play Console

---

## Monitoring Builds

### Checking Build Status

```bash
# Check build status
gh run list

# View build logs
gh run view [run-id] --log

# Download artifacts
gh run download [run-id]
```

### Common Build Failures

| Issue | Solution |
|-------|----------|
| Node version mismatch | Update `.nvmrc` or `engines` in package.json |
| pnpm not found | Update pnpm setup action version |
| Apple cert invalid | Regenerate and re-upload certificate |
| Android SDK not found | Add `android-actions/setup-android@v3` step |
| TypeScript errors | Run `pnpm typecheck` locally before pushing |

---

## Maintenance

### Updating EAS CLI

```bash
# Update in all apps
pnpm --filter @company/gtg exec npm install eas-cli@latest
```

### Updating Node Version

When updating Node version:
1. Update `.nvmrc` in project root
2. Update GitHub Actions workflow Node version
3. Update `engines.node` in `package.json`

### Cleaning Build Cache

```bash
# Clear Turborepo cache
rm -rf .turbo
rm -rf node_modules/.cache

# Clear pnpm store
pnpm store prune
```

---

## Security Considerations

### Secret Management
- Never commit secrets to repository
- Use GitHub Secrets for all sensitive data
- Rotate secrets periodically

### Certificate Security
- Apple certificates expire yearly
- Set calendar reminder to renew
- Store certificate passwords securely

### Build Artifact Security
- Artifacts are stored in GitHub for 90 days
- Download and secure production builds
- Delete old artifacts after deployment