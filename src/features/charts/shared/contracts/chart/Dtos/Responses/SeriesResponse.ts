import type {SeriesBinDto} from "@charts/shared/contracts/chart/Dtos/SeriesBinDto.ts";

export type SeriesResponse = {
    entity: string
    field: string
    timeField: string
    bucketSeconds: number
    bins: SeriesBinDto[]
}