// Type guard для ApiResponse<T>
import type {ApiEnvelope} from "@shared/api/base/baseQuery.ts";

export const isApiResponse = <T = unknown>(v: unknown): v is ApiEnvelope<T> =>
    !!v &&
    typeof v === 'object' &&
    // наличие поля success достаточно, чтобы сузить тип
    'success' in (v as Record<string, unknown>) &&
    typeof (v as Record<string, unknown>).success === 'boolean'