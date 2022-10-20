import {PrismaClient} from "../generated/client/deno/edge.ts";
import {loadEnv} from "./deps.ts";

await loadEnv();

// console.log('Connecting to prisma...', Deno.env.get('DATA_PROXY_URL'));

export const prisma = new PrismaClient({
    // log: ['query', 'info', 'warn'],
    datasources: { db: { url: Deno.env.get('DATA_PROXY_URL') as string } },
})

// console.log('Connected to prisma');

