# Elcano Expo Project Structure

This overview outlines the core folders used to organize the Elcano app. Each directory focuses on a specific concern so new features are easy to locate and maintain.

## Folder guide

- **app/** – Expo Router entry point for routes, layouts, and screen registration.
- **screens/** – Screen-level components for each major view (dashboard, offers, achievements). Screens compose UI elements and connect to data via hooks or services.
- **components/** – Reusable presentational building blocks (buttons, cards, list items) shared across screens.
- **services/** – Data-access and business-logic helpers such as API clients, storage utilities, and analytics wrappers.
- **navigation/** – Navigation configuration, route grouping, and shared navigation helpers for stacks, tabs, or modals.
- **firebase/** – Firebase initialization, typed helpers, and environment-specific configuration used by services or hooks.
- **hooks/** – Custom React hooks for stateful or data-fetching logic (e.g., pedometer polling, auth state, coin calculations).
- **assets/** – Images, icons, fonts, and other static resources packaged with the app.
- **constants/** – App-wide constants such as theme tokens, spacing scales, endpoint URLs, and feature flags.
- **context/** – React context providers that expose app-wide state like authentication, theme, or user progress.
- **scripts/** – Local development utilities and automation tasks.

## Shared UI building blocks

- **constants/ui.ts** – Central palette, spacing, radius, and typography tokens so screens stay visually consistent.
- **components/ScreenContainer.tsx** – Standard page padding/background with optional scrolling for long content.
- **components/SurfaceCard.tsx** – Reusable elevated surface with consistent radius and shadow.
- **components/BalancePill.tsx** – Badge-style balance display reused across dashboard and offers.

## Next steps

Place new files in the folder that matches their responsibility. For example, a leaderboard screen lives in `screens/`, the pedometer polling hook in `hooks/`, and an API wrapper in `services/`.
