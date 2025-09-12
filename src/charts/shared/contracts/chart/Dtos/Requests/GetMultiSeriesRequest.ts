export type GetMultiSeriesRequest = {
    entity: string
    fields: string[]
    timeField?: string | undefined
    from: string
    to: string
    px: number
    filters?: Record<string, unknown> | undefined
}