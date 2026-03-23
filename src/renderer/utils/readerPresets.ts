import { z } from "zod";
import type { BookReaderSettings, MangaReaderSettings } from "./readerSettingsSchema";
import {
    bookReaderSettingsSchema,
    defaultBookReaderSettings,
    defaultMangaReaderSettings,
    mangaReaderSettingsSchema,
} from "./readerSettingsSchema";

export const mangaReaderPresetSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal("manga"),
    data: mangaReaderSettingsSchema,
    autosave: z.boolean().default(false),
});

export const bookReaderPresetSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal("book"),
    data: bookReaderSettingsSchema,
    autosave: z.boolean().default(false),
});

export const readerPresetSchema = z.discriminatedUnion("type", [mangaReaderPresetSchema, bookReaderPresetSchema]);

export const readerPresetsStateSchema = z.object({
    presets: z.array(readerPresetSchema),
});

export type MangaReaderPreset = z.infer<typeof mangaReaderPresetSchema>;
export type BookReaderPreset = z.infer<typeof bookReaderPresetSchema>;
export type ReaderPreset = z.infer<typeof readerPresetSchema>;

export type ReaderPresetsState = {
    presets: ReaderPreset[];
};

const initPresets: ReaderPreset[] = [
    {
        id: "manga-preset-paged-ltr",
        name: "Paged LTR",
        type: "manga",
        autosave: false,
        data: {
            ...defaultMangaReaderSettings,
            readerTypeSelected: 1,
            pagesPerRowSelected: 1,
            readingSide: 0,
            gapBetweenRows: true,
            fitOption: 1,
        } satisfies MangaReaderSettings,
    },
    {
        id: "manga-preset-long-strip",
        name: "Long Strip",
        type: "manga",
        autosave: false,
        data: {
            ...defaultMangaReaderSettings,
            readerTypeSelected: 0,
            pagesPerRowSelected: 0,
            gapBetweenRows: false,
            gapSize: 0,
        } satisfies MangaReaderSettings,
    },
    {
        id: "manga-preset-longstrip-gaps",
        name: "Long Strip with Gaps",
        type: "manga",
        autosave: false,
        data: {
            ...defaultMangaReaderSettings,
            readerTypeSelected: 0,
            pagesPerRowSelected: 0,
            gapBetweenRows: true,
            gapSize: 10,
        } satisfies MangaReaderSettings,
    },
    {
        id: "book-preset-default",
        name: "Default",
        type: "book",
        autosave: false,
        data: defaultBookReaderSettings satisfies BookReaderSettings,
    },
];

export const initReaderPresets: ReaderPresetsState = {
    presets: initPresets,
};

export const USER_PRESET_MANGA_ID = "user-preset-manga";
export const USER_PRESET_BOOK_ID = "user-preset-book";

/**
 * First-run presets: defaults + User preset per type with current settings from app.
 * Preserves user's current reader settings so they persist when selecting other presets.
 */
export const buildFirstRunPresets = (
    mangaSettings: MangaReaderSettings,
    bookSettings: BookReaderSettings,
): ReaderPresetsState => ({
    presets: [
        ...initPresets,
        {
            id: USER_PRESET_MANGA_ID,
            name: "User",
            type: "manga",
            autosave: true,
            data: mangaSettings,
        },
        {
            id: USER_PRESET_BOOK_ID,
            name: "User",
            type: "book",
            autosave: true,
            data: bookSettings,
        },
    ],
});

/**
 * Parses a single preset from clipboard. Returns null if invalid.
 */
export const parseMangaPreset = (data: unknown): MangaReaderPreset | null => {
    const r = mangaReaderPresetSchema.safeParse(data);
    return r.success ? r.data : null;
};

/**
 * Parses a single preset from clipboard. Returns null if invalid.
 */
export const parseBookPreset = (data: unknown): BookReaderPreset | null => {
    const r = bookReaderPresetSchema.safeParse(data);
    return r.success ? r.data : null;
};

/**
 * Parses raw import data into validated presets. Accepts array or { presets: [...] }.
 * Returns only valid presets; filters by type when extracting manga/book.
 */
export const parsePresetImport = (data: unknown): ReaderPreset[] => {
    const arr = Array.isArray(data) ? data : ((data as { presets?: unknown[] })?.presets ?? []);
    return arr
        .map((p) => readerPresetSchema.safeParse(p))
        .filter((r): r is z.SafeParseSuccess<ReaderPreset> => r.success)
        .map((r) => r.data);
};

/**
 * @returns true if preset id is a default manga preset
 */
export const isDefaultMangaPresetById = (id: string): boolean =>
    initReaderPresets.presets.some((p) => p.type === "manga" && p.id === id);

/**
 * Parses file data into validated ReaderPresetsState. Returns initReaderPresets if invalid.
 */
export const parseReaderPresetsState = (data: unknown): ReaderPresetsState => {
    if (data == null || (typeof data === "object" && !("presets" in data) && !Array.isArray(data))) {
        return initReaderPresets;
    }
    const r = readerPresetsStateSchema.safeParse(data);
    if (!r.success) {
        window.logger.warn("readerPresets schema validation failed, using defaults:", r.error.message);
        return initReaderPresets;
    }
    return r.data;
};

/**
 * @returns true if preset id is a default book preset
 */
export const isDefaultBookPresetById = (id: string): boolean =>
    initReaderPresets.presets.some((p) => p.type === "book" && p.id === id);
