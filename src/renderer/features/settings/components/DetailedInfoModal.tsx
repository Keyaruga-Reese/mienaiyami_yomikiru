import { useAppSelector } from "@store/hooks";
import TextDisplayModal from "@ui/TextDisplayModal";
import { memo } from "react";

type DetailedInfoModalProps = {
    open: boolean;
    onClose: () => void;
};

/**
 * Formats detailed build info for display and copy, matching Cursor-style About dialog.
 */
const formatBuildInfo = (channel: string | undefined): string => {
    const p = window.process;
    const app = window.electron.app;
    const versions = p.versions;
    const platformDisplay = p.platform === "win32" ? "Windows_NT" : p.platform;
    const releaseTrack = channel === "beta" ? "Beta" : "Default";

    return [
        `Version: ${app.getVersion()}`,
        `Product Name: ${app.getName()}`,
        `Commit: ${p.buildCommit ?? "unknown"}`,
        `Date: ${p.buildDate ?? "unknown"}`,
        `Build Type: ${p.buildType ?? "development"}`,
        `Release Track: ${releaseTrack}`,
        `Electron: ${versions.electron ?? "unknown"}`,
        `Chromium: ${versions.chrome ?? "unknown"}`,
        `Node.js: ${versions.node ?? "unknown"}`,
        `V8: ${versions.v8 ?? "unknown"}`,
        `OS: ${platformDisplay} ${p.arch} ${p.osRelease ?? ""}`,
    ].join("\n");
};

const DetailedInfoModal = memo(({ open, onClose }: DetailedInfoModalProps) => {
    const mainSettings = useAppSelector((state) => state.mainSettings);
    const text = formatBuildInfo(mainSettings?.channel);

    return (
        <TextDisplayModal
            open={open}
            title={window.electron.app.getName()}
            text={text}
            onClose={onClose}
            buttons={[
                {
                    label: "Copy",
                    onClick: () => {
                        window.electron.writeText(text);
                        onClose();
                    },
                },
                {
                    label: "OK",
                    onClick: onClose,
                },
            ]}
        />
    );
});

DetailedInfoModal.displayName = "DetailedInfoModal";

export default DetailedInfoModal;
