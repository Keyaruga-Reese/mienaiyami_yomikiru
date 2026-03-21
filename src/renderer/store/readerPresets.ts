import { createSlice, current, type PayloadAction } from "@reduxjs/toolkit";
import { dialogUtils } from "@utils/dialog";
import { readerPresetsPath, saveJSONfile } from "../utils/file";
import {
    type BookReaderPreset,
    buildFirstRunPresets,
    initReaderPresets,
    type MangaReaderPreset,
    parseReaderPresetsState,
    type ReaderPresetsState,
    USER_PRESET_BOOK_ID,
    USER_PRESET_MANGA_ID,
} from "../utils/readerPresets";
import { parseAppSettings } from "../utils/settingsSchema";
import { setAppSettings, setEpubReaderSettings, setReaderSettings } from "./appSettings";
import type { AppDispatch, RootState } from "./index";

let initialState: ReaderPresetsState = initReaderPresets;

if (window.fs.existsSync(readerPresetsPath)) {
    try {
        const raw = window.fs.readFileSync(readerPresetsPath, "utf8");
        initialState = parseReaderPresetsState(raw ? (JSON.parse(raw) as unknown) : null);
    } catch (err) {
        window.logger.error("readerPresets parse error:", err);
        saveJSONfile(readerPresetsPath, initReaderPresets);
    }
} else {
    const appSettings = parseAppSettings();
    initialState = buildFirstRunPresets(appSettings.readerSettings, appSettings.epubReaderSettings);
    saveJSONfile(readerPresetsPath, initialState);
}

const saveReaderPresets = (state: ReaderPresetsState) => {
    saveJSONfile(readerPresetsPath, current(state));
};

const readerPresets = createSlice({
    name: "readerPresets",
    initialState,
    reducers: {
        addMangaPreset: (state, action: PayloadAction<MangaReaderPreset>) => {
            if (state.presets.some((p) => p.id === action.payload.id)) {
                window.logger.error("Manga preset id already exists:", action.payload.id);
                return;
            }
            state.presets.push(action.payload);
            saveReaderPresets(state);
        },
        addBookPreset: (state, action: PayloadAction<BookReaderPreset>) => {
            if (state.presets.some((p) => p.id === action.payload.id)) {
                window.logger.error("Book preset id already exists:", action.payload.id);
                return;
            }
            state.presets.push(action.payload);
            saveReaderPresets(state);
        },
        addMangaPresets: (state, action: PayloadAction<MangaReaderPreset[]>) => {
            const existingIds = new Set(state.presets.map((p) => p.id));
            action.payload.forEach((p) => {
                if (!existingIds.has(p.id)) {
                    state.presets.push(p);
                    existingIds.add(p.id);
                }
            });
            saveReaderPresets(state);
        },
        addBookPresets: (state, action: PayloadAction<BookReaderPreset[]>) => {
            const existingIds = new Set(state.presets.map((p) => p.id));
            action.payload.forEach((p) => {
                if (!existingIds.has(p.id)) {
                    state.presets.push(p);
                    existingIds.add(p.id);
                }
            });
            saveReaderPresets(state);
        },
        updateMangaPreset: (state, action: PayloadAction<{ id: string; data: MangaReaderPreset["data"] }>) => {
            const idx = state.presets.findIndex((p) => p.type === "manga" && p.id === action.payload.id);
            if (idx >= 0) {
                (state.presets[idx] as MangaReaderPreset).data = action.payload.data;
                saveReaderPresets(state);
            }
        },
        updateBookPreset: (state, action: PayloadAction<{ id: string; data: BookReaderPreset["data"] }>) => {
            const idx = state.presets.findIndex((p) => p.type === "book" && p.id === action.payload.id);
            if (idx >= 0) {
                (state.presets[idx] as BookReaderPreset).data = action.payload.data;
                saveReaderPresets(state);
            }
        },
        /**
         * NOTE: prefer using deleteReaderPresetWithFallback instead.
         */
        deleteMangaPreset: (state, action: PayloadAction<string>) => {
            let mangaCount = 0;
            let deleteIdx = -1;
            for (let i = 0; i < state.presets.length; ++i) {
                if (state.presets[i].type === "manga") {
                    if (state.presets[i].id === action.payload) {
                        deleteIdx = i;
                    }
                    mangaCount++;
                }
            }
            if (mangaCount === 1) {
                dialogUtils.warn({ message: "Cannot delete last manga preset." });
                return;
            }
            if (deleteIdx >= 0) {
                state.presets.splice(deleteIdx, 1);
                saveReaderPresets(state);
            }
        },
        /**
         * NOTE: prefer using deleteReaderPresetWithFallback instead.
         */
        deleteBookPreset: (state, action: PayloadAction<string>) => {
            let bookCount = 0;
            let deleteIdx = -1;
            for (let i = 0; i < state.presets.length; ++i) {
                if (state.presets[i].type === "book") {
                    if (state.presets[i].id === action.payload) {
                        deleteIdx = i;
                    }
                    bookCount++;
                }
            }
            if (bookCount === 1) {
                dialogUtils.warn({ message: "Cannot delete last book preset." });
                return;
            }
            if (deleteIdx >= 0) {
                state.presets.splice(deleteIdx, 1);
                saveReaderPresets(state);
            }
        },
        resetToDefaults: (state) => {
            const existingIds = new Set(state.presets.map((p) => p.id));
            initReaderPresets.presets.forEach((p) => {
                if (!existingIds.has(p.id)) {
                    state.presets.push(p);
                    existingIds.add(p.id);
                } else {
                    const idx = state.presets.findIndex((x) => x.id === p.id);
                    if (idx >= 0) state.presets[idx] = p;
                }
            });
            saveReaderPresets(state);
        },
        /**
         * NOTE: prefer using refreshReaderPresetsWithReconcile instead.
         */
        refreshReaderPresets: (state) => {
            try {
                const data = JSON.parse(window.fs.readFileSync(readerPresetsPath, "utf8")) as unknown;
                return parseReaderPresetsState(data);
            } catch {
                window.logger.error("Unable to refresh readerPresets");
                return state;
            }
        },
    },
});

