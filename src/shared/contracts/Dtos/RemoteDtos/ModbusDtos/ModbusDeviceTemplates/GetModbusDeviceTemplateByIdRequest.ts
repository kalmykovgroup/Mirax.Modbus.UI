import type { ModbusTemplateLoadOptions } from "@shared/contracts/Types/Api.Shared/RepositoryOptions/ModbusTemplateLoadOptions.ts";

export interface GetModbusDeviceTemplateByIdRequest {
    loadOption: ModbusTemplateLoadOptions;
}
