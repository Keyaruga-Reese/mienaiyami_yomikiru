import { faPlus, faSave, faSync, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { setEpubReaderSettings, setReaderSettings } from "@store/appSettings";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import {
    addBookPreset,
    addMangaPreset,
    deleteReaderPresetWithFallback,
    selectReaderPreset,
    setPresetAutosave,
    updateBookPreset,
    updateMangaPreset,
} from "@store/readerPresets";
import InputCheckbox from "@ui/InputCheckbox";
import TextInputModal from "@ui/TextInputModal";
import { dialogUtils } from "@utils/dialog";
import type { BookReaderPreset, MangaReaderPreset } from "@utils/readerPresets";
import type { BookReaderSettings, MangaReaderSettings } from "@utils/readerSettingsSchema";
import { memo, useState } from "react";

type ReaderPresetSectionProps = {
    type: "manga" | "book";
};

/**
 * Collapsible preset section with selector, add/update/delete, and TextInputModal.
 */
const ReaderPresetSection = memo(({ type }: ReaderPresetSectionProps) => {
    const dispatch = useAppDispatch();
    const appSettings = useAppSelector((s) => s.appSettings);
    const presets = useAppSelector((s) => s.readerPresets.presets.filter((p) => p.type === type)) as (
        | MangaReaderPreset
        | BookReaderPreset
    )[];
    const presetId = type === "manga" ? appSettings.mangaReaderPresetId : appSettings.bookReaderPresetId;
    const preset = presets.find((p) => p.id === presetId);
    const settingsCollapsed =
        type === "manga"
            ? appSettings.readerSettings.settingsCollapsed
            : appSettings.epubReaderSettings.settingsCollapsed;
    const readerData = type === "manga" ? appSettings.readerSettings : appSettings.epubReaderSettings;

    const [showPresetNameModal, setShowPresetNameModal] = useState(false);

    const isCollapsed = settingsCollapsed.preset ?? false;
    const toggleCollapsed = () => {
        if (type === "manga") {
            dispatch(
                setReaderSettings({
                    settingsCollapsed: {
                        ...(settingsCollapsed as unknown as MangaReaderSettings["settingsCollapsed"]),
                        preset: !isCollapsed,
                    },
                }),
            );
        } else {
            dispatch(
                setEpubReaderSettings({
                    settingsCollapsed: {
                        ...(settingsCollapsed as unknown as BookReaderSettings["settingsCollapsed"]),
                        preset: !isCollapsed,
                    },
                }),
            );
        }
    };

    const handleAddPreset = (name: string) => {
        const newId = crypto.randomUUID();
        const payload = {
            id: newId,
            name,
            type,
            autosave: false,
            data: readerData,
        };
        if (type === "manga") {
            dispatch(addMangaPreset(payload as MangaReaderPreset));
        } else {
            dispatch(addBookPreset(payload as BookReaderPreset));
        }
        dispatch(selectReaderPreset(newId));
        setShowPresetNameModal(false);
    };

    return (
        <>
            <div className="settingItem">
                <div
                    className={`name ${!isCollapsed ? "expanded " : ""}`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") e.currentTarget.click();
                    }}
                    onClick={toggleCollapsed}
                >
                    Preset
                </div>
                <div className="options">
                    <div className="col">
                        {presets.map((preset, idx) => {
                            const isSelected = presetId === preset.id;
                            return (
                                <button
                                    key={preset.id}
                                    className={isSelected ? "optionSelected" : ""}
                                    onClick={() => dispatch(selectReaderPreset(preset.id))}
                                    title={preset.name}
                                >
                                    {idx < 5 ? (
                                        <>
                                            <code>{idx + 1}</code>{" "}
                                        </>
                                    ) : (
                                        ""
                                    )}
                                    {preset.name}
                                </button>
                            );
                        })}
                        <div className="row stretch-content">
                            <button
                                onClick={() => setShowPresetNameModal(true)}
                                title="Save current settings as new preset"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                            {preset && (
                                <>
                                    <button
                                        className={preset.autosave ? "optionSelected" : ""}
                                        onClick={() =>
                                            dispatch(
                                                setPresetAutosave({ id: preset.id, autosave: !preset.autosave }),
                                            )
                                        }
                                        title={preset.autosave ? "Disable autosave" : "Enable autosave"}
                                    >
                                        <FontAwesomeIcon icon={faSync} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const preset = presets.find((p) => p.id === presetId);
                                            if (preset) {
                                                if (type === "manga") {
                                                    dispatch(
                                                        updateMangaPreset({
                                                            id: preset.id,
                                                            data: readerData as MangaReaderPreset["data"],
                                                        }),
                                                    );
                                                } else {
                                                    dispatch(
                                                        updateBookPreset({
                                                            id: preset.id,
                                                            data: readerData as BookReaderPreset["data"],
                                                        }),
                                                    );
                                                }
                                                dialogUtils.confirm({
                                                    message: "Preset updated.",
                                                    noOption: true,
                                                });
                                            }
                                        }}
                                        title="Update selected preset with current settings"
                                    >
                                        <FontAwesomeIcon icon={faSave} />
                                    </button>
                                    {presets.length > 1 && (
                                        <button
                                            onClick={() => {
                                                if (!presetId) return;
                                                dialogUtils
                                                    .confirm({
                                                        message: "Delete preset?",
                                                        noOption: false,
                                                    })
                                                    .then((res) => {
                                                        if (res.response === 0) {
                                                            dispatch(deleteReaderPresetWithFallback(presetId));
                                                        }
                                                    });
                                            }}
                                            title="Delete preset"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {showPresetNameModal && (
                <TextInputModal
                    title="Preset name"
                    placeholder="Enter preset name"
                    onClose={() => setShowPresetNameModal(false)}
                    onSave={handleAddPreset}
                />
            )}
        </>
    );
});

ReaderPresetSection.displayName = "ReaderPresetSection";

export default ReaderPresetSection;
