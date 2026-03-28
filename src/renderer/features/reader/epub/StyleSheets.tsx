import { createRendererLogger } from "@utils/logger";
import * as css from "css";
import { memo } from "react";

const log = createRendererLogger("epub/StyleSheets");

const StyleSheets = memo(
    ({ sheets }: { sheets: string[] }) => {
        return (
            <div
                className="stylesheets"
                ref={(node) => {
                    if (node) {
                        sheets.forEach(async (url) => {
                            try {
                                const stylesheet = document.createElement("style");
                                let txt = await window.fs.readFile(url, "utf-8");
                                /** Matches url() with optional quotes; does not require semicolon (handles url() format() in @font-face) */
                                const urlRegex = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^"')]+))\s*\)/gi;
                                txt = txt.replace(urlRegex, (_match, dq, sq, uq) => {
                                    const originalURL = (dq ?? sq ?? uq ?? "").trim();
                                    const resolved = window.path
                                        .join(window.path.dirname(url), originalURL)
                                        .replaceAll("\\", "/");
                                    return `url("file://${resolved}")`;
                                });
                                // to make sure styles don't apply outside
                                // todo, can use scope in latest version of electron
                                const ast = css.parse(txt);
                                /** EPUB injects body.innerHTML into .cont, so body/html don't exist; map them to the content container */
                                const epubRoot = "#EPubReader section.main .cont";
                                const scopeRule = (e: css.Node) => {
                                    if (e.type === "rule") {
                                        (e as css.Rule).selectors = (e as css.Rule).selectors?.map((s) => {
                                            if (s.includes("section.main")) return s;
                                            const withBodyHtml = s.replace(/\b(body|html)\b/gi, epubRoot);
                                            return withBodyHtml !== s ? withBodyHtml : `${epubRoot} ${s}`;
                                        });
                                    } else if (e.type === "media") {
                                        (e as css.Media).rules?.forEach(scopeRule);
                                    }
                                };
                                ast.stylesheet?.rules.forEach(scopeRule);
                                txt = css.stringify(ast);
                                stylesheet.innerHTML = txt;
                                node.appendChild(stylesheet);
                            } catch (e) {
                                log.error(`failed to load stylesheet "${url}"`, e);
                            }
                        });
                    }
                }}
            ></div>
        );
    },
    (prev, next) => JSON.stringify(prev.sheets) === JSON.stringify(next.sheets),
);
StyleSheets.displayName = "StyleSheets";

export default StyleSheets;
