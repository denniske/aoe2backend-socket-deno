import { connect } from "https://deno.land/x/redis@v0.27.2/mod.ts";

export const redis = await connect({
    hostname: Deno.env.get('REDIS_HOST') as string,
    password: Deno.env.get('REDIS_PASSWORD') as string,
    port: Deno.env.get('REDIS_PORT') as string,
});

// const ok = await redis.set("hoge", "fuga");
// const fuga = await redis.get("hoge");
// console.log('fuga', fuga);
// const fuga2 = await redis.get("verified-players");
// console.log('fuga2', fuga2);
