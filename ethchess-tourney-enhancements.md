# ETHCHESS Tournament Filter — System Fixes & UI/UX Overhaul Plan

This plan details the debugging, full CRUD capabilities, separate Chess.com vs Lichess qualification criteria, accurate rating/peak stats engine, vibrant Jade Green UI overhaul, and test data cleanup.

---

## 🔍 1. Root Cause Analysis: Public Roster Loading Bug (`/debug`)

- **Symptom**: Navigating to `/tournaments/:id` stays stuck at "Loading tournament details...".
- **Root Cause**: `pages/tournaments/[id].vue` calls `fetchTournamentDetails(id)` on `useTournaments()`. However, `fetchTournamentDetails` was missing from the returned composable object, throwing an unhandled `TypeError` on component mount and leaving `pending.value = true` indefinitely.
- **Fix**: Implement `fetchTournamentDetails(id)` in `useTournaments.ts` to query `/api/tournaments/[id]` Nitro endpoint and update local reactive state.

---

## 🛠️ 2. Features & System Enhancements

### A. Full Event CRUD & Delete Event Feature
- Add `DELETE /api/tournaments/[id]` Nitro endpoint to delete a tournament and all its associated participants from SQLite/Turso.
- Add "Delete Event" action button on `TournamentCard.vue` and admin overview header with confirmation modal.
- Wipe initial mock/test data from database upon final testing completion, leaving a clean, fresh state for organizer use.

### B. Separate Qualification Criteria for Chess.com vs Lichess
- Update tournament rules model & schema:
  - **Chess.com Rules**: `chessComMaxRating`, `chessComMaxPeak`, `chessComMinGames`, `chessComMinAgeMonths`.
  - **Lichess Rules**: `lichessMaxRating`, `lichessMaxPeak`, `lichessMinGames`, `lichessMinAgeMonths`.
- Update `CreateTournamentModal.vue` & Admin Tweak Drawer to present side-by-side or tabbed configuration controls for both platforms separately.
- Update `ruleEngine.ts` to evaluate Chess.com stats against Chess.com rules, and Lichess stats against Lichess rules.

### C. UI/UX Overhaul — True Jade Green, Terracotta & Cream White
- **Vibrant Jade Green**: Primary `#00A86B`, Deep Jade `#0D5C4D`, Mint Light `#E6F7F0`, Accent Glow `#059669`.
- **Terracotta Accent**: Primary `#D96B43`, Terracotta Light `#FBECE7`, Dark Accent `#C85A32`.
- **Warm Cream Surface**: Page background `#FAFAF5`, Card `#FFFFFF`, Border `#E8E2D5`.
- **Space Grotesk Typography**: Geometric modern font hierarchy across headings, stats, badges, and tables.
- **UX Polish**: Responsive participant reviewer table, platform inspection pills, clear rejection tags, Telegram one-click "Accept & Confirm" clipboard copy + browser launch.

### D. Live Rating & Historical Peak Accuracy Check
- Verify `chessApi.ts` endpoints:
  - **Chess.com**: `https://api.chess.com/pub/player/{user}/stats` -> parses `chess_rapid`, `chess_blitz`, or `chess_bullet` for `last.rating` (current) and `best.rating` (peak).
  - **Lichess**: `https://lichess.org/api/user/{user}` -> parses `perfs[timeFormat].rating` (current), and `https://lichess.org/api/user/{user}/rating-history` -> parses historical `points` array for exact max rating.

---

## 🎼 Multi-Agent Implementation Tasks

1. **`debugger` / `explorer-agent`**: Diagnoses API route contracts and verifies fix for `/tournaments/:id` loading bug.
2. **`backend-specialist`**: Updates Drizzle schema, implements `DELETE /api/tournaments/[id]`, separate Chess.com vs Lichess criteria evaluation in `ruleEngine.ts`, and verifies rating/peak fetching accuracy.
3. **`frontend-specialist`**: Overhauls `DESIGN.md` and `assets/css/main.css` to true Jade Green + Terracotta, updates `CreateTournamentModal.vue`, `ParticipantReviewer.vue`, and public roster page.
4. **`test-engineer`**: Runs end-to-end verification script (`scratch_verification.ts`), verifies build, and clears test database.

---

## Verification Plan

- **Automated**: Run `scratch_verification.ts` testing handle sanitization, deduplication, separate platform rules, and event deletion.
- **Compilation**: Execute `npx nuxt build` with zero errors.
- **Manual**: Verify public page `/tournaments/:id` loads roster instantly, test event deletion, test separate Chess.com vs Lichess criteria inputs, and verify Telegram quick actions.
