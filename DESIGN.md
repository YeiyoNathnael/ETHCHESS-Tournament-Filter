---
name: ETHCHESS Tournament Participant Filter System
colors:
  primary-deep: "#0D5C4D"
  primary-dark: "#07473B"
  primary-mineral: "#009E60"
  primary-bright: "#00A86B"
  primary-light: "#E6F7F0"
  primary-border: "#A2E2C7"
  secondary: "#D96B43"
  secondary-bright: "#E2725B"
  secondary-dark: "#C85A32"
  neutral-bg: "#FAFAF5"
  neutral-surface: "#FAF7F2"
  neutral-card: "#FFFFFF"
  neutral-border: "#E8E2D5"
  text-main: "#1C2A27"
  text-muted: "#5C6E6B"
  success-bg: "#E6F7F0"
  success-text: "#0E7B4E"
  danger-bg: "#FDE8E6"
  danger-text: "#C82A2A"
typography:
  headline-lg: { fontFamily: Space Grotesk, fontSize: 32px, fontWeight: 700, lineHeight: 1.2 }
  headline-md: { fontFamily: Space Grotesk, fontSize: 24px, fontWeight: 700, lineHeight: 1.3 }
  body-md: { fontFamily: Space Grotesk, fontSize: 16px, fontWeight: 400, lineHeight: 1.5 }
  label-md: { fontFamily: Space Grotesk, fontSize: 14px, fontWeight: 600, lineHeight: 1.4 }
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary-deep}"
    rounded: "{rounded.sm}"
    padding: 10px 20px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    rounded: "{rounded.sm}"
    padding: 10px 20px
  card:
    backgroundColor: "{colors.neutral-card}"
    rounded: "{rounded.md}"
    padding: 24px
---

# ETHCHESS Tournament Participant Filter & Event Portal

## Overview
A high-trust, sports-luxe event management and participant eligibility screening system built for ETHCHESS Club. Designed with Space Grotesk typography, vibrant mineral **Jade Green** (#00A86B / #009E60 / #0D5C4D), warm **Terracotta** accent (#D96B43 / #E2725B), and **Cream White** background (#FAFAF5 & #FAF7F2).

## Colors
- **Vibrant Mineral Jade Green (#00A86B / #009E60 / #0D5C4D):** Grounding headers, active state highlights, live rating verification glows, and primary actions.
- **Warm Terracotta Accent (#D96B43 / #E2725B):** Event tags, key callouts, badges, Telegram confirmation buttons, and delete actions.
- **Cream White (#FAFAF5, #FAF7F2 & #FFFFFF):** Tactile card backgrounds, contrast panels, and clean table surfaces.

## Typography
Space Grotesk font family loaded across display titles, stats, table data, pill badges, and input controls for a geometric, modern chess-engine aesthetic.

## Components
- **Navbar:** Sticky Jade header with club logo, badge, and quick route navigation.
- **Tournament Card:** Event overview cards with cover image, time control tag, separate Chess.com vs Lichess rules summary, live participant count, quick manage links, and deletion modal.
- **CSV Uploader:** Drag-and-drop zone with single-click default CSV loader and progress animation.
- **Participant Reviewer:** Detailed verification table with platform inspection pills, instant search filter, status tabs, organizer manual override toggles, and direct Telegram direct message launcher with clipboard auto-copy.
- **Requirement Tweak Drawer:** Live rule adjustment sidebar allowing separate Chess.com vs Lichess criteria tweaking.
- **Public Roster View:** Player-facing shareable landing view highlighting verified approved players with separate criteria breakdown box.

