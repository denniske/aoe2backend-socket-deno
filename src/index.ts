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

    socket.onopen = () => console.log("socket opened");

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

    const channel = new BroadcastChannel("lobbies");
    channel.onmessage = (e) => {
        console.log("channel message:", e.data);
        socket.send(e.data);
    };
    return response;
});
