import type {MultiSeriesItemDto} from "@charts/shared/contracts/chart/Dtos/MultiSeriesItemDto.ts";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import type {EntityDto} from "@charts/shared/contracts/metadata/Dtos/EntityDto.ts";

export type MultiSeriesResponse = {
    entity: EntityDto
    timeField: FieldDto
    bucketSeconds: number
    series: MultiSeriesItemDto[]
}

