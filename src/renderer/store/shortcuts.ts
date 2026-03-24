import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { dialogUtils } from "@utils/dialog";
import { SHORTCUT_COMMAND_MAP } from "@utils/keybindings";
import { saveJSONfile, shortcutsPath } from "../utils/file";
import { readJsonFileWithRetrySync } from "../utils/readJsonFileWithRetry";
import type { RootState } from ".";

const initialState: ShortcutSchema[] = [];

const defaultShortcuts: ShortcutSchema[] = SHORTCUT_COMMAND_MAP.map((e) => ({
    command: e.command,
    keys: e.defaultKeys,
}));

//todo make function readJSONfile
if (window.fs.existsSync(shortcutsPath)) {
    try {
        let data = readJsonFileWithRetrySync<ShortcutSchema[]>(shortcutsPath, {
            maxAttempts: 10,
            onRetry: (attempt, error) => {
                window.logger.log("shortcuts initial retry:", attempt, error);
            },
        });
        // check if shortcut.json is pre version 2.18.5
        if (Object.keys(data[0] ?? {}).includes("key1")) {
            throw Error("old shortcuts.json detected");
        }

        // check if shortcut key is missing in shortcuts.json, if so then add
        const shortcutKeyEntries = data.map((e) => e.command);
        const shortcutKeyOriginal = SHORTCUT_COMMAND_MAP.map((e) => e.command);
        data = data.filter((e) => shortcutKeyOriginal.includes(e.command));
        SHORTCUT_COMMAND_MAP.forEach((e) => {
            if (!shortcutKeyEntries.includes(e.command)) {
                window.logger.log(`Function ${e.command} does not exist in shortcuts.json. Adding it.`);
                data.push({
                    command: e.command,
                    keys: e.defaultKeys,
                });
            }
        });
        saveJSONfile(shortcutsPath, data);
        initialState.push(...data);
    } catch (err) {
        if (err instanceof Error && err.message.includes("old shortcuts")) {
            dialogUtils.warn({
                message:
                    "Shortcut system is updating to support advanced key combinations. This will replace the old shortcut system and result in the loss of your current shortcuts. Sorry for the inconvenience.",
            });
        } else
            dialogUtils.customError({
                message: `Unable to parse ${shortcutsPath}\nMaking new shortcuts.json...`,
            });
        window.logger.error(err);
        saveJSONfile(shortcutsPath, defaultShortcuts);
        initialState.push(...defaultShortcuts);
    }
} else {
    saveJSONfile(shortcutsPath, defaultShortcuts);
    initialState.push(...defaultShortcuts);
}

const shortcuts = createSlice({
    name: "shortcuts",
    initialState,
    reducers: {
        setShortcuts: (state, action: PayloadAction<{ command: ShortcutCommands; key: string }>) => {
            const { command, key } = action.payload;
            const index = state.findIndex((e) => e.command === command);
            if (index > -1) {
                if (!state[index].keys.includes(key)) state[index].keys.push(key);
                window.logger.log(`Adding keybinding: "${command}" <== "${key}"`);
            }
            saveJSONfile(shortcutsPath, JSON.parse(JSON.stringify(state)));
        },
        removeShortcuts: (state, action: PayloadAction<{ command: ShortcutCommands; key: string }>) => {
            const { command, key } = action.payload;
            const index = state.findIndex((e) => e.command === command);
            if (index > -1) {
                state[index].keys = state[index].keys.filter((e) => e !== key);
                window.logger.log(`Removing keybinding: "${command}" <== "${key}"`);
            }
            saveJSONfile(shortcutsPath, JSON.parse(JSON.stringify(state)));
        },
        resetShortcuts: () => {
            saveJSONfile(shortcutsPath, defaultShortcuts);
            return defaultShortcuts;
        },
        refreshShortcuts: (state) => {
            try {
                const data = readJsonFileWithRetrySync<ShortcutSchema[]>(shortcutsPath, {
                    maxAttempts: 8,
                    onRetry: (attempt, error) => {
                        window.logger.log("shortcuts refresh retry:", attempt, error);
                    },
                });
                return data;
            } catch (error) {
                window.logger.error("Unable to refresh shortcuts:", error);
                return state;
            }
        },
    },
});

export const { setShortcuts, resetShortcuts, removeShortcuts, refreshShortcuts } = shortcuts.actions;

export const getShortcutsMapped = (state: RootState) => {
    return Object.fromEntries(state.shortcuts.map((e) => [e.command, e.keys])) as Record<
        ShortcutCommands,
        string[]
    >;
};

export default shortcuts.reducer;
