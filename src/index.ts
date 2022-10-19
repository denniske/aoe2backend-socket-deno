import {loadEnv} from "./deps.ts";
import {server} from "./server.ts";
import {prisma} from "./db.ts";
import {
    apiProfile,
    apiLeaderboard,
    apiMatches,
    apiMatch,
    apiReady,
    apiPlayerRatinghistory,
    apiPlayerMatches,
    apiNightbotRank,
    apiNightbotMatch,
} from "./api/legacy.ts";

await loadEnv();


server.router.get('/ready', apiReady);
server.router.get('/api/match', apiMatch);
server.router.get('/api/matches', apiMatches);
server.router.get('/api/leaderboard', apiLeaderboard);
server.router.get('/api/player/ratinghistory', apiPlayerRatinghistory);
server.router.get('/api/profile', apiProfile);
server.router.get('/api/player/matches', apiPlayerMatches);
server.router.get('/api/nightbot/rank', apiNightbotRank);
server.router.get('/api/nightbot/match', apiNightbotMatch);

server.router.get('/', async () => {
    return 'Hello, world!';
});

await server.start();
