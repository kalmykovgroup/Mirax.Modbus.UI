import type {EntityDto} from "@charts/metaData/shared/dtos/EntityDto.ts";
import type {FieldDto} from "@charts/metaData/shared/dtos/FieldDto.ts";
import type {MultiSeriesItemDto} from "@charts/charts/shared/dtos/MultiSeriesItemDto.ts";


export type MultiSeriesResponse = {
    entity: EntityDto
    timeField: FieldDto
    series: MultiSeriesItemDto[]
}

