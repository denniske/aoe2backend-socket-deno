import {redis} from "../redis.ts";

export const CACHE_VERIFIED_PLAYERS = 'verified-players';

let referencePlayers: IReferencePlayer[] = [];
let referencePlayersDict: Record<number, IReferencePlayer> = {};

export async function getReferencePlayersDict() {
    referencePlayers = JSON.parse(await redis.get(CACHE_VERIFIED_PLAYERS) || '[]');
    for (const player of referencePlayers) {
        for (const relicId of player.platforms.rl || []) {
            referencePlayersDict[relicId] = player;
        }
    }
    return referencePlayersDict;
}
