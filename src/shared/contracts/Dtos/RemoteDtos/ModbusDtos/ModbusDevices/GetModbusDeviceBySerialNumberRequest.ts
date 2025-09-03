import type {ModbusDeviceLoadOptions} from "@shared/contracts/Types/Api.Shared/RepositoryOptions/ModbusDeviceLoadOptions.ts";

export interface GetModbusDeviceBySerialNumberRequest {
    loadOption: ModbusDeviceLoadOptions;
}
