import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { AppUpdateChannel } from "@common/types/ipc";
import { exec as execSudo } from "@vscode/sudo-prompt";
import * as crossZip from "cross-zip";
import { app, BrowserWindow, dialog, shell } from "electron";
import * as electronDl from "electron-dl";
import fetch from "electron-fetch";
import logger from "electron-log";
import * as semver from "semver";
import { IS_PORTABLE, isArchLinux, sleep } from "./util";

declare const DOWNLOAD_PROGRESS_WEBPACK_ENTRY: string;

const argReleaseUrl = process.argv.find((e) => e.startsWith("--release-url="))?.split("=")[1];
const argReleasePage = process.argv.find((e) => e.startsWith("--release-page="))?.split("=")[1];

const REPO = "mienaiyami/yomikiru";

const ANNOUNCEMENTS_URL = `https://raw.githubusercontent.com/${REPO}/master/announcements.txt` as const;
const ANNOUNCEMENTS_DISCUSSION_URL = `https://github.com/${REPO}/discussions/categories/announcements` as const;
const RELEASES_URL = argReleaseUrl || (`https://api.github.com/repos/${REPO}/releases` as const);
const RELEASES_PAGE = argReleasePage || (`https://github.com/${REPO}/releases` as const);
const DOWNLOAD_LINK = `${RELEASES_PAGE}/download` as const;

type ArtifactMetadata = {
    name: string;
    platform: string;
    arch: string;
    type: string;
};

/**
 * Fetches artifacts.json from the release and returns the download URL for the current platform/arch.
 * @param version release tag (e.g. "v2.3.8")
 * @returns download URL or null if no matching artifact
 */
const getArtifactDownloadUrl = async (version: string): Promise<string | null> => {
    try {
        const url = version.startsWith("v") ? version : `v${version}`;
        const artifactsUrl = `${DOWNLOAD_LINK}/${url}/artifacts.json`;
        const res = await fetch(artifactsUrl);
        if (!res.ok) {
            logger.warn("Failed to fetch artifacts.json:", res.status, res.statusText);
            return null;
        }
        const artifacts = (await res.json()) as ArtifactMetadata[];
        if (!Array.isArray(artifacts) || artifacts.length === 0) {
            logger.warn("artifacts.json empty or invalid");
            return null;
        }
        const platform = process.platform as string;
        const arch = process.arch === "ia32" ? "ia32" : process.arch === "x64" ? "x64" : process.arch;
        const wantPortable = platform === "win32" && IS_PORTABLE;
        const wantType = wantPortable ? "portable" : platform === "win32" ? "installer" : "package";

        let match: ArtifactMetadata | null = null;
        if (platform === "win32") {
            match =
                artifacts.find((a) => a.platform === "win32" && a.type === wantType && a.arch === arch) ?? null;
        } else if (platform === "linux") {
            if (isArchLinux()) {
                match = artifacts.find((a) => a.platform === "linux" && a.name.endsWith(".pkg.tar.zst")) ?? null;
            } else {
                match = artifacts.find((a) => a.platform === "linux" && a.name.endsWith(".deb")) ?? null;
            }
        }

        if (!match) {
            logger.warn("No matching artifact in artifacts.json for", { platform, arch, wantType });
            return null;
        }
        return `${DOWNLOAD_LINK}/${url}/${match.name}`;
    } catch (error) {
        logger.error("getArtifactDownloadUrl:", error);
        return null;
    }
};

