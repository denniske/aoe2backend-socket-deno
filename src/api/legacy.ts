import {fromUnixTime, getUnixTime, parseIntNullable, parseISONullable, sendResponse} from "../helper/util.ts";
import ServerRequest from "https://deno.land/x/pogo@v0.6.0/lib/request.ts";
import {Toolkit} from "https://deno.land/x/pogo@v0.6.0/main.ts";
import {getProfiles} from "../service/profile.ts";
import {prisma} from "../db.ts";
import {redis} from "../redis.ts";
import {groupBy, sortBy} from "https://raw.githubusercontent.com/lodash/lodash/4.17.21-es/lodash.js";
import {Prisma} from "../../generated/client/deno/edge.ts";
import {getTranslation} from "../helper/translation.ts";
import {getColor} from "../helper/colors.ts";
import {getFlag} from "../helper/flags.ts";

const PER_PAGE = 20;

export async function apiProfiles(req: ServerRequest, toolkit: Toolkit) {
    const page = parseInt(req.searchParams.get('page') ?? '1');
    const steamId = req.searchParams.get('steam_id') || null;
    const profileId = parseIntNullable(req.searchParams.get('profile_id')) || null;
    let search = req.searchParams.get('search') || null;

    const start = (page - 1) * PER_PAGE + 1;
    const count = PER_PAGE;

    if (search) {
        search = `%${search}%`;
    }

    let profiles = await getProfiles({search, start, count, profileId, steamId});

    return sendResponse(toolkit, {
        start: start,
        count: count,
        profiles,
    });
}


export interface RootObject {
    match_id: number;
    name: string;
    player_name: string;
    server: string;
    started: string;
    finished: string;
    allow_cheats: boolean;
    difficulty: number;
    empire_wars_mode: boolean;
    ending_age: number;
    full_tech_tree: boolean;
    game_mode: number;
    location: number;
    lock_speed: boolean;
    lock_teams: boolean;
    map_size: number;
    population: number;
    record_game: boolean;
    regicide_mode: boolean;
    resources: number;
    reveal_map: number;
    shared_exploration: boolean;
    speed: number;
    starting_age: number;
    sudden_death_mode: boolean;
    team_positions: boolean;
    team_together: boolean;
    treaty_length: number;
    turbo_mode: boolean;
    victory: number;
    internal_leaderboard_id: number;
    leaderboard_id: number;
    privacy: number;
    profile_id: number;
    civ: number;
    slot: number;
    team: number;
    color: number;
    is_ready: number;
    status: number;
    won: boolean;
    rating: number;
    rating_diff?: number;
    games: number;
}

const convPlayer = (row: any) => {
    row.name = row.profile.name;
    row.civ_alpha = row.civ;
    row.slot_type = 1;
    delete row.profile;
    return row;
};

const convMatch = (row: any) => {
    row.started = row.started ? getUnixTime(row.started) : null;
    row.finished = row.finished ? getUnixTime(row.finished) : null;
    row.players = row.players.map(convPlayer);
    row.num_players = row.players.length;
    row.map_type = row.location;
    if (row.leaderboard_id == null) {
        row.leaderboard_id = 0;
    }
    return row;
};


const convPlayer2 = (row: any) => {
    row.civ_alpha = row.civ;
    row.slot_type = 1;
    return row;
};

const convMatch2 = (row: any) => {
    row.started = row.started ? getUnixTime(row.started) : null;
    row.finished = row.finished ? getUnixTime(row.finished) : null;
    row.players = row.players.map(convPlayer2);
    row.num_players = row.players.length;
    row.map_type = row.location;
    if (row.leaderboard_id == null) {
        row.leaderboard_id = 0;
    }
    return row;
};


const publicMatchCondition = {
    OR: [
        {privacy: {equals: null}},
        {privacy: {not: 0}},
    ]
};

export async function apiReady(req: ServerRequest, toolkit: Toolkit) {
    return sendResponse(toolkit, 'Ready.');
}

export async function apiError(req: ServerRequest, toolkit: Toolkit) {
    throw new Error('Test error');
}

/*

Endpoint
  /api/match
Request Parameters
  - match_id (required)
    Match ID
Example Request
  https://aoe2.net/api/match?uuid=66ec2575-5ee4-d241-a1fc-d7ffeffb48b6

 */

export async function apiMatch(req: ServerRequest, toolkit: Toolkit) {
    const matchId = req.searchParams.get('match_id');

    if (
        matchId == null
    ) {
        return sendResponse(toolkit, {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid or missing params',
            }, null, 2),
        });
    }

    const match = await prisma.match.findUnique({
        include: {
            players: true,
        },
        where: {
            match_id: parseInt(matchId),
        },
    });

    return sendResponse(toolkit, match);
}

