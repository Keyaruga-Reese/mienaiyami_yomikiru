> [!Note]
> **Community Discord Server**: A Discord server for Yomikiru and Collection Extension is now open. Join for discussions, usage help, feedback, and updates. See [Discussion #495](https://github.com/mienaiyami/yomikiru/discussions/495).
>
<!-- 
> [!Note]
> To keep getting beta updates, check the beta update channel in settings after downloading the beta version.
>
> **Please report any issues you encounter with the beta tag so stable version can be released faster.** -->

> [!Important]
> **Known Issue with Updates (July 2025)**: Due to recent Windows security policy changes, some users may experience crashes during the auto-update process. If updates fail, please:
>
> 1. Download the latest version manually from the releases page
> 2. Install it over your existing installation
>
> Issue is only present to users using "Setup" version.
> For more information, see #451

# 2.23.2-beta

### 2.23.2-beta.6

- feat: add reader settings presets for manga and book (#281). Switch between reading modes (e.g. 2-page LTR manga vs vertical-scroll manhwa). Supports export/import, save from clipboard, keybinds to cycle/select presets (alt+1-5, alt+period/comma), and reorder presets via up/down buttons.
- feat: add reading background settings for book (EPUB) reader (#399). Wallpaper image with dim, brightness, contrast, layer overlay, and padding. Background layers stay fixed when zooming text.
- feat: add manual chapter tracking for book (EPUB) via Anilist (#379). Search manga and novels, edit progress, and auto-update based on chapter.
- feat: support mouse buttons 4 and 5 in key bindings (#393). Default bindings: mouse 4 for previous page, mouse 5 for next page.
- feat: add optional single-instance behavior via Use Existing Window (#490). When enabled, second launch focuses the existing window and opens files in it; when disabled, opens in a new window. Toggle in General Settings (all platforms).
- feat(settings): add Detailed Info dialog to About. Shows build commit, build date, build type, and OS release.
- fix: correct CSS URL handling and body/html selector scoping in book (EPUB) reader (#488). Fixes url() in @font-face and proper mapping of body/html selectors to the content container.
- fix: arch linux build entry in release markdown.

### 2.23.2-beta (earlier builds)

- feat: add arch linux support for auto-updates.
- fix: chapter list not refreshing after mark read/unread (#486) (#500) by @jaathavan18

### 2.23.1

<https://github.com/mienaiyami/yomikiru/releases/tag/v2.23.1>
