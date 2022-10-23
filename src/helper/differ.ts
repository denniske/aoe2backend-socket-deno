import {uniq} from "https://raw.githubusercontent.com/lodash/lodash/4.17.21-es/lodash.js";

export function getDiff2(old: any, current: any): any {
    const keys = [...Object.keys(current), ...Object.keys(old)];
    const diff = {};
    for (const key of keys) {
        if (current[key] !== old[key]) {
            diff[key] = current[key];
        }
    }
    return diff;
}

export function getDiff<T>(old: Record<string, T>, current: Record<string, T>, mapping: Record<string, string>, idGetter: (key: string) => any) {
    const keys = uniq([...Object.keys(current), ...Object.keys(old)]);
    const diff = [];
    for (const key of keys) {
        if (current[key] !== old[key]) {
            if (current[key] == null) {
                diff.push({
                    type: mapping['removed'],
                    data: { ...idGetter(key) },
                })
            } else if (old[key] == null) {
                diff.push({
                    type: mapping['added'],
                    data: current[key],
                })
            } else if (
                (typeof current[key] === 'object' || typeof current[key] === 'object')
            ) {
                const difference = getDiff2(old[key], current[key]);

                if (Object.keys(difference).length > 0) {
                    diff.push({
                        type: mapping['updated'],
                        data: {
                            ...idGetter(key),
                            ...getDiff2(old[key], current[key])
                        },
                    })
                }

            }
        }
    }
    return diff;
}