/*

Endpoint
  /api/matches
Request Parameters
  - count (Required)
    Number of matches to get (Must be 1000 or less))
  - since (Optional)
    Only show matches starting equal or after timestamp (epoch)
Example Request
  https://aoe2.net/api/matches?game=aoe2de&count;=10&since;=1596775000

 */

export async function apiMatches(req: ServerRequest, toolkit: Toolkit) {
    const count = parseInt(req.searchParams.get('count') ?? '10');
    const since = parseIntNullable(req.searchParams.get('since'));

    const matches = await prisma.match.findMany({
        include: {
            players: {
                include: {
                    profile: true,
                },
            },
        },
        where: {
            ...(since && {started: {gte: fromUnixTime(since)}}),
        },
        take: count,
        orderBy: {
            started: 'asc',
        },
    });

    return sendResponse(toolkit, matches.map(convMatch));
}

/*

Endpoint
  /api/leaderboard
Request Parameters
  - leaderboard_id (Required)
    Leaderboard ID (Unranked=0, 1v1 Deathmatch=1, Team Deathmatch=2, 1v1 Random Map=3, Team Random Map=4, 1v1 Empire Wars=13, Team Empire Wars=14)
  - start (Required)
    Starting rank (Ignored if search, steam_id, or profile_id are defined)
  - count (Required)
    Number of leaderboard entries to get (Must be 10000 or less))
  - search (Optional)
    Name Search
  - profile_id (Optional)
    Profile ID (ex: 459658)
Example Request
  https://aoe2.net/api/leaderboard?game=aoe2de&leaderboard;_id=3&start;=1&count;=1

 */