export const {
    addMangaPreset,
    addBookPreset,
    addMangaPresets,
    addBookPresets,
    updateMangaPreset,
    updateBookPreset,
    deleteMangaPreset,
    deleteBookPreset,
    refreshReaderPresets,
    resetToDefaults,
} = readerPresets.actions;

/**
 * Applies reader preset by id to reader settings and sets it as selected.
 */
export const selectReaderPreset =
    (id: string) =>
    (dispatch: AppDispatch, getState: () => RootState): void => {
        const preset = getState().readerPresets.presets.find((p) => p.id === id);
        if (!preset) {
            dialogUtils.customError({ message: "Preset not found." });
            return;
        }
        if (preset.type === "manga") {
            dispatch(setReaderSettings((preset as MangaReaderPreset).data));
            dispatch(setAppSettings({ mangaReaderPresetId: preset.id }));
        } else {
            dispatch(setEpubReaderSettings((preset as BookReaderPreset).data));
            dispatch(setAppSettings({ bookReaderPresetId: preset.id }));
        }
    };

/**
 * Deletes reader preset by id and syncs appSettings to fallback when the deleted preset was selected.
 */
export const deleteReaderPresetWithFallback =
    (id: string) =>
    (dispatch: AppDispatch, getState: () => RootState): void => {
        const state = getState();
        const preset = state.readerPresets.presets.find((p) => p.id === id);
        const presetType = preset?.type;
        const presetIdKey = presetType === "manga" ? "mangaReaderPresetId" : "bookReaderPresetId";
        const wasSelected = presetType && state.appSettings[presetIdKey] === id;
        const fallback = presetType
            ? state.readerPresets.presets.find((p) => p.type === presetType && p.id !== id)
            : undefined;
        const defaultId = presetType === "manga" ? USER_PRESET_MANGA_ID : USER_PRESET_BOOK_ID;

        if (presetType === "manga") dispatch(deleteMangaPreset(id));
        else if (presetType === "book") dispatch(deleteBookPreset(id));

        if (wasSelected && fallback) {
            dispatch(selectReaderPreset(fallback.id));
        } else if (wasSelected && presetType) {
            dispatch(setAppSettings({ [presetIdKey]: defaultId }));
        }
    };

/**
 * Refreshes presets from file and reconciles appSettings if presetIds are stale.
 */
export const refreshReaderPresetsWithReconcile =
    () =>
    (dispatch: AppDispatch, getState: () => RootState): void => {
        dispatch(refreshReaderPresets());

        const state = getState();
        const presets = state.readerPresets.presets;

        const mangaId = state.appSettings.mangaReaderPresetId;
        if (!presets.some((p) => p.type === "manga" && p.id === mangaId)) {
            const fallback = presets.find((p) => p.type === "manga");
            if (fallback) {
                dispatch(selectReaderPreset(fallback.id));
                window.logger.log("Reconciled manga preset id to", fallback.id);
            }
        }

        const bookId = state.appSettings.bookReaderPresetId;
        if (!presets.some((p) => p.type === "book" && p.id === bookId)) {
            const fallback = presets.find((p) => p.type === "book");
            if (fallback) {
                dispatch(selectReaderPreset(fallback.id));
                window.logger.log("Reconciled book preset id to", fallback.id);
            }
        }
    };

export default readerPresets.reducer;
