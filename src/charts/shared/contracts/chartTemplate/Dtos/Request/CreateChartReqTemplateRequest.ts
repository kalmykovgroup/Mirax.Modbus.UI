

export type CreateChartReqTemplateRequest = {
    name: string
    description?: string

    // настройки графиков
    database: string
    entity: string
    timeField: string
    fields: string[]
    filters: Record<string, unknown>
}