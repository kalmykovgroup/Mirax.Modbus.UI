import type { ModbusTemplateLoadOptions } from "@shared/contracts/Types/RepositoryOptions/ModbusTemplateLoadOptions.ts";

export interface GetAllModbusDeviceTemplatesRequest {
    loadOption: ModbusTemplateLoadOptions;
}
