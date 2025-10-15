
export interface ApiResponse<T = unknown> {
    success: boolean;
    errorMessage?: string | null | undefined;
    data?: T | null | undefined;
}

