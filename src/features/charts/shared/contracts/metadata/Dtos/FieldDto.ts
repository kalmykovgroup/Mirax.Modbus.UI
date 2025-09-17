import {SqlParamType} from "@charts/ui/DataSourcePanel/types.ts";

export type FieldDto = {
    name: string;
    type: string;
    isNumeric: boolean;
    isTime: boolean;
    sqlParamType: SqlParamType
}