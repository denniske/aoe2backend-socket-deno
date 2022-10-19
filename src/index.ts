import {loadEnv} from "./deps.ts";
import {server} from "./server.ts";
import {prisma} from "./db.ts";
import {apiMatches} from "./api/matches.ts";

await loadEnv();


server.router.get('/api/matches', apiMatches);

server.router.get('/', async () => {
    await prisma.api_key.create({
        data: {
            api_key: 'Info ' + new Date(),
        },
    })
    return 'Hello, world!';
});

await server.start();
