import {sendResponse} from "../helper/util.ts";
import {getLeaderboardEnumFromId, leaderboards} from "../helper/leaderboards.ts";
import ServerRequest from "https://deno.land/x/pogo@v0.6.0/lib/request.ts";
import {Toolkit} from "https://deno.land/x/pogo@v0.6.0/main.ts";
import {getTranslation} from "../helper/translation.ts";

export async function apiLeaderboards(req: ServerRequest, toolkit: Toolkit) {
    const language = 'en';
    const conv = row => ({
        leaderboardId: getLeaderboardEnumFromId(row.leaderboardId),
        leaderboardName: getTranslation(language, 'leaderboard', row.leaderboardId),
        abbreviation: row.abbreviation,
    });

    return sendResponse(toolkit, leaderboards.map(conv));
}
