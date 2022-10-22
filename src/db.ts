import {PrismaClient} from "../generated/client/deno/edge.ts";
import {loadEnv} from "./deps.ts";
import {Client} from "https://deno.land/x/postgres@v0.17.0/mod.ts";

await loadEnv();

// console.log('Connecting to prisma...', Deno.env.get('DATA_PROXY_URL'));

export const prisma = new PrismaClient({
    // log: ['query', 'info', 'warn'],
    datasources: { db: { url: Deno.env.get('DATA_PROXY_URL') as string } },
})


export const pgClient = new Client(Deno.env.get('DATABASE_URL') as string);
await pgClient.connect();

// console.log('Connected to prisma');

