import type {EntityDto} from "@charts/shared/contracts/metadata/Dtos/EntityDto.ts";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import type {MultiRawItemDto} from "@charts/shared/contracts/chart/Dtos/MultiRawItemDto.ts";

export type MultiRawResponse = {
    entity: EntityDto; // Адаптируйте по контракту
    timeField: FieldDto;
    series: MultiRawItemDto[];
};