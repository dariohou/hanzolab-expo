# Testing Guide - All Devices and Methods

## Overview

This guide covers all testing methods available for the three apps (GTG, Walking, Qigong) across different devices and environments.

---

## Testing Matrix

| Method               | Device           | Speed       | Purpose                     |
| -------------------- | ---------------- | ----------- | --------------------------- |
| **Web (Live)**       | Browser          | ⚡ Instant  | UI/UX development iteration |
| **Web (Preview)**    | Browser          | 🐢 3-5 min  | Production-like testing     |
| **iOS Simulator**    | Mac              | 🐢 5-10 min | iOS UI testing              |
| **Physical iPhone**  | iPhone via Orbit | ⚡ Fast     | Real device testing         |
| **Android Emulator** | Mac/PC           | 🐢 5-10 min | Android UI testing          |
| **Physical Android** | Android device   | ⚡ Fast     | Real device testing         |

---

## 1. Web Development (Fastest)

### Local Development on VPS

```bash
# On dev VPS - start web server
cd /path/to/expo-research/apps/gtg
expo start --web

# App now running at live.your-domain.com
# Changes to code auto-refresh in browser (hot reload)
```

**Best for:**

- HTML/CSS/JS changes
- Navigation flow testing
- Responsive design
- Component development

### Preview Domain (Pipeline Tested)

```bash
# Push to main branch triggers GitHub Actions
git push origin main

# After pipeline completes:
# - Web build deployed to preview.your-domain.com
# - Native builds (.ipa, .apk) uploaded to artifacts
# - Native apps available for distribution
```

---

## 2. iOS Testing

### Option A: iOS Simulator (Mac)

#### Setup

1. **Install Xcode** from Mac App Store
2. **Open Xcode** → Preferences → Components → Install iOS Simulator
3. **Choose device** (iPhone 15, iPad, etc.)

#### Building for Simulator

**Method 1: Local build on Mac**

```bash
# On your Mac (not VPS)
git clone https://github.com/your-org/expo-research.git
cd expo-research/apps/gtg

# Install dependencies
pnpm install

# Install EAS CLI
npm install -g eas-cli
eas login

# Build for simulator
eas build --platform ios --profile preview

# Download the .app file (simulator build)
# Unzip and open in Xcode
open *.app
```

**Method 2: Use GitHub artifact**

```bash
# Download from GitHub Actions run
gh run download

# The .app will be in ~/Library/Developer/Xcode/DerivedData/
```

#### Running on Simulator

1. Open Xcode
2. File → Open → Select the `.app` file
3. Select iOS Simulator device from dropdown
4. Click Run (▶️)

---

### Option B: Physical iPhone via Expo Orbit

#### Setup

1. **Download Expo Orbit** from Mac App Store
2. **Connect iPhone to Mac** via USB
3. **Trust computer** on iPhone when prompted

#### Development Workflow

```bash
# On dev VPS - start development server
cd /path/to/expo-research/apps/gtg

# Start with dev client (enables Orbit)
npx expo start --dev-client

# When you see "React Native" prompt on iPhone, tap "Install"
# OR: Open Expo Orbit on Mac → select project → Install on iPhone
```

#### Using Expo Orbit

1. **Open Expo Orbit** on your Mac
2. **Connect** to same network as dev VPS
3. **Select project** from list
4. **Tap Install** next to your iPhone
5. App installs and opens on iPhone

**For faster updates after code changes:**

- On VPS: Make code change → auto-saves
- On iPhone: New JS bundle pushed automatically (faster than rebuild)

---

### Option C: Ad-hoc Distribution (Diawi)

For testing without App Store:

```bash
# GitHub workflow builds .ipa
# Then uploads to Diawi

# You receive email with install link
# Open link on iPhone → Install app
```

**Note:** Ad-hoc builds expire after certain time (typically 30 days)

---

## 3. Android Testing

### Option A: Android Emulator

#### Setup

1. **Install Android Studio** from developer.android.com
2. **Create AVD** (Android Virtual Device):
   - Open Android Studio
   - Tools → Device Manager → Create Device
   - Select Pixel 6 or similar
   - Download system image (API 34)
   - Create AVD

#### Building for Emulator

```bash
# On your Mac (not VPS)
git clone https://github.com/your-org/expo-research.git
cd expo-research/apps/gtg

pnpm install
eas login

# Build for Android emulator
eas build --platform android --profile preview

# Download .apk
# Drag .apk to emulator window to install
# OR: adb install *.apk
```

#### Running on Emulator

```bash
# Start emulator
open -a "Android Studio"
# Or from command line:
emulator @pixel-6-api-34

# Install APK
adb install apps/gtg/android/app/build/outputs/apk/debug/app-debug.apk

# Open app
adb shell am start -n com.yourcompany.gtg/.MainActivity
```

---

### Option B: Physical Android Device

#### USB Debugging

