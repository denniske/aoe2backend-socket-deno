import parseISO from 'https://deno.land/x/date_fns@v2.22.1/parseISO/index.js';

// const res = parseISO('2010-03-14', {});

// export function getParam(params: { [name: string]: any } | null, key: string): string {
//     if (params == null) {
//         return null;
//     }
//     return params[key];
// }

export function parseISONullable(value: string) {
    return value ? parseISO(value) : null;
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
