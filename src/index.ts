import { serve } from "https://deno.land/std@0.140.0/http/server.ts";

serve((req: Request) => {
    const upgrade = req.headers.get("upgrade") || "";
    if (upgrade.toLowerCase() != "websocket") {

        const url = new URL(req.url);

        console.log('url', url);

        const path = url.pathname;

        if (path.startsWith('/api/room/lobbies/ingest')) {
            const channel = new BroadcastChannel("lobbies");
            channel.postMessage('lobbies ingested');
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