1. **Enable Developer Options** on Android:
   - Settings → About Phone → Tap "Build Number" 7 times
2. **Enable USB Debugging:**
   - Settings → System → Developer Options → USB Debugging
3. **Connect USB** to Mac/PC
4. **Accept debugging prompt** on phone

#### Installing APK

**Option 1: ADB (Command Line)**

```bash
# Connect device, then:
adb install apps/gtg/android/app/build/outputs/apk/debug/app-debug.apk
```

**Option 2: Direct Install**

- Send .apk to phone via email/cloud
- Open file on phone to install

**Option 3: Google Play Console**

- Upload to Play Console internal testing
- Install from Play Store link

---

## 4. GitHub Actions Artifacts

After any build workflow, artifacts are stored:

### Download via GitHub CLI

```bash
# List recent workflow runs
gh run list

# Download artifacts from a run
gh run download [run-id]

# Or download specific artifact
gh release download [release-tag]
```

### Download via Web

1. Go to repository → Actions tab
2. Select workflow run
3. Scroll to Artifacts section
4. Click to download

---

## 5. Testing Checklist

### Before Testing Any App

- [ ] Code builds without errors
- [ ] Expo doctor passes: `npx expo doctor`
- [ ] All environment variables set

### Testing Web

- [ ] Responsive on mobile viewport
- [ ] No console errors
- [ ] Navigation works
- [ ] Forms submit correctly

### Testing iOS (Simulator)

- [ ] App launches
- [ ] Navigation works
- [ ] Buttons respond
- [ ] No crash on startup

### Testing iOS (Physical Device)

- [ ] App installs via Orbit
- [ ] Notifications work (if enabled)
- [ ] Camera/gallery access (if needed)
- [ ] Biometric auth (if enabled)

### Testing Android (Emulator)

- [ ] App launches
- [ ] Navigation works
- [ ] Back button works
- [ ] No crash on startup

### Testing Android (Physical Device)

- [ ] App installs
- [ ] All permissions granted
- [ ] Fingerprint/face unlock (if enabled)
- [ ] Battery optimization disabled for testing

---

## 6. Expo Orbit Tips

### Common Issues

**Orbit doesn't see device:**

- Ensure iPhone and Mac on same network
- Disable VPN on iPhone
- Try turning WiFi off/on on iPhone

**Orbit shows "No projects found":**

- Run `npx expo start --dev-client` on VPS
- Wait for "Metro waiting" message
- Refresh Orbit

**Install fails on iPhone:**

- Ensure iPhone trusted computer in Settings → General → VPN & Device Management
- Check if developer mode enabled on iPhone

---

## 7. Testing Environment URLs

| Environment | URL                       | Notes               |
| ----------- | ------------------------- | ------------------- |
| Live (Web)  | `live.your-domain.com`    | Hot reload, fastest |
| Preview     | `preview.your-domain.com` | Pipeline built      |
| Production  | `prod.your-domain.com`    | Production version  |

---

## 8. Debugging

### Web Debugging

```bash
# On dev VPS
# Open browser DevTools
# React DevTools extension
# Network tab for API calls
```

### iOS Debugging (Physical)

```bash
# Connect iPhone to Mac via USB
# Open Safari on iPhone
# Settings → Safari → Advanced → Web Inspector = ON
# Open Safari on Mac → Develop menu → Select iPhone
```

### Android Debugging

```bash
# Connect Android to Mac/PC via USB
# Enable USB debugging on device

# View logs
adb logcat

# React Native debugger
npx react-native-debugger
```

---

## 9. Testing Matrix Per App

### GTG App

| Feature            | Test Method      | Device |
| ------------------ | ---------------- | ------ |
| Exercise timer     | Web              | Chrome |
| Rep tracking       | Web              | Chrome |
| Program creation   | iOS Simulator    | Xcode  |
| Push notifications | Physical iPhone  | Orbit  |
| Data sync          | Physical Android | ADB    |

### Walking App

| Feature         | Test Method      | Device     |
| --------------- | ---------------- | ---------- |
| Route display   | Web              | Chrome     |
| Map interaction | iOS Simulator    | Xcode      |
| Photo capture   | Physical iPhone  | Orbit      |
| GPS tracking    | Physical Android | Direct APK |

### Qigong App

| Feature            | Test Method      | Device     |
| ------------------ | ---------------- | ---------- |
| Animation playback | Web              | Chrome     |
| Program timer      | iOS Simulator    | Xcode      |
| Lottie animations  | Physical iPhone  | Orbit      |
| Sound playback     | Physical Android | Direct APK |

---

## 10. Quick Test Commands

```bash
# Check if app builds
pnpm --filter @company/gtg build

# Run typecheck
pnpm typecheck

# Run lint
pnpm lint

# Run tests
pnpm test

# Check Expo doctor
npx expo doctor

# Clear Metro cache
npx expo start --clear
```
