import type { ModbusTemplateLoadOptions } from "@scenario/shared/contracts/server/types/Api.Shared/RepositoryOptions/ModbusTemplateLoadOptions.ts";

export interface GetAllModbusDeviceTemplatesRequest {
    loadOption: ModbusTemplateLoadOptions;
}
