import type {FieldDto} from "@charts/metaData/shared/dtos/FieldDto.ts";
import type {SeriesBinDto} from "@charts/charts/shared/dtos/SeriesBinDto.ts";

export type MultiSeriesItemDto = {
    field: FieldDto;
    bucketMs: number;
    from: Date
    to: Date
    bins: SeriesBinDto[]
}