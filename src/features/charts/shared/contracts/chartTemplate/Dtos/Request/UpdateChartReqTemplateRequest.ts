import type {Guid} from "@app/lib/types/Guid.ts";

export type UpdateChartReqTemplateRequest = {
    id: Guid;
    name: string
    description?: string

    // настройки графиков
    database: string
    entity: string
    timeField: string
    fields: string[]
    filters: Record<string, unknown>
}