import { faChevronDown, faChevronUp, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import {
    addBookPresets,
    addMangaPresets,
    deleteReaderPresetWithFallback,
    movePreset,
    resetToDefaults,
    selectReaderPreset,
} from "@store/readerPresets";
import { dialogUtils } from "@utils/dialog";
import type { BookReaderPreset, MangaReaderPreset } from "@utils/readerPresets";
import { parsePresetImport } from "@utils/readerPresets";
import { useSettingsContext } from "../Settings";

type PresetActionsRowProps = {
    type: "manga" | "book";
    title: string;
};

const PresetActionsRow = ({ type, title }: PresetActionsRowProps) => {
    const presets = useAppSelector((s) => s.readerPresets.presets.filter((p) => p.type === type));
    const currentPresetId = useAppSelector(
        (s) => s.appSettings[type === "manga" ? "mangaReaderPresetId" : "bookReaderPresetId"],
    );
    const dispatch = useAppDispatch();
    return (
        <div className="col">
            <h4>{title} Presets</h4>
            <ul className="presetList">
                {presets.map((preset, idx) => {
                    const isSelected = currentPresetId === preset.id;
                    const canMoveUp = presets.length > 1 && idx > 0;
                    const canMoveDown = presets.length > 1 && idx < presets.length - 1;
                    return (
                        <li key={preset.id} className={`row presetItem ${isSelected ? "presetItemSelected" : ""}`}>
                            <span className="presetName" title={preset.name}>
                                {idx < 5 ? (
                                    <>
                                        <code>{idx + 1}</code>{" "}
                                    </>
                                ) : (
                                    ""
                                )}
                                {preset.name}
                            </span>
                            {presets.length > 1 && (
                                <>
                                    <button
                                        disabled={!canMoveUp}
                                        onClick={() => dispatch(movePreset({ id: preset.id, direction: "up" }))}
                                        title="Move up"
                                    >
                                        <FontAwesomeIcon icon={faChevronUp} />
                                    </button>
                                    <button
                                        disabled={!canMoveDown}
                                        onClick={() => dispatch(movePreset({ id: preset.id, direction: "down" }))}
                                        title="Move down"
                                    >
                                        <FontAwesomeIcon icon={faChevronDown} />
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => dispatch(selectReaderPreset(preset.id))}
                                className={isSelected ? "optionSelected" : ""}
                            >
                                Select
                            </button>
                            {presets.length > 1 && (
                                <button
                                    onClick={() => {
                                        dialogUtils
                                            .confirm({ message: "Delete preset?", noOption: false })
                                            .then((res) => {
                                                if (res.response === 0) {
                                                    dispatch(deleteReaderPresetWithFallback(preset.id));
                                                }
                                            });
                                    }}
                                    title="Delete preset"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
            <div className="row">
                <button
                    onClick={async () => {
                        const opt = await dialogUtils.showSaveDialog({
                            title: `Export ${title} Presets`,
                            defaultPath: `yomikiru-${type}ReaderPresets.json`,
                            filters: [{ name: "json", extensions: ["json"] }],
                        });
                        if (!opt.filePath) return;
                        window.electron.invoke("fs:saveFile", {
                            filePath: opt.filePath,
                            data: JSON.stringify(presets, null, "\t"),
                        });
                    }}
                >
                    Export
                </button>
                <button
                    onClick={async () => {
                        const opt = await dialogUtils.showOpenDialog({
                            properties: ["openFile"],
                            filters: [{ name: "Json", extensions: ["json"] }],
                        });
                        if (!opt.filePaths.length) return;
                        try {
                            const raw = await window.fs.readFile(opt.filePaths[0], "utf8");
                            const data = JSON.parse(raw);
                            const validated = parsePresetImport(data).filter((p) => p.type === type);
                            const toAdd = validated.filter((p) => !presets.some((e) => e.id === p.id));
                            const skipped = validated.length - toAdd.length;
                            if (toAdd.length > 0) {
                                if (type === "manga") dispatch(addMangaPresets(toAdd as MangaReaderPreset[]));
                                else dispatch(addBookPresets(toAdd as BookReaderPreset[]));
                            }
                            dialogUtils.confirm({
                                title: "Imported",
                                message: `Imported ${toAdd.length} preset(s).${skipped > 0 ? ` Skipped ${skipped} duplicate(s).` : ""}`,
                                noOption: true,
                            });
                        } catch (err) {
                            window.logger.error(err);
                            dialogUtils.customError({
                                message: "Invalid preset file.",
                                log: false,
                            });
                        }
                    }}
                >
                    Import
                </button>
                <button
                    onClick={(e) => {
                        const current = currentPresetId ? presets.find((p) => p.id === currentPresetId) : null;
                        if (current) {
                            try {
                                window.electron.writeText(JSON.stringify(current, null, "\t"));
                                const target = e.currentTarget as HTMLButtonElement;
                                const old = target.innerText;
                                target.innerText = "Copied!";
                                target.disabled = true;
                                setTimeout(() => {
                                    target.disabled = false;
                                    target.innerText = old;
                                }, 3000);
                            } catch (reason) {
                                dialogUtils.customError({ message: `Failed to copy: ${reason}` });
                            }
                        } else {
                            dialogUtils.warn({
                                message: "No preset selected. Apply a preset first, then copy.",
                            });
                        }
                    }}
                >
                    Copy Current Preset to Clipboard
                </button>
            </div>
        </div>
    );
};

/**
 * Reader presets: reset defaults, manga/book export/import/share.
 */
const GeneralReaderPresetsSettings: React.FC = () => {
    const dispatch = useAppDispatch();
    const presets = useAppSelector((s) => s.readerPresets.presets);
    const { scrollIntoView } = useSettingsContext();

    const handleSavePresetFromClipboard = () => {
        const text = window.electron.readText("clipboard");
        try {
            if (!text) throw new Error("No preset data in clipboard.");
            const parsed = JSON.parse(text) as unknown;
            const validated = parsePresetImport(Array.isArray(parsed) ? parsed : [parsed]);
            const p = validated[0];
            if (!p) throw new Error("Invalid format");
            if (presets.some((e) => e.id === p.id)) {
                dialogUtils.warn({ message: "Preset with this id already exists." });
                return;
            }
            if (p.type === "manga") dispatch(addMangaPresets([p as MangaReaderPreset]));
            else dispatch(addBookPresets([p as BookReaderPreset]));
            dialogUtils.confirm({
                title: "Imported",
                message: `Imported preset "${p.name}".`,
                noOption: true,
            });
        } catch {
            dialogUtils.customError({
                message: "Invalid preset data in clipboard.",
                log: false,
            });
        }
    };

    return (
        <div className="settingItem2" id="settings-reader-presets">
            <h3>Reader Presets</h3>
            <div className="desc">
                Reset default presets, or export/import/share manga and book reader presets. Custom presets only
                (default presets excluded from export).{" "}
                <a
                    onClick={() => scrollIntoView("#settings-usage-readerPresets", "extras")}
                    id="settings-readerPresets"
                >
                    More Info
                </a>
            </div>
            <div className="main col">
                <div className="row">
                    <button
                        onClick={() => {
                            dialogUtils
                                .confirm({
                                    message:
                                        "Reset default presets to their original state? Custom presets are kept.",
                                    noOption: false,
                                })
                                .then((res) => {
                                    if (res.response === 0) dispatch(resetToDefaults());
                                });
                        }}
                    >
                        Reset Default Presets (custom are unaffected)
                    </button>
                    <button onClick={handleSavePresetFromClipboard}>Save Preset from Clipboard</button>
                </div>
                <PresetActionsRow type="manga" title="Manga" />
                <PresetActionsRow type="book" title="Book" />
            </div>
        </div>
    );
};

export default GeneralReaderPresetsSettings;
