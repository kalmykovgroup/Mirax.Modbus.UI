import type {ModbusDeviceLoadOptions} from "@shared/contracts/Types/Api.Shared/RepositoryOptions/ModbusDeviceLoadOptions.ts";

export interface GetModbusDeviceByIdRequest {
    loadOption: ModbusDeviceLoadOptions;
}
