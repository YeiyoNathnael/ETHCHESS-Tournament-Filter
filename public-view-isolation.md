# Technical Plan: Public View Isolation & UI Enhancement

This plan details the architecture and UI/UX design to isolate the public tournament roster view, remove all admin navigation links from the public page, and enhance the visual UI while strictly preserving the Space Grotesk typography and Jade Green / Terracotta / Cream White design system.

---

## 1. Isolated Public Route & Layout (`/t/[id]`)
- **Requirement**: The public page must operate strictly as an isolated view for players/spectators, with **no links back to the Admin Dashboard** ("Tournaments", "Admin", etc.).
- **Solution**:
  - Create a dedicated lightweight route `pages/t/[id].vue`.
  - Create a dedicated public navbar `components/PublicNavbar.vue` displaying only the ETHCHESS logo, event badge, confirmed player count, and a "Share Roster Link" button.
  - Strip all navigation links back to `/admin` or organizer controls.

## 2. Admin Sharing Integration
- Add a **"🔗 Copy Public Share Link"** button in `pages/admin/tournaments/[id].vue` and `components/TournamentCard.vue`.
- Generates `${window.location.origin}/t/${id}` and copies to clipboard with a toast notification.

## 3. UI/UX Enhancements (Preserving Brand System)
- **Palette Lock**: Jade Green (`#0F5257` / `#00A86B`), Terracotta (`#D96B43`), Cream White (`#FAF7F2` / `#FAFAF5`).
- **Typography Lock**: `Space Grotesk`.
- **Public Page Components**:
  1. **Hero Header**: Banner image with subtle gradient overlay, live date/location chips, time format badge, and total confirmed roster counter.
  2. **Qualification Criteria Breakdown**: Split Chess.com vs Lichess requirement cards.
  3. **Confirmed Roster Table / Grid**: Interactive search box, candidate rank index, Telegram handles, external platform pills (Chess.com & Lichess), verified ELO ratings, and `APPROVED` badges.
  4. **Strict Roster Filter**: Only shows candidates explicitly confirmed by organizer (`p.status === 'APPROVED'`).
