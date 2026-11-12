## AI personal fitness coach

- [x] Replace the authenticated Coach placeholder with a protected AI chat assistant for workout questions, nutrition guidance, muscle-building advice, fat-loss guidance, exercise explanations, recovery/rest guidance, fitness habits and progress reviews.
- [x] Ground each response only in the signed-in user’s saved fitness profile plus approved workout and nutrition history; never invent user data or silently use another user’s records.
- [x] Use a secure backend-only Manus LLM call with a server-owned model selection, bounded input/history, practical explanations, general fitness guidance and explicit safety boundaries: no diagnosis, medication prescription or unsafe injury claims; recommend qualified medical care for injuries or medical concerns.
- [x] Save user/assistant chat turns securely with strict owner-scoped history queries and account deletion cascade; do not store API credentials or health data in the frontend.
- [x] Provide mobile loading, sending, retry, empty, offline/service-failure and privacy states without breaking Design Preview, navigation or prior features. Evidence: `pnpm check`, `pnpm lint`, 102 regression tests, `pnpm build`, `drizzle-kit check`, database migration 0007, and web/Android/iOS Expo export passed.
