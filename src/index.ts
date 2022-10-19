import {loadEnv} from "./deps.ts";
import {server} from "./server.ts";
import {prisma} from "./db.ts";
import {apiMatches} from "./api/matches.ts";
import {apiLeaderboards} from "./api/leaderboards.ts";
import {apiLeaderboardSingle} from "./api/leaderboards.[id].ts";
import {apiMaps} from "./api/maps.ts";
import {apiProfiles} from "./api/profiles.ts";
import {apiProfileSingle} from "./api/profiles.[id].ts";

await loadEnv();


server.router.get('/api/matches', apiMatches);
server.router.get('/api/leaderboards', apiLeaderboards);
server.router.get('/api/leaderboards/{leaderboardId}', apiLeaderboardSingle);
server.router.get('/api/maps', apiMaps);
server.router.get('/api/profiles', apiProfiles);
server.router.get('/api/profiles/{profileId}', apiProfileSingle);

server.router.get('/', async () => {
    await prisma.api_key.create({
        data: {
            api_key: 'Info ' + new Date(),
        },
    })
    return 'Hello, world!';
});

await server.start();
