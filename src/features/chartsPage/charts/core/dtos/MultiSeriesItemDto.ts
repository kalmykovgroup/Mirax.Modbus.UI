import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import type {SeriesBinDto} from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";

export type MultiSeriesItemDto = {
    field: FieldDto;
    bucketMs: number;
    from: Date
    to: Date
    bins: SeriesBinDto[]
}