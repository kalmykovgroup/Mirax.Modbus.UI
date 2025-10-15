import type {ApiResponse} from "@/baseShared/dtos/ApiResponse.ts";

export const isApiResponse = <T = unknown>(v: unknown): v is ApiResponse<T> =>
    !!v &&
    typeof v === 'object' &&
    'success' in (v as Record<string, unknown>) &&
    typeof (v as Record<string, unknown>).success === 'boolean';