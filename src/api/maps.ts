import {sendResponse} from "../helper/util.ts";
import {maps} from "../helper/maps.ts";
import ServerRequest from "https://deno.land/x/pogo@v0.6.0/lib/request.ts";
import {Toolkit} from "https://deno.land/x/pogo@v0.6.0/main.ts";
import {getTranslation} from "../helper/translation.ts";

export async function apiMaps(req: ServerRequest, toolkit: Toolkit) {
    const language = 'en';
    const conv = row => {
        row.name = getTranslation(language, 'map_type', row.mapId);
        row.imageUrl = `http://localhost:4200/maps/${row.imageUrl}.png`;
        return row;
    };

    return sendResponse(toolkit, [...maps].map(conv));
}
