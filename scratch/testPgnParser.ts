import { parsePgnText, analyzeTournamentUpsets } from '../utils/pgnParser';
import type { Participant } from '../types/tournament';

const samplePgn = `
[Event "ETHCHESS Arena 2026"]
[Site "https://lichess.org/tournament/abc"]
[Date "2026.08.15"]
[Round "1"]
[White "Ooshiii"]
[Black "Trigan_defense"]
[Result "1-0"]
[WhiteElo "1005"]
[BlackElo "1521"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 1-0

[Event "ETHCHESS Arena 2026"]
[Site "https://lichess.org/tournament/abc"]
[Date "2026.08.15"]
[Round "2"]
[White "Avatardave10"]
[Black "Theyla9"]
[Result "0-1"]
[WhiteElo "780"]
[BlackElo "1990"]

1. d4 d5 0-1

[Event "ETHCHESS Arena 2026"]
[Site "https://lichess.org/tournament/abc"]
[Date "2026.08.15"]
[Round "3"]
[White "Avatardave10"]
[Black "Ooshiii"]
[Result "1-0"]
[WhiteElo "780"]
[BlackElo "1005"]

1. e4 c5 1-0
`;

const sampleParticipants: Participant[] = [
  {
    id: 'p1',
    tournamentId: '1',
    telegramHandle: '@Ooshiii',
    chessComUsername: 'Ooshiii',
    chessComRating: 1005,
    lichessUsername: 'Ooshiii',
    lichessRating: 1054,
    verdict: 'ELIGIBLE',
    rejectionReasons: [],
    manualOverride: false,
    status: 'APPROVED',
  },
  {
    id: 'p2',
    tournamentId: '1',
    telegramHandle: '@insideon',
    chessComUsername: 'Trigan_defense',
    chessComRating: 1521,
    lichessUsername: 'whabe124',
    lichessRating: 1751,
    verdict: 'ELIGIBLE',
    rejectionReasons: [],
    manualOverride: false,
    status: 'APPROVED',
  },
  {
    id: 'p3',
    tournamentId: '1',
    telegramHandle: '@hat321',
    chessComUsername: 'Avatardave10',
    chessComRating: 780,
    lichessUsername: 'Avatardave',
    lichessRating: 780,
    verdict: 'ELIGIBLE',
    rejectionReasons: [],
    manualOverride: false,
    status: 'APPROVED',
  },
];

console.log('Testing PGN Parser...');
const games = parsePgnText(samplePgn);
console.log(`Parsed ${games.length} games.`);

const analysis = analyzeTournamentUpsets(games, sampleParticipants);
console.log('\n--- Analysis Summary ---');
console.log(`Total Games: ${analysis.totalGamesParsed}`);
console.log(`Decisive Games: ${analysis.decisiveGamesCount}`);
console.log(`Matched Players: ${analysis.matchedPlayersCount}`);

console.log('\n--- Lichess Upsets ---');
analysis.lichessUpsets.forEach((u) => {
  console.log(`#${u.rank}: ${u.winnerHandle} (${u.winnerRating}) beat ${u.loserHandle} (${u.loserRating}) -> +${u.ratingDiff} ELO Upset!`);
});

console.log('\n--- Chess.com (CDC) Upsets ---');
analysis.chessComUpsets.forEach((u) => {
  console.log(`#${u.rank}: ${u.winnerHandle} (${u.winnerRating}) beat ${u.loserHandle} (${u.loserRating}) -> +${u.ratingDiff} ELO Upset!`);
});
