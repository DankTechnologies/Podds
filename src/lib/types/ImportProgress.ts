export interface ImportProgress {
    current: string;
    success: number;
    total: number;
    failed: string[];
    skipped: number;
} 