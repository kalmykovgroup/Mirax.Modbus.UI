import type {ModbusDeviceLoadOptions} from "@shared/contracts/Types/RepositoryOptions/ModbusDeviceLoadOptions.ts";

export interface GetModbusDeviceByIdRequest {
    loadOption: ModbusDeviceLoadOptions;
}
