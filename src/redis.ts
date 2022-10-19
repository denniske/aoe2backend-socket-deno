import { connect } from "https://deno.land/x/redis@v0.27.2/mod.ts";
import {loadEnv} from "./deps.ts";

await loadEnv();

export const redis = await connect({
    hostname: Deno.env.get('REDIS_HOST') as string,
    password: Deno.env.get('REDIS_PASSWORD') as string,
    port: Deno.env.get('REDIS_PORT') as string,
});
