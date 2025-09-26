import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import type {RawPointDto} from "@charts/shared/contracts/chart/Dtos/RawPointDto.ts";

export type MultiRawItemDto = {
    field: FieldDto;
    points: RawPointDto[]
};