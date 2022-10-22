import {sendResponse} from "../helper/util.ts";
import ServerRequest from "https://deno.land/x/pogo@v0.6.0/lib/request.ts";
import {Toolkit} from "https://deno.land/x/pogo@v0.6.0/main.ts";

// let str = '';
// const reader = request.body!.getReader();
// while(true) {
//     const {value: chunk, done} = await reader.read();
//     const chunkStr = new TextDecoder().decode(chunk);
//     str += chunkStr;
//     if (done) break;
// }
//
// // console.log('value', bodyIntArray);
// // const bodyJSON = new TextDecoder().decode(bodyIntArray);
// // console.log(bodyJSON);
// const newLobbies = JSON.parse(str);

export async function apiIngest(req: ServerRequest, toolkit: Toolkit) {
    // const matchId = req.searchParams.get('match_id');

    // const body = req.body.;
    // console.log('apiIngest', body);

    const channel = new BroadcastChannel("lobbies");
    channel.postMessage('lobbies ingested');

    return sendResponse(toolkit, {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Lobbies Ingested',
        }, null, 2),
    });
}

export async function apiReady(req: ServerRequest, toolkit: Toolkit) {
    return sendResponse(toolkit, 'Ready.');
}

export async function apiError(req: ServerRequest, toolkit: Toolkit) {
    throw new Error('Test error');
}
