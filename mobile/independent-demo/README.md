# Independent Android app starter

This folder is deliberately separate from the production website. It contains the first Android packaging shell with independent app identity:

- App name: `Account Demo`
- Android application ID: `com.independent.accountdemo`
- Web assets: `www/`

## Current status

This is a starter screen, not a finished banking application and not a release APK. It is visibly labeled as an independent demonstration and does not claim to provide real banking or transfer services.

## Build on Windows

1. Install a current Node.js LTS release and Android Studio with the Android SDK.
2. Open a terminal in this folder.
3. Run `npm install` (or use pnpm consistently if preferred).
4. Run `npx cap add android` once.
5. Run `npx cap sync android` after web assets change.
6. Run `npx cap open android`, then build and test the APK from Android Studio.

Do not add production credentials or signing keys to Git. Before expanding this starter, give the app a distinct identity and ensure any connected account or transfer functions are authorized, secure, and clearly represented to users.
