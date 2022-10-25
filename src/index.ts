import { serve } from "https://deno.land/std@0.160.0/http/server.ts";
import {redis} from "./redis.ts";
import {sendResponse} from "./helper/util.ts";

serve(async (req: Request) => {
    const url = new URL(req.url);
    // console.log('url', url);
    const path = url.pathname.split('/');

    const upgrade = req.headers.get("upgrade") || "";
    if (upgrade.toLowerCase() != "websocket") {
        // const url = new URL(req.url);
        // console.log('url', url);
        // const path = url.pathname;

        if (url.pathname.startsWith('/api/ongoing-matches')) {
            const start = new Date();
            const lobbies = await redis.get('ongoing-matches');
            console.log('HTTP TIME', new Date().getTime() - start.getTime());
            return sendResponse(lobbies);
        }

        // if (path.startsWith('/api/room/lobbies/ingest')) {
        //     const channel = new BroadcastChannel("lobbies");
        //
        //     const json = await req.json();
        //
        //     channel.postMessage(JSON.stringify(json));
        //     return new Response("ingested");
        // }
        //
        // if (path.startsWith('/api/room/lobbyPlayers/ingest')) {
        //     const channel = new BroadcastChannel("lobbies");
        //
        //     const json = await req.json();
        //
        //     channel.postMessage(JSON.stringify(json));
        //     return new Response("ingested");
        // }

        return new Response("request isn't trying to upgrade to websocket.");
    }

    const { socket, response } = Deno.upgradeWebSocket(req);

    // e.g. /listen/lobbies

    if (path[2] === 'lobbies') {
        socket.onopen = async () => {
            console.log("socket opened");

            let {streamEventId, events} = JSON.parse(await redis.get('lobbies') as string);

            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(events));
            }

            while (socket.readyState === WebSocket.OPEN) {
                const msg = await redis.xread([{key: 'stream-lobbies', xid: streamEventId}], {block: 5000})
                if (msg.length !== 0) {
                    const messages = msg[0].messages;
                    streamEventId = messages[messages.length - 1].xid;
                    const values = messages.map((message: any) => message.fieldValues.data);
                    for (const value of values) {
                        if (socket.readyState === WebSocket.OPEN) {
                            socket.send(value);
                        }
                    }
                }
            }
        };
    }

    if (path[2] === 'ongoing-matches') {
        socket.onopen = async () => {
            console.log("socket opened");

            let start = new Date();
            const a = await redis.get('ongoing-matches') as string;
            console.log('WSS TIME A', new Date().getTime() - start.getTime());

            start = new Date();
            let {streamEventId, events} = JSON.parse(a);

            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(events));
            }
            console.log('WSS TIME B', new Date().getTime() - start.getTime());

            while (socket.readyState === WebSocket.OPEN) {
                const msg = await redis.xread([{key: 'stream-ongoing-matches', xid: streamEventId}], {block: 5000})
                if (msg.length !== 0) {
                    const messages = msg[0].messages;
                    streamEventId = messages[messages.length - 1].xid;
                    const values = messages.map((message: any) => message.fieldValues.data);
                    for (const value of values) {
                        if (socket.readyState === WebSocket.OPEN) {
                            socket.send(value);
                        }
                    }
                }
            }
        };
    }


    if (path[2] === 'match-started') {
        socket.onopen = async () => {
            console.log("socket opened");

            const sub = await redis.subscribe('pubsub-match-started');

            // await sleep(3000);
            // socket.close();

            for await (const { channel, message } of sub.receive()) {
                console.log('sub message', message);

                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(message);
                } else {
                    break;
                }
            }
        };
    }


    socket.onerror = (e) => console.log("socket errored:", e);
    socket.onclose = () => console.log("socket closed");

    // socket.onmessage = (e) => {
    //     // console.log("socket message:", e.data);
    //     const data = JSON.parse(e.data);
    //     console.log("socket message:", data);
    //
    //     if (data.type === 'ping') {
    //         socket.send(JSON.stringify({
    //             type: 'pong',
    //         }));
    //     }
    // };

    // const channel = new BroadcastChannel("lobbies");
    // channel.onmessage = (e) => {
    //     console.log("channel message:", e.data);
    //     if (socket.readyState === WebSocket.OPEN) {
    //         socket.send(e.data);
    //     }
    // };

    return response;
});

export function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
