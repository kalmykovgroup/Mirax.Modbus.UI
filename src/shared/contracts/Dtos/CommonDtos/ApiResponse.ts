
export interface ApiResponse<T> {
    success: boolean;
    errorMessage?: string | null;
    data?: T | null | undefined;
}

export interface ApiResponse<T = object> {
    success: boolean;
    errorMessage?: string | null;
    data?: T | null | undefined;
}

