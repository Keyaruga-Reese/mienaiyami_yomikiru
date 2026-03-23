import type { Middleware, MiddlewareAPI } from "@reduxjs/toolkit";
import { setEpubReaderSettings, setReaderSettings } from "./appSettings";
import type { AppDispatch, RootState } from "./index";
import { updateBookPreset, updateMangaPreset } from "./readerPresets";

const AUTOSAVE_DEBOUNCE_MS = 400;

let mangaDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let bookDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Middleware that auto-updates the current preset when reader settings change and the preset has autosave enabled.
 * Debounces rapid changes to avoid excessive file writes.
 */
export const readerPresetsAutosaveMiddleware: Middleware =
    (store: MiddlewareAPI<AppDispatch, RootState>) => (next) => (action) => {
        const result = next(action);

        if (setReaderSettings.match(action)) {
            if (mangaDebounceTimer) clearTimeout(mangaDebounceTimer);
            mangaDebounceTimer = setTimeout(() => {
                mangaDebounceTimer = null;
                const state = store.getState();
                const presetId = state.appSettings.mangaReaderPresetId;
                const preset = state.readerPresets.presets.find((p) => p.type === "manga" && p.id === presetId);
                if (preset?.autosave) {
                    store.dispatch(
                        updateMangaPreset({
                            id: preset.id,
                            data: state.appSettings.readerSettings,
                        }),
                    );
                }
            }, AUTOSAVE_DEBOUNCE_MS);
        }

        if (setEpubReaderSettings.match(action)) {
            if (bookDebounceTimer) clearTimeout(bookDebounceTimer);
            bookDebounceTimer = setTimeout(() => {
                bookDebounceTimer = null;
                const state = store.getState();
                const presetId = state.appSettings.bookReaderPresetId;
                const preset = state.readerPresets.presets.find((p) => p.type === "book" && p.id === presetId);
                if (preset?.autosave) {
                    store.dispatch(
                        updateBookPreset({
                            id: preset.id,
                            data: state.appSettings.epubReaderSettings,
                        }),
                    );
                }
            }, AUTOSAVE_DEBOUNCE_MS);
        }

        return result;
    };
