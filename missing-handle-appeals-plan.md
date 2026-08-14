# Technical Plan: Header Overlay Debug, Mobile-First UI & Missing Handle Claims System

This plan details:
1. Debugging and eliminating the duplicate root header overlay so public pages (`/t/[id]`) display **only** the clean, Image 2 inspired header.
2. Mobile-first UI/UX overhaul for public tournament pages using `@frontend-architecture` and `@frontend-design` standards while strictly preserving Space Grotesk typography and the Jade Green / Terracotta palette.
3. Building a 2-choice decision modal and submission popup for unlisted or missing-Lichess players that populates a dedicated `participant_claims` database table for organizer review.

---

## 1. Architecture & Debugging Fix: Root Header Isolation

### Root Cause of Duplicate Navbar
In `app.vue`, `<Navbar />` was hardcoded above `<NuxtPage />` on every route. This caused the admin navigation bar to stack above the public navbar on public pages.

### Solution
- Convert `app.vue` to use Nuxt standard layouts (`<NuxtLayout><NuxtPage /></NuxtLayout>`).
- **`layouts/default.vue`**: Contains `<Navbar />` for Admin Dashboard (`/`, `/admin/...`).
- **`layouts/public.vue`**: Contains `<PublicNavbar />` (Image 2 inspiration) for public pages (`/t/[id]`).

### Image 2 Inspired Header (`PublicNavbar.vue`)
- Clean white/cream background header matching the user's inspiration screenshot:
  - **Left**: `ETHCHESS™` logo with a green `ROSTER` / `LEAGUE` pill badge.
  - **Right**: Minimal navigation links: `OVERALL`, `RULES`, `MISSING HANDLE?`, and a discrete `🔒 ADMIN` link.

---

## 2. Mobile-First Public Roster UI Overhaul

- **Mobile Viewport Optimization**:
  - Replace wide table layout on mobile (`< 768px`) with touch-friendly competitor cards showing rank, Telegram username, platform pills, and confirmed badges.
  - Sticky mobile search bar with instant handle filtering.
  - Responsive rules breakdown grid (stacked on mobile, side-by-side on desktop).

---

## 3. Missing Handle & Unlisted Registration Resolution System

### Database Schema (`server/db/schema.ts`)
Create a dedicated `participant_claims` SQLite table:
```ts
export const participantClaims = sqliteTable('participant_claims', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  claimType: text('claim_type').$type<'MISSING_LICHESS' | 'UNLISTED_REGISTERED'>().notNull(),
  telegramUsername: text('telegram_username').notNull(),
  chessComUser: text('chess_com_user'),
  lichessUser: text('lichess_user'),
  notes: text('notes'),
  status: text('status').$type<'PENDING' | 'APPROVED' | 'REJECTED'>().default('PENDING').notNull(),
  createdAt: text('created_at').notNull(),
});
```

### Nitro API Endpoints
1. `POST /api/tournaments/[id]/claims`: Accepts player claim submission.
2. `GET /api/tournaments/[id]/claims`: Admin fetch for submitted claims.
3. `PATCH /api/claims/[id]/status`: Admin endpoint to approve/reject claims. Approving automatically converts the claim into an official tournament participant!

### Public UI Callout Banner & 2-Choice Popup Flow
1. **Public Banner**:
   - Banner placed below the roster: *"Registered but can't find your name? Or forgot your Lichess handle?"* with a **"Submit Handle Resolution"** CTA button.
2. **Step 1: 2-Choice Decision Modal**:
   - **Option A**: *"I registered in the form, but didn't provide my Lichess handle."*
   - **Option B**: *"I registered and meet U1500 Lichess / U1200 Chess.com limits, but I'm not listed."*
3. **Step 2: Claim Submission Form Popup**:
   - Form requesting Telegram handle (`@username`), Chess.com handle, Lichess handle, and optional explanation.
   - On submit, saves entry into `participant_claims` and shows a confirmation toast.

### Admin Reviewer Integration
- In `components/ParticipantReviewer.vue`:
  - Add an **"Appeals & Claims (X)"** tab next to "All", "Eligible", "Approved".
  - Lists player claims with 1-click **"Approve & Add to Roster"** or **"Reject Claim"** buttons.
