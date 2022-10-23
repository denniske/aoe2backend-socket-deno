import { serve } from "https://deno.land/std@0.160.0/http/server.ts";
import {redis} from "./redis.ts";
import {sendResponse} from "./helper/util.ts";
import flatten from "https://raw.githubusercontent.com/lodash/lodash/4.17.21-es/flatten.js";

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

        const { streamEventId, lobbies } = JSON.parse(await redis.get('lobbies2') as string);

        console.log(streamEventId, lobbies.length);


    };

    let lastLobbiesDict: Record<string, any> = {};
    let lastPlayersDict: Record<string, any> = {};

    socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        console.log("socket message:", data);

        let lobbies = data;

        // if (data.type === 'ping') {
        //     socket.send(JSON.stringify({
        //         type: 'pong',
        //     }));
        //     return;
        // }

        let players = flatten(lobbies.map(l => l.players.map(p => ({ ...p, matchId: l.matchId }))));

        console.log(players);

        // const getLobbyKey = (lobby: Camelized<IParsedGenericMatch>) => `${lobby.matchId}`;
        // const parseLobbyKey = (key: string) => ({ matchId: parseInt(key) });
        //
        // const getSlotKey = (player: IMatchesMatchPlayer2) => `${player.matchId}-${player.slot}`;
        // const parseSlotKey = (key: string) => ({ matchId: parseInt(key.split('-')[0]), slot: parseInt(key.split('-')[1]) });
        //
        // lobbies.forEach(l => delete l.players);
        //
        // let newLobbiesDict = Object.assign({}, ...lobbies.map((x) => ({[getLobbyKey(x)]: x}))) as Record<string, Camelized<IParsedGenericMatch>>;
        // let newPlayersDict = Object.assign({}, ...players.map((x) => ({[getSlotKey(x)]: x}))) as Record<string, Camelized<IParsedGenericPlayer>>;
        //
        // const diffLobbies = getDiff(this.lastLobbiesDict, newLobbiesDict, eventMappingLobby, parseLobbyKey);
        // const diffPlayers = getDiff(this.lastPlayersDict, newPlayersDict, eventMappingPlayer, parseSlotKey);
        //
        // // console.log(diffLobbies);
        // // console.log(diffPlayers);
        //
        // const events = sortBy([...diffLobbies, ...diffPlayers], event => eventMappingOrder[event.type]);
        //
        // await putMessage('lobbies', events);
        //
        // this.lastLobbiesDict = cloneDeep(newLobbiesDict);
        // this.lastPlayersDict = cloneDeep(newPlayersDict);
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