const checkForAnnouncements = async () => {
    try {
        await sleep(5000);
        const raw = await fetch(ANNOUNCEMENTS_URL)
            .then((data) => data.text())
            .then((data) => data.split("\n").filter((e) => e !== ""));
        const existingPath = path.join(app.getPath("userData"), "announcements.txt");
        if (!fs.existsSync(existingPath)) {
            fs.writeFileSync(existingPath, "");
        }
        const existing = fs
            .readFileSync(path.join(app.getPath("userData"), "announcements.txt"), "utf-8")
            .split("\n")
            .filter((e) => e !== "");
        const newAnnouncements = raw.filter((e) => !existing.includes(e));
        fs.writeFileSync(existingPath, raw.join("\n"));
        if (newAnnouncements.length === 1)
            dialog
                .showMessageBox({
                    type: "info",
                    title: "New Announcement",
                    message: "There's a new announcement. Check it out!",
                    detail: newAnnouncements[0],
                    buttons: ["Show", "Dismiss"],
                    cancelId: 1,
                })
                .then((res) => {
                    if (res.response === 0) shell.openExternal(newAnnouncements[0]);
                });
        else if (newAnnouncements.length > 1)
            dialog
                .showMessageBox({
                    type: "info",
                    title: "New Announcements",
                    message: "There are new announcements. Check them out!",
                    detail: newAnnouncements.join("\n"),
                    buttons: ["Open Each", "Open Announcement Page", "Dismiss"],
                    cancelId: 2,
                })
                .then((res) => {
                    if (res.response === 0) newAnnouncements.forEach((e) => void shell.openExternal(e));
                    else if (res.response === 1) shell.openExternal(ANNOUNCEMENTS_DISCUSSION_URL);
                });
    } catch (error) {
        logger.error("checkForAnnouncements:", error);
    }
};

/**
 * Check for updates and handle version comparison properly using semver
 * @param windowId id of window in which message box should be shown
 * @param skipPatch skip patch updates for stable channel (e.g. 1.2.x to 1.2.y)
 * @param promptAfterCheck show message box if current version is same as latest version
 * @param autoDownload automatically download updates if available
 * @param channel update channel to check (stable or beta)
 */
const checkForUpdate = async (
    windowId: number,
    channel: AppUpdateChannel,
    skipPatch = false,
    promptAfterCheck = false,
    autoDownload = false,
): Promise<void> => {
    checkForAnnouncements();

    try {
        const rawdata = await fetch(RELEASES_URL).then((data) => data.json());

        if (!Array.isArray(rawdata) || rawdata.length === 0) {
            logger.log("No releases found or invalid response");
            if (promptAfterCheck) {
                showNoReleasesMessage(windowId, channel);
            }
            return;
        }

        const currentVersion = app.getVersion();
        logger.log("Current version:", currentVersion);

        const releases = rawdata
            .filter((release: any) => {
                const hasValidTagName =
                    typeof release.tag_name === "string" && semver.clean(release.tag_name, { loose: true });
                if (!hasValidTagName) return false;

                if (channel === "stable") {
                    return !release.prerelease;
                } else if (channel === "beta") {
                    // include all releases, the highest version will be selected later
                    return true;
                }
                return false;
            })
            .sort((a: any, b: any) => {
                const versionA = semver.clean(a.tag_name, { loose: true }) || "";
                const versionB = semver.clean(b.tag_name, { loose: true }) || "";
                return semver.rcompare(versionA, versionB);
            });

        if (releases.length === 0) {
            logger.log(`No ${channel} releases found.`);
            if (promptAfterCheck) {
                showNoReleasesMessage(windowId, channel);
            }
            return;
        }

        const latestRelease = releases[0];
        const latestVersion = semver.clean(latestRelease.tag_name, { loose: true }) || "";

        logger.log(`Latest ${channel} version:`, latestVersion);

        const versionDiff = semver.diff(currentVersion, latestVersion);
        const isNewer = semver.gt(latestVersion, currentVersion);

        if (skipPatch && channel === "stable" && versionDiff === "patch") {
            logger.log(`${versionDiff} update available, skipping due to settings.`);
            return;
        }

        if (isNewer) {
            if (autoDownload) {
                downloadUpdates(latestVersion, windowId, true);
            } else {
                showUpdateAvailableMessage(windowId, currentVersion, latestVersion, versionDiff);
            }
            return;
        }

        logger.log("Running latest version.");
        if (promptAfterCheck) {
            const window = BrowserWindow.fromId(windowId ?? 1)!;
            dialog.showMessageBox(window, {
                type: "info",
                title: "Yomikiru",
                message: "Running latest version",
                buttons: [],
            });
        }
    } catch (error) {
        logger.error("Error checking for updates:", error);
        if (promptAfterCheck) {
            const window = BrowserWindow.fromId(windowId ?? 1)!;
            dialog.showMessageBox(window, {
                type: "error",
                title: "Update Check Failed",
                message: "Failed to check for updates.",
                detail: error instanceof Error ? error.message : String(error),
            });
        }
    }
};

