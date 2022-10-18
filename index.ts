import {loadEnv} from "./deps.ts";
import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { PrismaClient } from './generated/client/deno/edge.ts'
import {server} from "./server.ts";
import {prisma} from "./db.ts";
import {matchController} from "./api/matches.ts";

await loadEnv();


matchController();

server.router.get('/', async () => {
    const log = await prisma.api_key.create({
        data: {
            api_key: 'Info ' + new Date(),
        },
    })
    const body = JSON.stringify(log, null, 2);
    // return new Response(body, {
    //     headers: { "content-type": "application/json; charset=utf-8" },
    // });
    return 'Hello, world!';
});

server.start();

// async function handler(request: Request) {
//     // const log = await prisma.log.create({
//     //     data: {
//     //         level: 'Info',
//     //         message: `${request.method} ${request.url}`,
//     //         meta: {
//     //             headers: JSON.stringify(request.headers),
//     //         },
//     //     },
//     // })
//     const log = await prisma.api_key.create({
//         data: {
//             api_key: 'Info ' + new Date(),
//         },
//     })
//     const body = JSON.stringify(log, null, 2);
//     return new Response(body, {
//         headers: { "content-type": "application/json; charset=utf-8" },
//     });
// }
//
// serve(handler);
