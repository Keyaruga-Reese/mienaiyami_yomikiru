import { dialogUtils } from "./dialog";
import { getStorageItem, setStorageItem } from "./localStorage";

export default class AniList {
    static #token = "";
    static displayAdultContent = false;
    static #currentMangaListId = null as null | number;
    static #mutation = `#graphql
    mutation($mediaId: Int, $id: Int,$status:MediaListStatus, $score:Float, $progress:Int, $repeat:Int, $startedAt: FuzzyDateInput, $completedAt:FuzzyDateInput, $progressVolumes:Int, $private:Boolean){
      SaveMediaListEntry(mediaId:$mediaId, id:$id,status:$status, score:$score,  progress:$progress,  repeat:$repeat,  startedAt:$startedAt,   completedAt:$completedAt, progressVolumes:$progressVolumes, private:$private  ){
        id
        mediaId
        status
        progress
        progressVolumes
        score
        repeat
        private
        startedAt{
            year
            month
            day
        }
        completedAt{
            year
            month
            day
        }
        media{
          title{
            english
            romaji
            native
          }
          coverImage{
            medium
          }
          bannerImage
          siteUrl
        }
      }
    }
    `;

    static {
        // for first launch
        if (AniList.getStorageToken() === null) AniList.setStorageToken("");
        if (AniList.loadTrackingFromStorage().length === 0) AniList.setStorageTracking([]);

        const token = AniList.getStorageToken() || "";
        AniList.#token = token;
        if (token)
            AniList.checkToken(token).then((e) => {
                if (!e && e !== undefined)
                    dialogUtils.customError({
                        message:
                            "Unable to login to AniList. If persists, try logging in again using different token.",
                    });
            });
    }
    private constructor() {
        throw new Error("Cannot instantiate static class");
    }
    static setToken(token: string) {
        AniList.#token = token;
    }

    static getStorageToken(): string | null {
        const value = getStorageItem("ANILIST_TOKEN");
        return value || null;
    }

    static setStorageToken(token: string) {
        setStorageItem("ANILIST_TOKEN", token);
    }

    static setStorageTracking(tracking: Anilist.TrackStore) {
        setStorageItem("ANILIST_TRACKING", JSON.stringify(tracking));
    }

    static loadTrackingFromStorage(): Anilist.TrackStore {
        try {
            const tracking = JSON.parse(getStorageItem("ANILIST_TRACKING") || "[]") as Anilist.TrackStore;
            return tracking.filter((e) => window.fs.existsSync(e.localURL));
        } catch (e) {
            console.error(e);
            return [];
        }
    }
    static setCurrentMangaListId(id: null | number) {
        AniList.#currentMangaListId = id;
    }
    static async checkToken(token: string) {
        const query = `#graphql
    query{
        Viewer{
                name
                options{
                    displayAdultContent
                }
        }
    }
    `;
        const body = JSON.stringify({
            query,
        });
        try {
            const raw = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body,
            });
            if (raw.ok) {
                const json = await raw.json();
                AniList.displayAdultContent = json.data.Viewer.options.displayAdultContent;
            }
            return raw.ok;
        } catch (reason) {
            dialogUtils.customError({ message: "Unable to make request to AniList server." });
            window.logger.error(`AniList::checkToken:\n${reason}`);
        }
    }
    static async fetch(query: string, variables = {}) {
        if (!AniList.#token) {
            window.logger.error("AniList::fetch: user not logged in.");
            return;
        }
        try {
            const body = JSON.stringify({
                query,
                variables,
            });

            const raw = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${AniList.#token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body,
            });
            if (raw.ok) {
                const json = await raw.json();
                return json.data;
            } else {
                window.logger.error("AniList::fetch: response not ok.");
                const json = await raw.json();
                if (json) {
                    window.logger.error(json);
                    if (json.errors.message === "Invalid token")
                        dialogUtils.customError({
                            message: "AniList: Invalid token",
                            detail: "Try logging out and in again.",
                        });
                }
            }
        } catch (reason) {
            window.logger.error(`AniList::fetch:\n${reason}`);
        }
    }
    static async getUserName() {
        const query = `#graphql
        query{
            Viewer{
                    name
            }
        }
        `;
        const data = await AniList.fetch(query);
        if (data) return data.Viewer.name;
        else return "Error";
    }
    static getVariables(variables: object) {
        return AniList.displayAdultContent ? { ...variables } : { ...variables, displayAdultContent: false };
    }
    /**
     * Search manga and novels on Anilist.
     * @param name search term in `English` or `Romaji`
     * @returns media items (manga and novels), excludes unreleased
     */
    static async searchMedia(name: string): Promise<Anilist.SearchMediaItem[]> {
        if (!name) return [];
        const query = `#graphql
        query($search: String,$displayAdultContent: Boolean){
            Page(page: 1, perPage: 20){
                media(search: $search, type: MANGA, sort: POPULARITY_DESC, status_not: NOT_YET_RELEASED, isAdult:$displayAdultContent ){
                    id
                    title{
                      english
                      romaji
                      native
                    }
                    startDate{
                        year
                        month
                        day
                    }
                    format
                    coverImage{
                        medium
                    }
                    status(version: 2)
                }
            }
        }
        `;
        const variables = AniList.getVariables({
            search: name,
        });
        const data = await AniList.fetch(query, variables);
        if (data) return (data.Page.media ?? []) as Anilist.SearchMediaItem[];
        return [];
    }
    static async getMangaData(mediaId: number) {
        const variables = AniList.getVariables({ mediaId });
        const data = await AniList.fetch(AniList.#mutation, variables);
        if (data) {
            return data.SaveMediaListEntry as Anilist.MangaData;
        }
    }
    static async setCurrentMangaData(newData: Omit<Anilist.MangaData, "id" | "mediaId" | "media">) {
        if (!AniList.#currentMangaListId) {
            window.logger.error("AniList::setCurrentMangaStatus: currentMangaListId not defined.");
            return;
        }
        const variables = AniList.getVariables({ id: AniList.#currentMangaListId, ...newData });
        const data = await AniList.fetch(AniList.#mutation, variables);
        if (data) {
            return data.SaveMediaListEntry as Anilist.MangaData;
        }
    }
    static async setCurrentMangaProgress(progress: Anilist.MangaData["progress"]) {
        if (!AniList.#currentMangaListId) {
            window.logger.error("AniList::setCurrentMangaProgress: currentMangaListId not defined.");
            return;
        }
        const variables = AniList.getVariables({ id: AniList.#currentMangaListId, progress });
        const data = await AniList.fetch(AniList.#mutation, variables);
        if (data) {
            return data.SaveMediaListEntry as Anilist.MangaData;
        }
    }
}

/** Human-readable labels for Anilist media format values. */
export const ANILIST_FORMAT_LABEL: Record<Anilist.MediaFormat, string> = {
    MANGA: "Manga",
    NOVEL: "Novel",
    LIGHT_NOVEL: "Light Novel",
    ONE_SHOT: "One Shot",
    MANHWA: "Manhwa",
    MANHUA: "Manhua",
    DOUJINSHI: "Doujinshi",
    OEL: "OEL",
};

/** Human-readable labels for Anilist media status values. */
export const ANILIST_STATUS_LABEL: Record<Anilist.MediaStatus, string> = {
    FINISHED: "Finished",
    RELEASING: "Releasing",
    CANCELLED: "Cancelled",
    HIATUS: "Hiatus",
    NOT_YET_RELEASED: "Not Yet Released",
};
