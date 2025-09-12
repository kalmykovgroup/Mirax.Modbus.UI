import type {SeriesBinDto} from "@shared/contracts/Dtos/Charts/SeriesBinDto.ts";

export type SeriesResponse = {
    entity: string
    field: string
    timeField: string
    bucketSeconds: number
    bins: SeriesBinDto[]
}