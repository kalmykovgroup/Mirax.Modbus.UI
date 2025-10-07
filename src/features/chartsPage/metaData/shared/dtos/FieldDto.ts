import type {SqlParamType} from "@chartsPage/template/shared/dtos/SqlParamType.ts";

export type FieldDto = {
    name: string;
    type: string;
    isNumeric: boolean;
    isTime: boolean;
    sqlParamType: SqlParamType
}