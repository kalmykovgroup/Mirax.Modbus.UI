import type {RawPointDto} from "@charts/shared/contracts/chart/Dtos/RawPointDto.ts";
import type {EntityDto} from "@charts/shared/contracts/metadata/Dtos/EntityDto.ts";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";

export type RawSeriesResponse = {
    entity: EntityDto
    field: FieldDto
    timeField: FieldDto
    points: RawPointDto[];

}