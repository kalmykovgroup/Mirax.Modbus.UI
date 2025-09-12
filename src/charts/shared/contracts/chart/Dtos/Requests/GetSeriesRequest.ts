export type GetSeriesRequest = {
    entity: string
    field: string
    timeField?: string | undefined
    from: string // ISO
    to: string   // ISO
    px: number
    filters?: Record<string, unknown> | undefined
}