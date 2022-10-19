import {loadEnv} from "./deps.ts";
import {server} from "./server.ts";
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
import ServerRequest from "https://deno.land/x/pogo@v0.6.0/lib/request.ts";
import {Toolkit} from "https://deno.land/x/pogo@v0.6.0/main.ts";

await loadEnv();

// console.log('Server starting...');

function wrapper(handler: (req: ServerRequest, toolkit: Toolkit) => Promise<any>) {
    return async (req: ServerRequest, toolkit: Toolkit) => {
        const start = new Date();

        try {
            const res = await handler(req, toolkit);

            // This breaks app?
            // statusCode = res.status;

            const durationInMs = new Date().getTime() - start.getTime();
            const paddedDurationInMs = durationInMs.toString().padStart(5, ' ');

            console.log(`200 ${paddedDurationInMs}ms ${req.method} ${req.url.href}`);
            return res;
        } catch (e) {
            const durationInMs = new Date().getTime() - start.getTime();
            const paddedDurationInMs = durationInMs.toString().padStart(5, ' ');

            console.log(`500 ${paddedDurationInMs}ms ${req.method} ${req.url.href}`, e);
        }
    };
}

// server.router.get('/ready', apiReady);
// server.router.get('/api/match', apiMatch);
// server.router.get('/api/matches', apiMatches);
// server.router.get('/api/leaderboard', apiLeaderboard);
// server.router.get('/api/player/ratinghistory', apiPlayerRatinghistory);
// server.router.get('/api/profile', apiProfile);
// server.router.get('/api/player/matches', apiPlayerMatches);
// server.router.get('/api/nightbot/rank', apiNightbotRank);
// server.router.get('/api/nightbot/match', apiNightbotMatch);

server.router.get('/ready', wrapper(apiReady));
server.router.get('/api/match', wrapper(apiMatch));
server.router.get('/api/matches', wrapper(apiMatches));
server.router.get('/api/leaderboard', wrapper(apiLeaderboard));
server.router.get('/api/player/ratinghistory', wrapper(apiPlayerRatinghistory));
server.router.get('/api/profile', wrapper(apiProfile));
server.router.get('/api/player/matches', wrapper(apiPlayerMatches));
server.router.get('/api/nightbot/rank', wrapper(apiNightbotRank));
server.router.get('/api/nightbot/match', wrapper(apiNightbotMatch));

server.router.get('/', async () => {
    return 'Hello, world!';
});

// console.log('Server...');

await server.start();