/**
 * Show message when no releases are found
 */
const showNoReleasesMessage = (windowId: number, channel: string) => {
    const window = BrowserWindow.fromId(windowId ?? 1)!;
    dialog.showMessageBox(window, {
        type: "info",
        title: "Yomikiru",
        message: `No ${channel} releases available.`,
        buttons: [],
    });
};

const showUpdateAvailableMessage = (
    windowId: number,
    currentVersion: string,
    latestVersion: string,
    versionDiff: string | null,
) => {
    const window = BrowserWindow.fromId(windowId ?? 1)!;

    const skipPatchHint =
        versionDiff === "patch"
            ? `To skip check for patch updates, enable "skip patch update" in settings.\nYou can also enable "auto download".`
            : "";

    dialog
        .showMessageBox(window, {
            type: "info",
            title: "New Version Available",
            message: `Current Version : ${currentVersion}\n` + `Latest Version   : ${latestVersion}`,
            detail: skipPatchHint,
            buttons: ["Download Now", "Download and show Changelog", "Show Changelog", "Download Later"],
            cancelId: 3,
        })
        .then((response) => {
            if (response.response === 0) downloadUpdates(latestVersion, windowId);
            if (response.response === 1) {
                downloadUpdates(latestVersion, windowId);
                shell.openExternal(RELEASES_PAGE);
            }
            if (response.response === 2) {
                shell.openExternal(RELEASES_PAGE);
            }
        });
};

/**
 * Download and prepare updates for installation
 * @param latestVersion latest version ex. "2.3.8"
 * @param windowId id of window in which message box should be shown
 * @param silent if true, don't show download progress window
 */