export async function apiLeaderboard(req: ServerRequest, toolkit: Toolkit) {
    const start = parseInt(req.searchParams.get('start') ?? '1');
    const count = parseInt(req.searchParams.get('count') ?? '10');
    const leaderboardId = parseInt(req.searchParams.get('leaderboard_id')!);
    let country = req.searchParams.get('country') || null;
    const steamId = req.searchParams.get('steam_id') || null;
    const profileId = parseIntNullable(req.searchParams.get('profile_id')) || null;
    const search = req.searchParams.get('search') || null;

    if (country) {
        country = country.toLowerCase();
    }

    const conv = (row: any) => {
        row.last_match = getUnixTime(row.last_match_time);
        row.games = row.wins + row.losses;
        row.country = row.profile.country?.toUpperCase();
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
                    leaderboard_id: leaderboardId,
                    profile_id: profileId,
                },
            },
        });
        if (leaderboardRow == null) {
            return sendResponse(toolkit, {
                leaderboard_id: leaderboardId,
                leaderboard: [],
            });
        }
        return sendResponse(toolkit, {
            leaderboard_id: leaderboardId,
            leaderboard: [
                conv(leaderboardRow),
            ],
        });
    }

    const leaderboardRows = await prisma.leaderboard_row.findMany({
        include: {
            profile: true,
        },
        where: {
            leaderboard_id: leaderboardId,
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
        leaderboardRows.forEach((row: any) => row.rank = row.rank_country);
    }

    const cacheKey = CACHE_LEADERBOARD_COUNT.replace('${leaderboardId}', leaderboardId.toString());
    const cache = JSON.parse(await redis.get(cacheKey) || '{}');
    const total = cache[country || 'world'] || 0;

    return sendResponse(toolkit, {
        leaderboard_id: leaderboardId,
        total: total,
        start: start,
        count: count,
        country: country,
        leaderboard: leaderboardRows.map(conv),
    });
}

const CACHE_LEADERBOARD_COUNT = 'leaderboard-count-${leaderboardId}';

export async function apiPlayerRatinghistory(req: ServerRequest, toolkit: Toolkit) {
    const leaderboardId = parseInt(req.searchParams.get('leaderboard_id')!);
    const profileId = parseInt(req.searchParams.get('profile_id')!);

    // console.log('ratinghistory', leaderboardId, profileId);

    let historyEntries = await prisma.rating.findMany({
        select: {
            rating: true,
            date: true,
        },
        where: {
            profile_id: profileId,
            leaderboard_id: leaderboardId,
        },
        orderBy: {
            date: 'desc',
        },
    });

    const conv = (row: any) => {
        row.timestamp = getUnixTime(row.date);
        return row;
    };

    // console.log('ratinghistory', historyEntries.length);

    return sendResponse(toolkit, historyEntries.map(conv));
}

export async function apiProfile(req: ServerRequest, toolkit: Toolkit) {
    const start = parseInt(req.searchParams.get('start') ?? '1');
    const count = parseInt(req.searchParams.get('count') ?? '10');
    const steamId = req.searchParams.get('steam_id') || null;
    const profileId = parseIntNullable(req.searchParams.get('profile_id'));
    let search = req.searchParams.get('search') || null;

    if (search) {
        search = `%${search}%`;
    }

    let profiles = [];
    if (search != null) {
        profiles = await prisma.$queryRaw`
            SELECT p.profile_id, p.name, country, SUM(wins+losses) as games
            FROM profile as p
            JOIN leaderboard_row lr on p.profile_id = lr.profile_id
            WHERE p.name ILIKE ${search}
            GROUP BY p.profile_id
            ORDER BY SUM(wins+losses) desc, p.name
            OFFSET ${start-1}
            LIMIT ${count}
        ` as any;
    } else if (profileId != null) {
        profiles = await prisma.$queryRaw`
            SELECT p.profile_id, p.name, country, SUM(wins+losses) as games
            FROM profile as p
            JOIN leaderboard_row lr on p.profile_id = lr.profile_id
            WHERE p.profile_id = ${profileId}
            GROUP BY p.profile_id
            ORDER BY SUM(wins+losses) desc, p.name
            OFFSET ${start-1}
            LIMIT ${count}
        ` as any;
    } else if (steamId != null) {
        profiles = await prisma.$queryRaw`
            SELECT p.profile_id, p.name, country, SUM(wins+losses) as games
            FROM profile as p
            JOIN leaderboard_row lr on p.profile_id = lr.profile_id
            WHERE p.steam_id = ${steamId}
            GROUP BY p.profile_id
            ORDER BY SUM(wins+losses) desc, p.name
            OFFSET ${start-1}
            LIMIT ${count}
        ` as any;
    }

    return sendResponse(toolkit, {
        start: start,
        count: count,
        profiles,
    });
}

export async function apiPlayerMatches(req: ServerRequest, toolkit: Toolkit) {
    const start = parseInt(req.searchParams.get('start') ?? '0') + 1; // old implementation detail
    const count = parseInt(req.searchParams.get('count') ?? '10');
    const profileIds = req.searchParams.get('profile_ids')!;

    const profileIdList = profileIds.split(',').map(x => parseInt(x));

    let matches = await prisma.$queryRaw<RootObject[]>`
        SELECT 
         m.*,
         p.*, 
         pr.name as player_name, 
         CASE WHEN r.rating IS NOT NULL THEN r.rating - COALESCE(r.rating_diff, 0) ELSE lr.rating END as rating,
         r.rating_diff,
         r.games
        FROM match m
        JOIN player p on m.match_id = p.match_id
        JOIN profile pr on p.profile_id = pr.profile_id
        LEFT JOIN rating r on
            m.leaderboard_id = r.leaderboard_id AND
            p.profile_id = r.profile_id AND
            (m.finished > r.date - interval '10 seconds' AND m.finished < r.date + interval '10 seconds')
        LEFT JOIN leaderboard_row lr on
            pr.profile_id = lr.profile_id AND
            m.leaderboard_id = lr.leaderboard_id AND
            (m.finished is null OR m.started > NOW() - INTERVAL '24 HOURS')
        WHERE
            m.match_id IN (
                SELECT m.match_id FROM match m
                                  WHERE 
                                    m.privacy != 0 AND
                                    EXISTS (SELECT * FROM player p2 WHERE p2.match_id=m.match_id AND p2.profile_id IN (${Prisma.join(profileIdList)}))
                                  ORDER BY m.started desc
                                  OFFSET ${start-1}
                                  LIMIT ${count}
                )
        ORDER BY m.started desc
    `;

    let matches2 = Object.entries(groupBy(matches, x => x.match_id)).map(([matchId, players]) => {
        const match = players[0];
        return {
            match_id: match.match_id,
            started: parseISONullable(match.started),
            finished: parseISONullable(match.finished),
            leaderboard_id: match.leaderboard_id,
            name: match.name,
            server: match.server,
            internal_leaderboard_id: match.internal_leaderboard_id,
            difficulty: match.difficulty,
            starting_age: match.starting_age,
            full_tech_tree: match.full_tech_tree,
            allow_cheats: match.allow_cheats,
            empire_wars_mode: match.empire_wars_mode,
            ending_age: match.ending_age,
            game_mode: match.game_mode,
            lock_speed: match.lock_speed,
            lock_teams: match.lock_teams,
            map_size: match.map_size,
            location: match.location,
            population: match.population,
            record_game: match.record_game,
            regicide_mode: match.regicide_mode,
            resources: match.resources,
            shared_exploration: match.shared_exploration,
            speed: match.speed,
            sudden_death_mode: match.sudden_death_mode,
            team_positions: match.team_positions,
            team_together: match.team_together,
            treaty_length: match.treaty_length,
            turbo_mode: match.turbo_mode,
            victory: match.victory,
            reveal_map: match.reveal_map,
            privacy: match.privacy,
            players: players.map(p => ({
                profile_id: p.profile_id,
                name: p.player_name,
                rating: p.rating,
                rating_diff: p.rating_diff,
                games: p.games,
                civ: p.civ,
                color: p.color,
                slot: p.slot,
                team: p.team,
                won: p.won,
            })),
        };
    })

    matches2 = sortBy(matches2, m => m.started).reverse();

    return sendResponse(toolkit, matches2.map(convMatch2));
}

/*

Rank
  Request rank details about a player

Request Parameters
  - leaderboard_id (Optional, defaults to 3)
    Leaderboard ID (Unranked=0, 1v1 Deathmatch=1, Team Deathmatch=2, 1v1 Random Map=3, Team Random Map=4, 1v1 Empire Wars=13, Team Empire Wars=14)
  - flag (Optional, defaults to true)
    Show player flag
  - search (search, steam_id or profile_id required)
    Name Search, returns the highest rated player
  - steam_id (search, steam_id or profile_id required)
    steamID64 (ex: 76561199003184910)
  - profile_id (search, steam_id or profile_id required)
    Profile ID (ex: 459658)
Example Command
    !addcom !rank $(urlfetch https://legacy.aoe2companion.com/api/nightbot/rank?leaderboard_id=3&search=$(querystring)&steam_id=76561199003184910&flag=false)
Example Responses
    twitchuser: !rank
    Nightbot: Hoang (1799) Rank #44, has played 1181 games with a 59% winrate, -1 streak, and 20 drops
    twitchuser: !rank Hera
    Nightbot: Hera (2118) Rank #1, has played 659 games with a 71% winrate, +6 streak, and 3 drops

//  language (Optional, defaults to en) - not fully translated
//  Language (en, de, fr, es, es-mx, it, ms, pt, pl, ko, ru, tr, vi, hi, ja, zh-hans, zh-hant)

 */

export async function apiNightbotRank(req: ServerRequest, toolkit: Toolkit) {
    console.trace('apiNightbotRank');
    const leaderboardId = parseInt(req.searchParams.get('leaderboard_id') ?? '3');
    const language = 'en'; //req.searchParams.get('language') ?? 'en';
    const flag = (req.searchParams.get('flag') ?? 'true') === 'true';
    const search = req.searchParams.get('search') || null;
    const steamId = req.searchParams.get('steam_id') || null;
    const profileId = parseIntNullable(req.searchParams.get('profile_id')) || null;

    if (search == null && steamId == null && profileId == null) {
        return sendResponse(toolkit, 'Missing search, steam_id, or profile_id');
    }

    const leaderboardRow = await getPlayer(leaderboardId, search, steamId, profileId);

    if (leaderboardRow == null) {
        return sendResponse(toolkit, 'Player not found');
    }

    // Hera (2118) Rank #1, has played 659 games with a 71% winrate, +6 streak, and 3 drops

    const name = leaderboardRow.profile.name;
    const rating = leaderboardRow.rating;
    const rank = leaderboardRow.rank;
    const games = leaderboardRow.wins + leaderboardRow.losses;
    const winrate = (leaderboardRow.wins / games * 100).toFixed(0);
    const streak = leaderboardRow.streak;
    const drops = leaderboardRow.drops;

    const _flag = flag ? getFlag(leaderboardRow.profile.country) + ' ' : '';

    return sendResponse(toolkit, `${_flag} ${name} (${rating}) Rank #${rank}, has played ${games} games with a ${winrate}% winrate, ${streak} streak, and ${drops} drops`);
}

async function getPlayer(leaderboardId: number, search: string, steamId: string, profileId: number) {
    if (search != null) {
        return await prisma.leaderboard_row.findFirst({
            include: {
                profile: true,
            },
            where: {
                leaderboard_id: leaderboardId,
                name: {contains: search, mode: "insensitive"}
            },
            orderBy: {
                rating: 'desc',
            }
        });
    } else if (profileId != null) {
        return await prisma.leaderboard_row.findFirst({
            include: {
                profile: true,
            },
            where: {
                leaderboard_id: leaderboardId,
                profile: {
                    profile_id: profileId,
                },
            },
        });
    } else if (steamId != null) {
        return await prisma.leaderboard_row.findFirst({
            include: {
                profile: true,
            },
            where: {
                leaderboard_id: leaderboardId,
                profile: {
                    steam_id: steamId,
                },
            },
        });
    }
}

/*

Match
Request details about the current or last match

Request Parameters
  - leaderboard_id (Optional, defaults to 3)
    Leaderboard ID is used when search is defined, will find the highest rated player matching the search term (Unranked=0, 1v1 Deathmatch=1, Team Deathmatch=2, 1v1 Random Map=3, Team Random Map=4, 1v1 Empire Wars=13, Team Empire Wars=14)
 -  color (Optional, defaults to true)
    Show player colors
  - search (search, steam_id or profile_id required)
    Name Search, returns the highest rated player
  - steam_id (steam_id or profile_id required)
    steamID64 (ex: 76561199003184910)
  - profile_id (steam_id or profile_id required)
    Profile ID (ex: 459658)
Example Command
    !addcom !match $(urlfetch https://legacy.aoe2companion.com/api/nightbot/match?search=$(querystring)&steam_id=76561199003184910&color=false&flag=false)
Example Responses
    twitchuser: !match
    Nightbot: Hoang (1815) as Celts -VS- DracKeN (1820) as Celts playing on Black Forest
    twitchuser: !match Hera
    Nightbot: Hera (2112) as Mayans -VS- ACCM (1960) as Aztecs playing on Gold Rush

//  language (Optional, defaults to en) - not fully translated
//  Language (en, de, fr, es, es-mx, it, ms, pt, pl, ko, ru, tr, vi, hi, ja, zh-hans, zh-hant)

//  flag (Optional, defaults to false)
//  Show player flag

 */

export async function apiNightbotMatch(req: ServerRequest, toolkit: Toolkit) {
    console.log('nightbotMatch');
    const leaderboardId = parseInt(req.searchParams.get('leaderboard_id') ?? '3');
    const language = 'en'; //req.searchParams.get('language') ?? 'en';
    const color = (req.searchParams.get('color') ?? 'true') === 'true';
    const flag = false; //(req.searchParams.get('flag') ?? 'true') === 'true';
    const search = req.searchParams.get('search') || null;
    const steamId = req.searchParams.get('steam_id') || null;
    const profileId = parseIntNullable(req.searchParams.get('profile_id')) || null;


    if (search == null && steamId == null && profileId == null) {
        return sendResponse(toolkit, 'Missing search, steam_id, or profile_id');
    }

    const leaderboardRow = await getPlayer(leaderboardId, search, steamId, profileId);

    if (leaderboardRow == null) {
        return sendResponse(toolkit, 'Player for match not found');
    }

    const match = await prisma.match.findFirst({
        where: {
            players: {
                some: {
                    profile_id: leaderboardRow.profile_id,
                },
            },
            ...publicMatchCondition,
        },
        include: {
            players: {
                include: {
                    profile: true,
                },
            },
        },
        orderBy: {
            started: 'desc',
        },
    });

    if (match == null) {
        return sendResponse(toolkit, 'Match not found');
    }

    // console.log(match);

    const leaderboardRows = await prisma.leaderboard_row.findMany({
        include: {
            profile: true,
        },
        where: {
            leaderboard_id: leaderboardId,
            profile: {
                profile_id: {in: match.players.map(p => p.profile_id)},
            },
        },
    });

    // Nightbot: Hera (2112) as Mayans -VS- ACCM (1960) as Aztecs playing on Gold Rush

    const getTeams = (match: any) => {
        let teamIndex = 5;
        return Object.entries(groupBy(match.players, p => {
            if (p.team != -1) return p.team;
            return teamIndex++;
        })).map(([team, players]) => ({team, players}));
    };

    const formatPlayer = (player: any) => {
        const name = player.profile.name;
        const civ = getTranslation(language, 'civ', player.civ);
        const rating = leaderboardRows.find(r => r.profile_id === player.profile_id)?.rating ?? '-';

        const _color = color ? ' ' + getColor(player.color) : '';
        const _flag = flag ? ' ' + getFlag(player.profile.country) : '';

        return `${_color} ${_flag} ${name} (${rating}) as ${civ}`;
    };

    const formatTeam = (team: any) => {
        return team.players.map(formatPlayer).join(' + ');
    };

    const teams = getTeams(match);
    const players = teams.map(formatTeam).join(' vs ');

    const map = getTranslation(language, 'map_type', match.location);

    return sendResponse(toolkit, `${players} playing on ${map}`);
}
