import { serve } from "https://deno.land/std@0.160.0/http/server.ts";
import {redis} from "./redis.ts";
import {sendResponse} from "./helper/util.ts";

serve(async (req: Request) => {
    const upgrade = req.headers.get("upgrade") || "";
    if (upgrade.toLowerCase() != "websocket") {
        const url = new URL(req.url);
        // console.log('url', url);
        const path = url.pathname;

        if (path.startsWith('/api/lobbies')) {
            const lobbies = await redis.get('lobbies2');
            return sendResponse(lobbies);
        }

        if (path.startsWith('/api/room/lobbies/ingest')) {
            const channel = new BroadcastChannel("lobbies");

            const json = await req.json();

            channel.postMessage(JSON.stringify(json));
            return new Response("ingested");
        }

        if (path.startsWith('/api/room/lobbyPlayers/ingest')) {
            const channel = new BroadcastChannel("lobbies");

            const json = await req.json();

            channel.postMessage(JSON.stringify(json));
            return new Response("ingested");
        }

        return new Response("request isn't trying to upgrade to websocket.");
    }

    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = async () => {
        console.log("socket opened");

        let { streamEventId, events } = JSON.parse(await redis.get('lobbies2') as string);

        console.log(streamEventId, events.length);

        socket.send(JSON.stringify(events));

        while (true) {
            const msg = await redis.xread([{key: 'stream-lobbies', xid: streamEventId}], {
                block: 5000
            })
            console.log(msg);
            if (msg.length === 0) continue;
            const messages = msg[0].messages;
            streamEventId = messages[messages.length-1].xid;
            console.log('Last streamEventId', streamEventId);

            const data = messages.map((message: any) => message.fieldValues);
            console.log('data', data);

        }
    };

    socket.onmessage = (e) => {
        // console.log("socket message:", e.data);
        const data = JSON.parse(e.data);
        console.log("socket message:", data);

        if (data.type === 'ping') {
            socket.send(JSON.stringify({
                type: 'pong',
            }));
        }
    };

    socket.onerror = (e) => console.log("socket errored:", e);
    socket.onclose = () => console.log("socket closed");

    // const channel = new BroadcastChannel("lobbies");
    // channel.onmessage = (e) => {
    //     console.log("channel message:", e.data);
    //     if (socket.readyState === WebSocket.OPEN) {
    //         socket.send(e.data);
    //     }
    // };
    return response;
});
