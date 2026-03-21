import { z } from "zod";
import { dialogUtils } from "./dialog";
import { saveJSONfile, settingsPath } from "./file";
import { USER_PRESET_BOOK_ID, USER_PRESET_MANGA_ID } from "./readerPresets";
import {
    bookReaderSettingsSchema,
    defaultBookReaderSettings,
    defaultMangaReaderSettings,
    mangaReaderSettingsSchema,
} from "./readerSettingsSchema";

const sortTypeEnum = z.union([z.literal("normal"), z.literal("inverse")]);
const sortByEnum = z.union([z.literal("name"), z.literal("date")]);

const settingSchema = z
    .object({
        baseDir: z.string(),
        customStylesheet: z.string(),
        locationListSortType: sortTypeEnum,
        locationListSortBy: sortByEnum,
        bookListSortType: sortTypeEnum,
        bookListSortBy: sortByEnum,
        historyListSortType: sortTypeEnum,
        historyListSortBy: sortByEnum,
        /**
         * Open chapter in reader directly, one folder inside of base manga dir.
         */
        openDirectlyFromManga: z.boolean(),
        showTabs: z.object({
            bookmark: z.boolean(),
            history: z.boolean(),
        }),
        useCanvasBasedReader: z.boolean(),
        openOnDblClick: z.boolean(),
        disableListNumbering: z.boolean(),
        /**
         * show search input for history and bookmark
         */
        showSearch: z.boolean(),

        openInZenMode: z.boolean(),
        hideCursorInZenMode: z.boolean(),
        /**
         * Show more data in title attr in bookmark/history tab items
         */
        showMoreDataOnItemHover: z.boolean(),
        autoRefreshSideList: z.boolean(),
        keepExtractedFiles: z.boolean(),
        checkboxReaderSetting: z.boolean(),
        syncSettings: z.boolean(),
        syncThemes: z.boolean(),
        /**
         * Confirm before deleting item from history/bookmark/note
         * only in side list
         * always true on home page
         */
        confirmDeleteItem: z.boolean(),

        //styles

        showPageCountInSideList: z.boolean(),
        showTextFileBadge: z.boolean(),

        //styles end

        readerSettings: mangaReaderSettingsSchema,
        epubReaderSettings: bookReaderSettingsSchema,
        mangaReaderPresetId: z.string(),
        bookReaderPresetId: z.string(),
    })
    .strip()
    // it is separate do i dont leave default-less value
    .default({
        baseDir: window.electron.app.getPath("home"),
        customStylesheet: "",
        locationListSortType: "normal",
        locationListSortBy: "name",
        bookListSortType: "normal",
        bookListSortBy: "date",
        historyListSortType: "normal",
        historyListSortBy: "date",
        openDirectlyFromManga: false,
        showTabs: {
            bookmark: true,
            history: true,
        },
        useCanvasBasedReader: false,
        openOnDblClick: true,
        disableListNumbering: true,
        showSearch: true,
        openInZenMode: false,
        hideCursorInZenMode: false,
        showMoreDataOnItemHover: true,
        autoRefreshSideList: false,
        keepExtractedFiles: true,
        checkboxReaderSetting: false,
        syncSettings: true,
        syncThemes: true,
        confirmDeleteItem: true,
        showPageCountInSideList: true,
        showTextFileBadge: true,
        readerSettings: defaultMangaReaderSettings,
        epubReaderSettings: defaultBookReaderSettings,
        mangaReaderPresetId: USER_PRESET_MANGA_ID,
        bookReaderPresetId: USER_PRESET_BOOK_ID,
    });

export const defaultSettings = settingSchema.parse(undefined);

const makeSettingsJson = () => {
    saveJSONfile(settingsPath, defaultSettings);
};
let settingNotFound = false;
if (!window.fs.existsSync(settingsPath)) {
    // dialogUtils.warn({ message: "No settings found, Select manga folder to make default in settings" });
    settingNotFound = true;
    makeSettingsJson();
}

const parseAppSettings = (): z.infer<typeof settingSchema> => {
    if (settingNotFound) {
        settingNotFound = false;
        return defaultSettings;
    }

    const getValueFromDeepObject = (obj: any, keys: (string | number)[]) => {
        let result = obj;
        for (const key of keys) {
            if (result && Object.hasOwn(result, key)) {
                result = result[key];
            } else {
                return undefined; // Key doesn't exist in the object
            }
        }
        return result;
    };
    const setValueFromDeepObject = (obj: any, keys: (string | number)[], value: any) => {
        let main = obj;
        let i: number;
        for (i = 0; i < keys.length - 1; i++) {
            main = main[keys[i]];
        }
        main[keys[i]] = value;
    };

    try {
        const parsedJSON = JSON.parse(window.fs.readFileSync(settingsPath, "utf-8"));
        const ers = parsedJSON?.epubReaderSettings;
        if (ers?.backgroundImageLayer !== undefined) {
            ers.backgroundImage = {
                ...(typeof ers.backgroundImage === "object" ? ers.backgroundImage : {}),
                enabled: ers.backgroundImage?.enabled ?? false,
                path: ers.backgroundImage?.path ?? "",
                dimIntensity: ers.backgroundImageDimIntensity ?? 0,
                brightness: ers.backgroundImageBrightness ?? 100,
                contrast: ers.backgroundImageContrast ?? 100,
                layer: ers.backgroundImageLayer ?? { enabled: true, color: "#000000", opacity: 0.8 },
                paddingInline: ers.backgroundPaddingInline ?? 0,
            };
            delete ers.backgroundImageLayer;
            delete ers.backgroundImageDimIntensity;
            delete ers.backgroundImageBrightness;
            delete ers.backgroundImageContrast;
            delete ers.backgroundPaddingInline;
        }
        return settingSchema
            .catch(({ error, input }) => {
                const location = [] as string[];
                const fixed = { ...input };
                error.issues.forEach((e) => {
                    location.push(e.path.join("."));
                    setValueFromDeepObject(fixed, e.path, getValueFromDeepObject(defaultSettings, e.path));
                });
                dialogUtils.warn({
                    message: `Some settings are invalid or new settings added. Re-writing settings.`,
                });
                window.logger.log("appSettings invalid at :", location);
                saveJSONfile(settingsPath, fixed);
                return fixed as z.infer<typeof settingSchema>;
            })
            .parse(parsedJSON);
    } catch (err) {
        window.logger.error(err);
        window.logger.log(window.fs.readFileSync(settingsPath, "utf-8"));
        dialogUtils.customError({ message: "Unable to parse settings.json. Remaking." });
        makeSettingsJson();
        return defaultSettings;
    }
};

export { settingSchema, parseAppSettings, makeSettingsJson };
