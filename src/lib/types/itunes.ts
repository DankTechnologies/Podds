export interface ITunesPodcast {
    collectionId: number;
    collectionName: string;
    feedUrl: string;
    artistName: string;
    artworkUrl600: string;
    primaryGenreName: string;
    releaseDate: string;
    country: string;
    trackCount: number;
}

export interface ITunesEpisode {
    trackId: number;
    trackName: string;
    collectionId: number;
    collectionName: string;
    artistName: string;
    releaseDate: string;
    description: string;
    episodeUrl: string;
    feedUrl: string;
    artworkUrl600: string;
    trackTimeMillis?: number;
}
