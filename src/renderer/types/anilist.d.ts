declare namespace Anilist {
    type MediaFormat =
        | "MANGA"
        | "NOVEL"
        | "ONE_SHOT"
        | "MANHWA"
        | "MANHUA"
        | "DOUJINSHI"
        | "OEL"
        | "LIGHT_NOVEL";

    type MediaStatus = "FINISHED" | "RELEASING" | "CANCELLED" | "HIATUS" | "NOT_YET_RELEASED";

    type SearchMediaItem = {
        id: number;
        title: {
            english: string | null;
            romaji: string | null;
            native: string | null;
        };
        startDate: {
            year: number | null;
            month: number | null;
            day: number | null;
        };
        format: MediaFormat;
        coverImage: {
            medium: string;
        };
        status: MediaStatus;
    };

    type TrackItem = {
        localURL: string;
        anilistMediaId: number;
    };
    type TrackStore = TrackItem[];
    type MangaData = {
        id: number;
        mediaId: number;
        status: "CURRENT" | "PLANNING" | "COMPLETED" | "DROPPED" | "PAUSED" | "REPEATING";
        progress: number;
        progressVolumes: number;
        score: number;
        repeat: number;
        private: boolean;
        startedAt: {
            year: number | null;
            month: number | null;
            day: number | null;
        };
        completedAt: {
            year: number | null;
            month: number | null;
            day: number | null;
        };
        media: {
            title: {
                english: string;
                romaji: string;
                native: string;
            };
            coverImage: {
                medium: string;
            };
            bannerImage: string;
            siteUrl: string;
        };
    };
}
