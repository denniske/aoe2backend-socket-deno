import { config } from "https://deno.land/std@0.160.0/dotenv/mod.ts";

export async function loadEnv() {
    await config({ export: true });
}
