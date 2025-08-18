import type {ModbusDeviceLoadOptions} from "@shared/contracts/Types/RepositoryOptions/ModbusDeviceLoadOptions.ts";

export interface GetModbusDeviceBySerialNumberRequest {
    loadOption: ModbusDeviceLoadOptions;
}
