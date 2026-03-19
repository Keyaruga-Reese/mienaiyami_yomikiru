/**
 * Extracts chapter number from chapter name string.
 *
 * Supported prefixes (case-insensitive):
 * - chapter: "chapter 1", "chapter 123 asd", "chapter 1123.33as"
 * - ch: "ch. 1", "ch1", "ch 1"
 * - c: "c 1", "c1"
 * - part: "part 1"
 * - pt: "pt. 1", "pt1"
 * - episode: "episode 1"
 * - ep: "ep 1", "ep1"
 *
 * With separators (space, dot, underscore, hyphen) before number:
 * - "uploader_ch.1", "uploader-ch.1"
 */
export function processChapterNumber(chapterName: string): number | undefined {
    const regex = /(^| |\.|_|-)((chapter|(c(h)?)|(p(t)?(art)?)|(ep(isode)?))((\s)?(-|_|\.)?(\s)?)?(?<main>\d+))/gi;
    const results = [...chapterName.matchAll(regex)];
    if (results.length === 0) return;
    const result = results[0].groups?.main;
    if (!result) return;
    const chapterNumber = parseInt(result);
    if (isNaN(chapterNumber)) return;
    return chapterNumber;
}
