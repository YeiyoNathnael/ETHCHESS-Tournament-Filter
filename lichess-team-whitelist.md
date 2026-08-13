# Technical Feasibility & Plan: Lichess Team Auto-Add, Whitelisting & Tournament Creation

This plan analyzes Lichess API capabilities based on the official Lichess API specification, OAuth2 scopes, and endpoint constraints to answer how ETHCHESS approved participants can be automatically admitted into a Lichess Team and Tournament.

---

## Technical Feasibility & Lichess API Research Summary

### 1. Direct "Auto-Adding" Players to a Team
* **API Capability**: ❌ **Not Supported by Lichess API**.
* **Reason**: Lichess strictly requires player consent. Third-party applications cannot force an arbitrary Lichess user into a team without the player clicking "Join Team".

### 2. Auto-Accepting Join Requests / Whitelisting
* **API Capability**: ⚠️ **No API endpoint for `POST /request/accept`**.
* **Workaround (Reverse Whitelist Auto-Kick Engine)**:
  * Team Leaders can grant an OAuth2 Bearer token with the `team:write` scope.
  * The Lichess API **does** expose `POST /team/{teamId}/kick/{userId}`.
  * **Mechanism**:
    1. The organizer sets the Lichess Team join policy to **Open** (or distributes a team join link).
    2. ETHCHESS Filter polls/streams current team members via `GET /api/team/{teamId}/users`.
    3. Any user in the Lichess team who is **not on the ETHCHESS Approved List** is automatically kicked via `POST /team/{teamId}/kick/{userId}`.
    4. Only approved players remain in the team!

### 3. Direct Tournament Creation & Entry Protection (Recommended Standard)
* **API Capability**: ✅ **Fully Supported via `POST /api/tournament` (Arena) and `POST /swiss/new` (Swiss)**.
* **Entry Restriction Options**:
  * **Method A: Team Restriction (`conditions.teamId`)**: The tournament is locked to members of the ETHCHESS Team. Combined with the Auto-Kick engine, only whitelisted players can join.
  * **Method B: Password / Entry Code (`password`)**: A unique entry code is generated when creating the tournament. When the organizer clicks "Accept & Send", the Telegram confirmation message automatically embeds the secret entry code and tournament URL!

---

## Proposed System Architecture & Options

```
CSV Upload -> Verify Handles -> Approved List -> 
  ├── Option A: Lichess Team Auto-Kick (Kick non-approved members via POST /team/{teamId}/kick/{userId})
  ├── Option B: Password Protected Tournament (Embed entry password in Telegram DM)
  └── Option C: Auto Create Lichess Event (POST /api/tournament with conditions.teamId)
```

---

## Proposed Components to Implement

1. **`utils/lichessTeam.ts`**:
   - `fetchLichessTeamMembers(teamId)`: Streams members from `GET /api/team/{teamId}/users`.
   - `kickUnapprovedMembers(teamId, approvedUsernames[], oauthToken)`: Calls `POST /team/{teamId}/kick/{userId}` for non-whitelisted users.

2. **`server/api/tournaments/[id]/create-lichess-event.ts`**:
   - Creates Arena / Swiss tournaments directly on Lichess using organizer OAuth token (`tournament:write`).

3. **`pages/admin/tournaments/[id].vue` UI Panel**:
   - Adds **"Lichess Event Manager"** card to trigger team whitelist sync and direct tournament creation on Lichess.
