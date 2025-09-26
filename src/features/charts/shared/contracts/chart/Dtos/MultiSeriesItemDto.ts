import type {SeriesBinDto} from "@charts/shared/contracts/chart/Dtos/SeriesBinDto.ts";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";


export type MultiSeriesItemDto = { field: FieldDto; bins: SeriesBinDto[] }