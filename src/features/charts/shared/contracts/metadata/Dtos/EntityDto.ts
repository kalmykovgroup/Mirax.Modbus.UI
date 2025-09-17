import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";

export type EntityDto = {
    name: string
    fields: FieldDto[]
}