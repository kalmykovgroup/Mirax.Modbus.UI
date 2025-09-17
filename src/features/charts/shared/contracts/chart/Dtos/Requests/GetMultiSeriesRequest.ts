
import type {Guid} from "@app/lib/types/Guid.ts";

export type GetMultiSeriesRequest = {
    templateId: Guid
    from: string
    to: string
    px: number

    values?: Record<string, unknown> | undefined;
}