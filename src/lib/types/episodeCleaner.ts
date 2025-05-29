export interface EpisodeCleanerRequest {
    urls: string[];
}

export interface EpisodeCleanerResponse {
    deletedUrls: string[];  // URLs that were successfully deleted
    errors: string[];
} 