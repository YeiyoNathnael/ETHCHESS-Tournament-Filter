# ETHCHESS Tournament Filter

A web application for screening chess tournament registrations. Organizers upload a registration CSV, and the application verifies each player's Chess.com and Lichess accounts, applies the tournament's eligibility rules, and calculates a statistical trust score. Organizers then review the results and publish a roster.

It was built for ETHCHESS club events, where rating-limited tournaments need a consistent way to identify players whose rating understates their strength.

## Features

- CSV import with handle cleanup and duplicate removal
- Bulk account lookups against the Chess.com and Lichess APIs
- Separate rating, peak rating, game count and account age limits for each platform
- Trust scoring based on rating deviation, game count, peak recency and inactivity
- Organizer review with manual overrides and notes
- Public tournament roster
- Claim submissions for players with missing or incorrect handles
- Upset finder that ranks results from uploaded PGN games

## Screening process

```text
CSV upload --> Clean and deduplicate --> Fetch platform stats --> Apply rules
    --> Calculate trust score --> Assign verdict --> Organizer review --> Public roster
```

### Eligibility rules

Each tournament sets its own limits. The rule engine then applies one of these paths:

| Verified accounts | Rating checks | Activity checks |
|---|---|---|
| Chess.com and Lichess | Both platforms must pass | At least one platform must pass |
| One platform | That platform must pass | That platform must pass |
| None | Rejected | Rejected |

A closed Chess.com account or a Lichess Terms of Service flag rejects the player immediately.

### Trust score

The trust score estimates the probability that a player's true strength is at or below the tournament limit:

```text
score = 100 * Φ((limit - effectiveRating) / effectiveRD)
```

`Φ` is the standard normal cumulative distribution function.

**Effective rating** accounts for recent peaks:

```text
peakWeight      = max(0, 1 - monthsSincePeak / peakWindowMonths)
weightedPeak    = peak * peakWeight + rating * (1 - peakWeight)
effectiveRating = max(rating, weightedPeak)
```

**Effective RD** widens the rating deviation when there is less evidence about a player:

```text
effectiveRD = (platformRD + inactivityBuffer) * gameCountFactor
```

Chess.com accounts receive an inactivity buffer of 5 RD for each 30 days without a game. The game count factor follows FIDE and USCF rating thresholds:

| Games played | Factor |
|---|---:|
| Fewer than 5 | 3.0 |
| 5 to 25 | 2.0 |
| 26 to 29 | 1.3 |
| 30 or more | 1.0 |

### Verdict bands

| Score | Band |
|---:|---|
| 90 to 100 | Excellent |
| 70 to 89 | Good |
| 50 to 69 | Borderline |
| 30 to 49 | Poor |
| 0 to 29 | Reject |

Each tournament has a minimum trust score, 65 by default. Players who pass the rules but score below the minimum are rejected. Players with verified accounts and no violations who miss a rule but meet the minimum are marked eligible, and the reason is recorded for organizers.

## Registration CSV

The importer reads these columns:

```csv
Timestamp,Telegram Username (@),chess.com Username,chess.com Rapid Rating,lichess username,lichess rapid rating
```

## Getting started

### Requirements

- Node.js 20 or later
- npm

### Configuration

Create a `.env` file:

| Variable | Description |
|---|---|
| `ORGANIZER_KEY` | Key for the organizer login |
| `LICHESS_TOKEN` | Lichess API token for bulk lookups |
| `TURSO_DATABASE_URL` | Turso database URL. Defaults to `file:local.db` |
| `TURSO_AUTH_TOKEN` | Turso auth token |

### Run

```bash
npm install
npm run dev
```

The application runs at `http://localhost:3000`. Tables are created on first use.

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server |
| `npm run build` | Builds for production |
| `npm run preview` | Previews the production build |
| `npm run db:generate` | Generates Drizzle migrations |
| `npm run db:push` | Pushes the schema to the database |

## Project layout

```text
components/            Reviewer, CSV uploader, tournament forms and upset finder
composables/           Tournament state and notifications
layouts/               Organizer and public layouts
middleware/            Organizer route protection
pages/
  index.vue            Organizer dashboard
  admin/tournaments/   Tournament review
  t/[id].vue           Public roster
server/
  api/                 Auth, tournament, participant and claim endpoints
  db/                  Drizzle schema and database client
types/                 Shared TypeScript types
utils/
  chessApi.ts          Chess.com and Lichess clients
  csvParser.ts         CSV parsing and handle cleanup
  pgnParser.ts         PGN parsing and upset analysis
  ruleEngine.ts        Eligibility rules and trust score
  verification.ts      Participant evaluation
```

## Built with

- [Nuxt 3](https://nuxt.com/) and Vue 3
- TypeScript
- [Drizzle ORM](https://orm.drizzle.team/) with [Turso](https://turso.tech/) (libSQL)
- [Papa Parse](https://www.papaparse.com/)
- [Chess.com Published-Data API](https://www.chess.com/news/view/published-data-api) and [Lichess API](https://lichess.org/api)
