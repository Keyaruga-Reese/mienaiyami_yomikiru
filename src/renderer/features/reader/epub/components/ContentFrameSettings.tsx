import { setEpubReaderSettings } from "@store/appSettings";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import InputCheckbox from "@ui/InputCheckbox";
import InputCheckboxColor from "@ui/InputCheckboxColor";
import InputColor from "@ui/InputColor";
import InputNumber from "@ui/InputNumber";
import InputSelect from "@ui/InputSelect";
import { colorUtils } from "@utils/color";
import type { BookReaderSettings } from "@utils/readerSettingsSchema";
import { memo } from "react";

const BORDER_STYLE_OPTIONS: Menu.OptSelectOption[] = [
    { label: "Solid", value: "solid" },
    { label: "Dashed", value: "dashed" },
    { label: "Dotted", value: "dotted" },
    { label: "Double", value: "double" },
];

/**
 * EPUB reader: content column padding and border (see `contentFrame` in book reader settings).
 */
const ContentFrameSettings = memo(() => {
    const appSettings = useAppSelector((store) => store.appSettings);
    const dispatch = useAppDispatch();
    const cf = appSettings.epubReaderSettings.contentFrame;
    const border = cf.border;

    return (
        <div className="settingItem">
            <div
                className={`name ${!appSettings.epubReaderSettings.settingsCollapsed.contentFrame ? "expanded " : ""}`}
                onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") e.currentTarget.click();
                }}
                onClick={() => {
                    dispatch(
                        setEpubReaderSettings({
                            settingsCollapsed: {
                                ...appSettings.epubReaderSettings.settingsCollapsed,
                                contentFrame: !appSettings.epubReaderSettings.settingsCollapsed.contentFrame,
                            },
                        }),
                    );
                }}
            >
                Content Frame
            </div>
            <div className="options col">
                <InputCheckboxColor
                    checked={!cf.useDefault_contentBackgroundColor}
                    onChangeCheck={(e) => {
                        dispatch(
                            setEpubReaderSettings({
                                contentFrame: {
                                    ...cf,
                                    useDefault_contentBackgroundColor: !e.currentTarget.checked,
                                },
                            }),
                        );
                    }}
                    value={colorUtils.new(cf.contentBackgroundColor)}
                    timeout={[
                        500,
                        (value) =>
                            dispatch(
                                setEpubReaderSettings({
                                    contentFrame: {
                                        ...cf,
                                        contentBackgroundColor: value.hexa(),
                                    },
                                }),
                            ),
                    ]}
                    paraBefore="Content background color&nbsp;:"
                />
                <InputNumber
                    value={cf.paddingInline}
                    min={0}
                    max={200}
                    timeout={[
                        1000,
                        (value) =>
                            dispatch(
                                setEpubReaderSettings({
                                    contentFrame: {
                                        ...cf,
                                        paddingInline: value,
                                    },
                                }),
                            ),
                    ]}
                    paraBefore="Horizontal spacing&nbsp;:"
                    paraAfter="px"
                />
                <InputCheckbox
                    checked={border.enabled}
                    onChange={(e) => {
                        dispatch(
                            setEpubReaderSettings({
                                contentFrame: {
                                    ...cf,
                                    border: {
                                        ...border,
                                        enabled: e.currentTarget.checked,
                                    },
                                },
                            }),
                        );
                    }}
                    labelAfter="Content border"
                />
                <InputNumber
                    value={border.width}
                    min={0}
                    max={32}
                    disabled={!border.enabled}
                    timeout={[
                        1000,
                        (value) =>
                            dispatch(
                                setEpubReaderSettings({
                                    contentFrame: {
                                        ...cf,
                                        border: {
                                            ...border,
                                            width: value,
                                        },
                                    },
                                }),
                            ),
                    ]}
                    paraBefore="Border width&nbsp;:"
                    paraAfter="px"
                />
                <InputSelect
                    labeled
                    disabled={!border.enabled}
                    value={border.style}
                    onChange={(value) => {
                        dispatch(
                            setEpubReaderSettings({
                                contentFrame: {
                                    ...cf,
                                    border: {
                                        ...border,
                                        style: value as BookReaderSettings["contentFrame"]["border"]["style"],
                                    },
                                },
                            }),
                        );
                    }}
                    options={BORDER_STYLE_OPTIONS}
                    paraBefore="Border style&nbsp;:"
                />
                <InputColor
                    labeled
                    value={colorUtils.new(border.color)}
                    disabled={!border.enabled}
                    timeout={[
                        500,
                        (value) =>
                            dispatch(
                                setEpubReaderSettings({
                                    contentFrame: {
                                        ...cf,
                                        border: {
                                            ...border,
                                            color: value.hexa(),
                                        },
                                    },
                                }),
                            ),
                    ]}
                    paraBefore="Border color&nbsp;:"
                />
            </div>
        </div>
    );
});

ContentFrameSettings.displayName = "ContentFrameSettings";

export default ContentFrameSettings;
