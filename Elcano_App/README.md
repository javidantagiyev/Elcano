# Elcano – Step tracking with rewards and achievements 🚶‍♀️

Elcano is a cross-platform Expo app that turns daily steps into coins you can spend on partner offers. The dashboard shows your live pedometer totals, calorie and distance estimates, a leaderboard, and a growing list of achievements based on your walking and coin-earning progress.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Firebase configuration

This project reads Firebase credentials from Expo environment variables prefixed with `EXPO_PUBLIC_`. Create a `.env` file (or set them in your build profile) with:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

The app initializes Firebase, enables email/password authentication helpers, and connects to Firestore via `firebaseConfig.ts` using these values.

## Battery-friendly step tracking

Elcano favors battery life while keeping steps accurate:

- **Background strategy:** When the app moves to the background, pedometer listeners are torn down and a lightweight reconciliation runs when the app returns to the foreground to capture steps taken while the app was idle.
- **Reduced sensor polling:** Foreground pedometer updates are buffered and flushed in 15-second batches so sensor callbacks and Firestore writes don't fire on every single step.
- **React Native pedometer best practices:** Motion permission checks gate all subscriptions, availability is verified before subscribing, and subscriptions/timeouts are cleaned up with `AppState` listeners to prevent leaks when the component unmounts or the app changes state.

## Challenge rules & achievements

Daily challenges are defined in Firestore under the `challenges` collection so they can be updated without shipping a new app build. Each document should follow this shape:

```json
{
  "title": "10k Daily Steps",
  "description": "Walk 10,000 steps in a single day to earn a reward.",
  "active": true,
  "rule": {
    "type": "daily_steps",
    "target": 10000,
    "dateField": "date" // optional, defaults to "date"
  },
  "reward": {
    "badgeId": "daily-10k",
    "badgeLabel": "10k Streak",
    "coins": 25
  }
}
```

When a user activity document under `users/{uid}/activities/{activityId}` is updated, the Cloud Function `handleActivityUpdate` evaluates active challenges, awards coins and badges on first completion, persists the badge IDs on the user profile, and writes a notification in `users/{uid}/notifications` so the client can surface the achievement.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
