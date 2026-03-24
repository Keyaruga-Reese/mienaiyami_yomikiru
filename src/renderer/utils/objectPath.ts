/**
 * Reads a nested value by key path (plain objects and arrays).
 */
export const getValueFromDeepObject = (obj: unknown, keys: (string | number)[]): unknown => {
    let result: unknown = obj;
    for (const key of keys) {
        if (result == null) return undefined;
        if (Array.isArray(result) && typeof key === "number") {
            result = (result as unknown[])[key];
        } else if (typeof result === "object" && !Array.isArray(result) && Object.hasOwn(result as object, key)) {
            result = (result as Record<string, unknown>)[key as string];
        } else {
            return undefined;
        }
    }
    return result;
};

/**
 * Writes a nested value. Traverses plain objects and arrays; does not create missing segments.
 */
export const setValueFromDeepObject = (
    obj: Record<string, unknown>,
    keys: (string | number)[],
    value: unknown,
): void => {
    if (keys.length === 0) return;
    let main: unknown = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (Array.isArray(main) && typeof k === "number") {
            main = (main as unknown[])[k];
        } else if (main && typeof main === "object" && !Array.isArray(main)) {
            main = (main as Record<string, unknown>)[k as string];
        } else {
            return;
        }
    }
    const last = keys[keys.length - 1];
    if (Array.isArray(main) && typeof last === "number") {
        (main as unknown[])[last] = value;
    } else if (main && typeof main === "object" && !Array.isArray(main)) {
        (main as Record<string, unknown>)[last as string] = value;
    }
};
