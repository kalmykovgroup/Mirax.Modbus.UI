import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import type {SeriesBinDto} from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";

export type MultiSeriesItemDto = {
    readonly field: FieldDto;
    readonly bucketMs: number;
    readonly fromMs: number
    readonly toMs: number
    readonly alignedFromMs: number
    readonly alignedToMs: number
    readonly bins: SeriesBinDto[]
}