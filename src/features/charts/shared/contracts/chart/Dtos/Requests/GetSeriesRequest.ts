
import type {Guid} from "@app/lib/types/Guid.ts";

export type GetSeriesRequest = {
    templateId: Guid

    from: string // ISO
    to: string   // ISO
    px: number

    values?: Record<string, unknown> | undefined;
}