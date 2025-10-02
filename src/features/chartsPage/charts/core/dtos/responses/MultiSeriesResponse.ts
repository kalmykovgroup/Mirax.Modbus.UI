import type {EntityDto} from "@chartsPage/metaData/shared/dtos/EntityDto.ts";
import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import type {MultiSeriesItemDto} from "@chartsPage/charts/core/dtos/MultiSeriesItemDto.ts";


export type MultiSeriesResponse = {
    entity: EntityDto
    timeField: FieldDto
    series: MultiSeriesItemDto[]
}

