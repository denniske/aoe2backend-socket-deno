import {config} from "https://deno.land/x/dotenv@v3.2.0/mod.ts";

export function loadEnv() {
    config({ export: true });
}