const downloadUpdates = (latestVersion: string, windowId: number, silent = false) => {
    const newWindow =
        !silent &&
        new BrowserWindow({
            width: 560,
            height: 160,
            resizable: false,
            backgroundColor: "#272727",
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                // enableRemoteModule: true,
                webSecurity: app.isPackaged,
                safeDialogs: true,
            },
            maximizable: false,
        });

    let downloadItem: Electron.DownloadItem | null = null;
    let isClosingDownloadWindowProgrammatically = false;
    if (newWindow) {
        newWindow.loadURL(DOWNLOAD_PROGRESS_WEBPACK_ENTRY);
        newWindow.setMenuBarVisibility(false);
        newWindow.webContents.once("dom-ready", () => {
            newWindow.webContents.send("version", latestVersion);
        });
        newWindow.on("close", () => {
            if (isClosingDownloadWindowProgrammatically) {
                return;
            }
            logger.log("Download window closed by user, canceling update download...");
            downloadItem?.cancel();
        });
    }

    const window = BrowserWindow.fromId(windowId ?? 1)!;
    const tempPath = path.join(app.getPath("temp"), `yomikiru updates ${new Date().toDateString()}`);
    if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { recursive: true, force: true });
    fs.mkdirSync(tempPath);
    let setupInstallOnQuit: (() => void) | null = null;
    let performInstallNow: (() => void) | null = null;

    const promptInstall = () => {
        if (newWindow instanceof BrowserWindow) {
            isClosingDownloadWindowProgrammatically = true;
            newWindow.close();
        }

        const showMainPrompt = () => {
            const buttons = ["Install Now", "Install on Quit"];
            if (silent) buttons.push("Install and Show Changelog");
            dialog
                .showMessageBox(window, {
                    type: "info",
                    title: "Updates downloaded",
                    message: "Updates downloaded.",
                    buttons,
                    cancelId: 1,
                })
                .then((res) => {
                    if (res.response === 0) {
                        performInstallNow?.();
                    }
                    if (res.response === 1) {
                        setupInstallOnQuit?.();
                    }
                    if (res.response === 2) {
                        shell.openExternal(RELEASES_PAGE);
                        performInstallNow?.();
                    }
                });
        };

        // https://github.com/mienaiyami/yomikiru/discussions/451#discussioncomment-13778852
        if (process.platform === "win32" && !IS_PORTABLE) {
            dialog
                .showMessageBox(window, {
                    type: "warning",
                    title: "Update Installation Notice",
                    message: "Due to recent Windows security changes, auto-updates might fail.",
                    detail: `You can either proceed with normal installation (which might fail) or install manually (just run the downloaded file).`,
                    buttons: [
                        "Try Normal Installation",
                        "Install Manually (Recommended, show downloaded file)",
                        "Install Manually and Show Changelog",
                        "More Info",
                    ],
                    cancelId: 1,
                })
                .then((res) => {
                    if (res.response === 0) {
                        showMainPrompt();
                    } else if (res.response === 1) {
                        shell.openPath(tempPath);
                    } else if (res.response === 2) {
                        shell.openPath(tempPath);
                        shell.openExternal(RELEASES_PAGE);
                    } else if (res.response === 3) {
                        shell.openExternal(
                            "https://github.com/mienaiyami/yomikiru/discussions/451#discussioncomment-13778852",
                        );
                    }
                });
        } else {
            showMainPrompt();
        }
    };
    const downloadFile = (
        dl: string,
        webContents: Electron.WebContents | false,
        callback: (file: electronDl.File) => void,
    ) => {
        electronDl
            .download(window, dl, {
                directory: tempPath,
                onStarted: (e) => {
                    downloadItem = e;
                    logger.log("Downloading updates...");
                    logger.log(dl, `"${tempPath}"`);
                    e.once("done", (_, state) => {
                        if (state !== "completed") {
                            dialog.showMessageBox(window, {
                                type: "error",
                                title: "Error while downloading",
                                message: state === "cancelled" ? "Download canceled." : "Download failed.",
                            });
                        }
                    });
                },
                onCancel: () => {
                    downloadItem = null;
                    logger.log("Download canceled.");
                },
                onCompleted: (file) => {
                    downloadItem = null;
                    callback(file);
                },
                onProgress: (progress) => {
                    webContents && !webContents.isDestroyed() && webContents.send("progress", progress);
                },
            })
            .catch((e) => {
                downloadItem = null;
                dialog.showMessageBox(window, {
                    type: "error",
                    title: "Error while downloading",
                    message: `${e}\n\nPlease check the homepage if persist.`,
                });
            });
    };

    const webContents = newWindow instanceof BrowserWindow ? newWindow.webContents : false;

    void (async () => {
        const dl = await getArtifactDownloadUrl(latestVersion);
        if (!dl) {
            logger.error("Could not resolve update artifact from artifacts.json");
            dialog
                .showMessageBox(window, {
                    type: "error",
                    title: "Update Failed",
                    message:
                        "Could not find update file for this platform. Please download manually from the releases page.",
                    buttons: ["Open Releases", "OK"],
                })
                .then((res) => {
                    if (res.response === 0) shell.openExternal(RELEASES_PAGE);
                });
            return;
        }

        if (process.platform === "win32") {
            if (IS_PORTABLE) {
                const extractPath = path.join(tempPath, "updates");
                if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath);

                downloadFile(dl, webContents, (file) => {
                    logger.log(`${file.filename} downloaded.`);
                    crossZip.unzip(file.path, extractPath, (err) => {
                        if (err) return logger.error(err);
                        logger.log(`Successfully extracted at "${extractPath}"`);
                        const appPath = path.join(app.getAppPath(), "../../");
                        const appDirName = path.join(app.getPath("exe"), "../");
                        setupInstallOnQuit = () => {
                            app.once("quit", () => {
                                logger.log("Installing updates...");
                                logger.log(`Moving files to "${appPath}"`);
                                spawn(
                                    `cmd.exe /c start powershell.exe " Write-Output 'Starting update...' ; Start-Sleep -Seconds 5.0 ;` +
                                        ` $sourcePath = Join-Path '${extractPath}' '*' ; ` +
                                        ` $destPath = '${appDirName}' ; ` +
                                        ` Get-ChildItem -Path $destPath -Recurse -Force | Where-Object { $_.FullName -notmatch 'userdata'} | Remove-Item -Force -Recurse ; ` +
                                        ` Write-Output 'Moving extracted files...' ; Start-Sleep -Seconds 1.9 ; ` +
                                        ` Copy-Item -Path $sourcePath -Destination $destPath -Force -Recurse ; ` +
                                        ` Write-Output 'Updated, launching app.' ; Start-Sleep -Seconds 2.0 ; ` +
                                        ` & '${app.getPath("exe")}' ; "`,
                                    { shell: true, cwd: appDirName },
                                ).on("exit", process.exit);
                                logger.log("Quitting app...");
                            });
                            logger.log("Will install updates on quit.");
                        };
                        performInstallNow = () => {
                            setupInstallOnQuit?.();
                            logger.log("Preparing to install updates now...");
                            app.quit();
                        };
                        logger.log("Updates ready. Waiting for user choice.");
                        promptInstall();
                    });
                });
            } else {
                downloadFile(dl, webContents, (file) => {
                    logger.log(`${file.filename} downloaded.`);
                    setupInstallOnQuit = () => {
                        app.once("quit", () => {
                            logger.log("Installing updates...");
                            spawn(
                                `cmd.exe /c start powershell.exe "Write-Output 'Starting update...' ; Start-Sleep -Seconds 5.0 ; Start-Process '${file.path}'"`,
                                {
                                    shell: true,
                                },
                            ).on("exit", process.exit);
                            logger.log("Quitting app...");
                        });
                        logger.log("Will install updates on quit.");
                    };
                    performInstallNow = () => {
                        setupInstallOnQuit?.();
                        logger.log("Preparing to install updates now...");
                        app.quit();
                    };
                    logger.log("Updates ready. Waiting for user choice.");
                    promptInstall();
                });
            }
        } else if (process.platform === "linux") {
            /**
             * Installs a Linux package via sudo prompt.
             * Note: we avoid throwing inside callbacks to prevent crashing the app.
             */
            const installWithSudo = (command: string): Promise<void> =>
                new Promise((resolve, reject) => {
                    logger.log("Linux update install command (sudo):", command);
                    execSudo(command, { name: "Yomikiru" }, (err) => {
                        if (err) {
                            logger.error("Linux update install failed:", err);
                            reject(err);
                            return;
                        }
                        logger.log("Linux update install completed.");
                        resolve();
                    });
                });

            const relaunchAndQuit = () => {
                logger.log("Relaunching app after update install...");
                app.relaunch();
                app.quit();
            };

            const showInstallError = (err: unknown) => {
                dialog.showMessageBox(window, {
                    type: "error",
                    title: "Update Installation Failed",
                    message: "Failed to install the update.",
                    detail: err instanceof Error ? err.message : String(err),
                    buttons: ["OK"],
                });
            };

            const afterDownload = (file: { filename: string; path: string }) => {
                logger.log(`Update package downloaded: ${file.filename}`);
                if (newWindow instanceof BrowserWindow) {
                    isClosingDownloadWindowProgrammatically = true;
                    newWindow.close();
                }

                const cmd = isArchLinux() ? `pacman -U --noconfirm "${file.path}"` : `dpkg -i "${file.path}"`;
                setupInstallOnQuit = () => {
                    app.once("before-quit", () => {
                        void installWithSudo(cmd).catch(showInstallError);
                    });
                    logger.log(`Will install updates on quit (linux/${isArchLinux() ? "arch" : "deb"}).`);
                };
                performInstallNow = () => {
                    void (async () => {
                        try {
                            await installWithSudo(cmd);
                            relaunchAndQuit();
                        } catch (err) {
                            showInstallError(err);
                        }
                    })();
                };

                logger.log("Linux updates ready. Waiting for user choice.");
                promptInstall();
            };

            downloadFile(dl, webContents, afterDownload);
        }
    })();
};

export default checkForUpdate;
