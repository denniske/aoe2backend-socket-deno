import {loadEnv} from "./deps.ts";
import {server} from "./server.ts";
import {apiError, apiIngest, apiReady} from "./api/legacy.ts";
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

server.router.get('/ready', wrapper(apiReady));
server.router.get('/error', wrapper(apiError));
server.router.post('/api/room/lobbies/ingest', wrapper(apiIngest));

server.router.get('/', async () => {
    return 'Hello, world!';
});

console.log('Server started');

await server.start();

