import parseISO from 'https://deno.land/x/date_fns@v2.22.1/parseISO/index.js';
import {Toolkit} from "https://deno.land/x/pogo@v0.6.0/main.ts";


// const res = parseISO('2010-03-14', {});

// export function getParam(params: { [name: string]: any } | null, key: string): string {
//     if (params == null) {
//         return null;
//     }
//     return params[key];
// }

export function parseISONullable(value: string) {
    return value ? new Date(Date.parse(value)) : null;
}

export function parseIntNullable(value?: string | null) {
    return value ? parseInt(value) : null;
}

export function getUnixTime(date: Date) {
    const timestampInMs = date.getTime();
    return Math.floor(date.getTime() / 1000);
}

export function fromUnixTime(timestamp: number) {
    return new Date(timestamp * 1000);
}

const playerColors = [
    '#405BFF',
    '#FF0000',
    '#00FF00',
    '#FFFF00',
    '#00FFFF',
    '#FF57B3',
    '#797979',
    '#FF9600',
];

export function getPlayerBackgroundColor(playerPosition: number) {
    return playerColors[playerPosition - 1];
}

export function bigIntStringifer(_key: string, value: any) {
    if (typeof value === 'bigint') {
        return Number(value);
    }
    return value;
}

export function sendResponse(toolkit: Toolkit, data: any) {
    return toolkit
        .response(JSON.stringify((data), bigIntStringifer))
        .header('content-type', 'application/json')
        .header('access-control-allow-origin', '*')
    // res.send(JSON.stringify(decamelizeKeys(data), bigIntStringifer));
}
