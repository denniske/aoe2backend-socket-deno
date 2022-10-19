import {sendResponse} from "../helper/util.ts";
import ServerRequest from "https://deno.land/x/pogo@v0.6.0/lib/request.ts";
import {Toolkit} from "https://deno.land/x/pogo@v0.6.0/main.ts";
import {getProfiles} from "../service/profile.ts";

const PER_PAGE = 20;

export async function apiProfiles(req: ServerRequest, toolkit: Toolkit) {

    const page = parseInt(req.searchParams.get('page') ?? '1');
    const steamId = req.searchParams.get('steam_id') || null;
    const profileId = parseInt(req.searchParams.get('profile_id')) || null;
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
