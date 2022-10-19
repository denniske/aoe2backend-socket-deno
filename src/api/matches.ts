import {prisma} from "../db.ts";
import {getPlayerBackgroundColor, parseISONullable, sendResponse} from "../helper/util.ts";
import {getLeaderboardEnumFromId, getLeaderboardIdFromEnum} from "../helper/leaderboards.ts";
import {Prisma} from "../../generated/client/deno/edge.ts";
import {groupBy, sortBy} from 'https://raw.githubusercontent.com/lodash/lodash/4.17.21-es/lodash.js';
import {getMapEnumFromId, getMapImage} from "../helper/maps.ts";
import {getCivImage} from "../helper/civs.ts";
import ServerRequest from "https://deno.land/x/pogo@v0.6.0/lib/request.ts";
import {Toolkit} from "https://deno.land/x/pogo@v0.6.0/main.ts";
import {getReferencePlayersDict} from "../service/reference.ts";
import {getTranslation} from "../helper/translation.ts";

const PER_PAGE = 20;

// function getTranslation() {
//     return null;
// }

export async function apiMatches(req: ServerRequest, toolkit: Toolkit) {

    const language = req.searchParams.get('language') ?? 'en';
    const page = parseInt(req.searchParams.get('page') ?? '1');
    const profileIds = req.searchParams.get('profile_ids');
    const leaderboardIds = req.searchParams.get('leaderboard_ids') || 'rm_1v1,rm_team,ew_1v1,ew_team,unranked';

    const profileIdList = profileIds.split(',').map(x => parseInt(x));
    const leaderboardIdList = leaderboardIds.split(',').map(x => getLeaderboardIdFromEnum(x));

    const start = (page - 1) * PER_PAGE + 1;
    const count = PER_PAGE;

    // console.log('leaderboardIds', leaderboardIds);
    // console.log('leaderboardIdList', leaderboardIdList);

    let matches = await prisma.$queryRaw<RootObject[]>`
        SELECT
         m.*,
         p.*,
         pr.country,
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
                                    m.leaderboard_id IN (${Prisma.join(leaderboardIdList)}) AND
                                    EXISTS (SELECT * FROM player p2 WHERE p2.match_id=m.match_id AND p2.profile_id IN (${Prisma.join(profileIdList)}))
                                  ORDER BY m.started desc
                                  OFFSET ${start-1}
                                  LIMIT ${count}
                )
        ORDER BY m.started desc
    `;

    // console.log(profileIdList)
    // console.log('matches', matches);

    const getTeams = (match: any) => {
        let teamIndex = 5;
        return Object.entries(groupBy(match.players, p => {
            if (p.team != -1) return p.team;
            return teamIndex++;
        })).map(([team, players]) => ({ team, players }));
    };

    let matches2 = Object.entries(groupBy(matches, x => x.match_id)).map(([matchId, players]) => {
        const match = players[0];

        const teams = getTeams({ players });

        return {
            matchId: match.match_id,
            started: parseISONullable(match.started),
            finished: parseISONullable(match.finished),
            leaderboardId: getLeaderboardEnumFromId(match.leaderboard_id),
            leaderboardName: getTranslation(language, 'leaderboard', match.leaderboard_id),
            name: match.name,
            server: match.server,
            internalLeaderboardId: match.internal_leaderboard_id,
            difficulty: match.difficulty,
            startingAge: match.starting_age,
            fullTechTree: match.full_tech_tree,
            allowCheats: match.allow_cheats,
            empireWarsMode: match.empire_wars_mode,
            endingAge: match.ending_age,
            gameMode: match.game_mode,
            lockSpeed: match.lock_speed,
            lockTeams: match.lock_teams,
            mapSize: match.map_size,
            map: getMapEnumFromId(match.location),
            mapName: getTranslation(language, 'map_type', match.location),
            mapImageUrl: getMapImage(match.location),
            population: match.population,
            recordGame: match.record_game,
            regicideMode: match.regicide_mode,
            resources: match.resources,
            sharedExploration: match.shared_exploration,
            speed: match.speed,
            suddenDeathMode: match.sudden_death_mode,
            teamPositions: match.team_positions,
            teamTogether: match.team_together,
            treatyLength: match.treaty_length,
            turboMode: match.turbo_mode,
            victory: match.victory,
            revealMap: match.reveal_map,
            privacy: match.privacy,
            teams: teams.map(({ players }) => players.map(p => ({
                profileId: p.profile_id,
                name: p.player_name,
                rating: p.rating,
                ratingDiff: p.rating_diff,
                games: p.games,
                civ: p.civ,
                civName: getTranslation(language, 'civ', p.civ),
                civImageUrl: getCivImage(p.civ),
                color: p.color,
                colorHex: getPlayerBackgroundColor(p.color),
                slot: p.slot,
                team: p.team,
                won: p.won,
                country: p.country,
                verified: getReferencePlayersDict()?.[p.profile_id] != null,
            }))),
        };
    })

    matches2 = sortBy(matches2, m => m.started).reverse();

    const conv = row => {
        return row;
    };

    console.log(req.url?.href);
    console.log('/api/matches', matches2.length);

    return sendResponse(toolkit, {
        page: page,
        perPage: PER_PAGE,
        matches: matches2.map(conv),
    });
}

interface RootObject {
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
