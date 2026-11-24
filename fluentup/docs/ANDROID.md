# Android

Status: **configuration + notification code. No APK was built** (the build sandbox has no network and no Android SDK; only a JDK exists). Notifications and microphone were never run on a device.

## Build an APK yourself
Requirements: Node 18+, JDK 17, Android Studio (SDK + platform tools).
```
npm install
npm run build            # copies the app into www/
npx cap add android      # once
npm run android:sync
npx cap open android     # build/run from Android Studio, or: cd android && ./gradlew assembleDebug
```
APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Before release
- Generate icons from `icon.svg` (Android needs PNG: `npx @capacitor/assets generate`).
- Microphone: add `<uses-permission android:name="android.permission.RECORD_AUDIO"/>` (Capacitor's WebView also prompts at runtime; handle denial — the app already shows a message).
- Reliable reminders: **implemented in `src/core/notify.js`** (permission request, channel, weekly/one-off schedules rebuilt from the alarm list on every change, via `Capacitor.Plugins.LocalNotifications`; unit-tested with a mocked plugin only, **not run on a device**). After `npx cap add android`, `npm i` already lists the plugin; still add add `POST_NOTIFICATIONS` (Android 13+) and exact-alarm permission if needed. **Not implemented in code yet.**
- Android Web Speech recognition support varies by WebView; recording and TTS work in current WebViews.
- Sign the release build with your own keystore.

## Verified status (v0.7.0)
- This repository contains `capacitor.config.json` but NO generated `android/` directory. Nobody has built an APK from it.
- The build environment used so far had Java but no Android SDK, no Gradle and no network, so `npx cap add android` and `./gradlew assembleDebug` could not be run.
- To produce an APK on a machine with network access: install Android Studio (SDK 34+), JDK 17, then run `npm install`, `npm run build`, `npx cap add android`, `npx cap sync android`, then open `android/` in Android Studio or run `cd android && ./gradlew assembleDebug`. Test on a real device before release.
