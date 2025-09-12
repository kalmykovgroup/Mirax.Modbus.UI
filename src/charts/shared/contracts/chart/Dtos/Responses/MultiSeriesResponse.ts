import type {MultiSeriesItemDto} from "@/charts/shared/contracts/chart/Dtos/MultiSeriesItemDto.ts";

export type MultiSeriesResponse = {
    entity: string
    timeField: string
    bucketSeconds: number
    series: MultiSeriesItemDto[]
}