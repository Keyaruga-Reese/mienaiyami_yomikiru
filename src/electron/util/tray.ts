import path from "node:path";
import type { BrowserWindow } from "electron";
import { app, Menu, nativeImage, Tray } from "electron";
import { log } from ".";
import { MainSettings } from "./mainSettings";
import { WindowManager } from "./window";

const TITLE_TRUNCATE_LEN = 50;

export class TrayManager {
    private static tray: Tray | null = null;
    private static lastFocusedWindow: BrowserWindow | null = null;

    private constructor() {
        console.error("This class should not be instantiated.");
    }

    private static createTray(): void {
        if (TrayManager.tray || !app.isReady()) return;
        const image = nativeImage.createFromPath(path.join(app.getAppPath(), "../app.ico"));
        const finalImage = image.isEmpty() ? nativeImage.createEmpty() : image.resize({ width: 16, height: 16 });
        TrayManager.tray = new Tray(finalImage);

        TrayManager.tray.setToolTip(app.name);
        TrayManager.tray.on("click", () => TrayManager.handleTrayClick());

        TrayManager.updateContextMenu();
    }

    private static truncateTitle(title: string): string {
        title = title.replace(`${app.name} - `, "");
        if (title.length <= TITLE_TRUNCATE_LEN) return title;
        return `${title.slice(0, TITLE_TRUNCATE_LEN - 3)}...`;
    }

    private static updateContextMenu(): void {
        if (!TrayManager.tray || TrayManager.tray.isDestroyed()) return;

        const windows = WindowManager.getAllWindows();
        const windowItems: Electron.MenuItemConstructorOptions[] =
            windows.length === 0
                ? [{ label: "(No windows)", enabled: false }]
                : windows.map((w) => ({
                      label: TrayManager.truncateTitle(w.getTitle() || app.name),
                      click: () => {
                          if (!w.isDestroyed()) {
                              if (w.isVisible()) {
                                  w.focus();
                                  return;
                              }
                              w.restore();
                              w.show();
                              w.focus();
                          }
                      },
                  }));

        const template: Electron.MenuItemConstructorOptions[] = [
            {
                label: "Windows",
                enabled: false,
            },
            ...windowItems,
            { type: "separator" },
            {
                label: "Exit",
                click: () => {
                    app.quit();
                },
            },
        ];
        TrayManager.tray.setContextMenu(Menu.buildFromTemplate(template));
    }

    static refreshMenu(): void {
        if (!MainSettings.settings.minimizeToTray || !TrayManager.tray || TrayManager.tray.isDestroyed()) return;
        TrayManager.updateContextMenu();
    }

    private static destroyTray(): void {
        if (TrayManager.tray && !TrayManager.tray.isDestroyed()) {
            TrayManager.tray.destroy();
            TrayManager.tray = null;
        }
        TrayManager.lastFocusedWindow = null;
    }

    private static handleTrayClick(): void {
        const windows = WindowManager.getAllWindows();
        const hidden = windows.filter((w) => !w.isDestroyed() && !w.isVisible());
        // by default start from hidden windows first
        if (hidden.length > 0) {
            const toShow = hidden[hidden.length - 1];
            toShow.restore();
            toShow.show();
            toShow.focus();
            return;
        }
        // if no hidden windows, pick last focused window; it could already be visible
        if (TrayManager.lastFocusedWindow && !TrayManager.lastFocusedWindow.isDestroyed()) {
            if (TrayManager.lastFocusedWindow.isVisible()) {
                TrayManager.lastFocusedWindow.focus();
                return;
            }
            TrayManager.lastFocusedWindow.restore();
            TrayManager.lastFocusedWindow.show();
            TrayManager.lastFocusedWindow.focus();
            return;
        }
        const visible = windows.filter((w) => !w.isDestroyed() && w.isVisible());
        const toFocus = visible[visible.length - 1];
        if (toFocus) {
            toFocus.focus();
        }
    }

    static initialize(): void {
        if (MainSettings.settings.minimizeToTray) {
            TrayManager.createTray();
            log.log("Tray: initialized (minimizeToTray enabled)");
        }
    }

    static setMinimizeToTray(enabled: boolean): void {
        if (enabled) {
            TrayManager.createTray();
        } else {
            TrayManager.destroyTray();
        }
    }

    static setupWindowListeners(window: BrowserWindow): void {
        window.on("minimize", () => {
            if (MainSettings.settings.minimizeToTray) {
                window.hide();
                TrayManager.refreshMenu();
            }
        });
        window.on("focus", () => {
            TrayManager.lastFocusedWindow = window;
        });
        window.webContents.on("page-title-updated", () => {
            TrayManager.refreshMenu();
        });
        TrayManager.refreshMenu();
    }
}
