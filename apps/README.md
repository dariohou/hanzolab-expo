# Apps

This directory contains the three mobile applications:

- `gtg/` - Greasing the Groove app
- `walking/` - City walking app
- `qigong/` - Qigong exercise app

Each app is a standalone Expo project that imports shared packages from `/packages/*`.

## App Structure

Each app follows the same pattern:

```
app-name/
├── app/                 # Expo Router pages (file-based routing)
│   ├── _layout.tsx      # Root layout with providers
│   ├── index.tsx        # Home screen
│   ├── exercises/       # Exercise screens
│   ├── programs/        # Program screens
│   └── settings/        # Settings screens
├── src/
│   ├── components/      # App-specific components
│   ├── hooks/           # App-specific hooks
│   ├── stores/          # Zustand stores
│   └── utils/           # App-specific utilities
├── assets/              # Images, fonts, etc.
├── app.json             # Expo configuration
├── babel.config.js       # Babel configuration
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies
```

## Development

```bash
# Start GTG app
pnpm --filter @company/gtg dev

# Start Walking app
pnpm --filter @company/walking dev

# Start Qigong app
pnpm --filter @company/qigong dev
```
