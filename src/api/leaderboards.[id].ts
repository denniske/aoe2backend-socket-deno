import {prisma} from "../db.ts";
import {getPlayerBackgroundColor, parseISONullable, sendResponse} from "../helper/util.ts";
import {getLeaderboardEnumFromId, getLeaderboardIdFromEnum, leaderboards} from "../helper/leaderboards.ts";
import {Prisma} from "../../generated/client/deno/edge.ts";
import {groupBy, sortBy} from 'https://raw.githubusercontent.com/lodash/lodash/4.17.21-es/lodash.js';
import {getMapEnumFromId, getMapImage} from "../helper/maps.ts";
import {getCivImage} from "../helper/civs.ts";
import ServerRequest from "https://deno.land/x/pogo@v0.6.0/lib/request.ts";
import {Toolkit} from "https://deno.land/x/pogo@v0.6.0/main.ts";
import {CACHE_VERIFIED_PLAYERS, getReferencePlayersDict} from "../service/reference.ts";
import {getTranslation} from "../helper/translation.ts";
import {redis} from "../redis.ts";

const PER_PAGE = 100;

export async function apiLeaderboardSingle(req: ServerRequest, toolkit: Toolkit) {
    // await sleep(2000);

    // console.log(req.params);
    // return;

    const page = parseInt(req.searchParams.get('page') ?? '1');
    const leaderboardId = req.params.leaderboardId;
    let country = req.searchParams.get('country') || null;
    const steamId = req.searchParams.get('steam_id') || null;
    const profileId = parseInt(req.searchParams.get('profile_id')) || null;
    const search = req.searchParams.get('search') || null;

    const start = (page - 1) * PER_PAGE + 1;
    const count = PER_PAGE;

    if (country) {
        country = country.toLowerCase();
    }

    const conv = row => {
        row.leaderboardId = getLeaderboardEnumFromId(row.leaderboardId);
        row.games = row.wins + row.losses;
        row.country = row.profile.country;
        delete row.profile;
        return row;
    };

    if (profileId) {
        const leaderboardRow = await prisma.leaderboard_row.findUnique({
            include: {
                profile: true,
            },
            where: {
                leaderboard_id_profile_id: {
                    leaderboard_id: getLeaderboardIdFromEnum(leaderboardId),
                    profile_id: profileId,
                },
            },
        });
        if (leaderboardRow == null) {
            return sendResponse(res, {
                leaderboard_id: getLeaderboardIdFromEnum(leaderboardId),
                players: [],
            });
        }
        return sendResponse(res, {
            leaderboard_id: getLeaderboardIdFromEnum(leaderboardId),
            players: [
                conv(leaderboardRow),
            ],
        });
    }

    const leaderboardRows = await prisma.leaderboard_row.findMany({
        include: {
            profile: true,
        },
        where: {
            leaderboard_id: getLeaderboardIdFromEnum(leaderboardId),
            ...(country && {profile: {country}}),
            ...(search && {name: {contains: search, mode: "insensitive"}}),
        },
        skip: start - 1,
        take: count,
        orderBy: {
            ['rank']: 'asc',
        },
    });

    // console.log(leaderboardRows);

    if (country) {
        leaderboardRows.forEach(row => row.rank = row.rank_country);
    }

    const cacheKey = CACHE_LEADERBOARD_COUNT.replace('${leaderboardId}', getLeaderboardIdFromEnum(leaderboardId));
    const cache = JSON.parse(await redis.get(cacheKey) || '{}');
    const total = cache[country || 'world'] || 0;

    return sendResponse(toolkit, {
        leaderboard_id: leaderboardId,
        total: total,
        start: start,
        count: count,
        country: country,
        page: page,
        players: leaderboardRows.map(conv),
    });
}

export const CACHE_LEADERBOARD_COUNT = 'leaderboard-count-${leaderboardId}';
