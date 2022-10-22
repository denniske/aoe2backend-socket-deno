import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import {readAll} from "https://deno.land/std@0.159.0/streams/conversion.ts";

serve(async (req: Request) => {
    const upgrade = req.headers.get("upgrade") || "";
    if (upgrade.toLowerCase() != "websocket") {

        const url = new URL(req.url);

        console.log('url', url);

        const path = url.pathname;

        if (path.startsWith('/api/room/lobbies/ingest')) {
            const channel = new BroadcastChannel("lobbies");


            // const body = req.body.;
            // console.log('apiIngest', body);

            const json = await req.json(); //await parseBodyAsJson(req);

            channel.postMessage(json);
            return new Response("ingested");
        }



        return new Response("request isn't trying to upgrade to websocket.");
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.onopen = () => console.log("socket opened");
    socket.onmessage = (e) => {
        console.log("socket message:", e.data);
        socket.send(new Date().toString());
    };
    socket.onerror = (e) => console.log("socket errored:", e);
    socket.onclose = () => console.log("socket closed");

    const channel = new BroadcastChannel("lobbies");
    channel.onmessage = (e) => {
        console.log("channel message:", e.data);
        socket.send(e.data);
    };
    return response;
});


async function parseBodyAsJson(req: Request) {
    const decoder = new TextDecoder();
    const body = decoder.decode(await readAll(req.body.getReader()));
    return JSON.parse(body);
}

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
