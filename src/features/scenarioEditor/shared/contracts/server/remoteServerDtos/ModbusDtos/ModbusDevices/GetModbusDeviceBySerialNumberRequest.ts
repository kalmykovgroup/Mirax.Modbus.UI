import type {ModbusDeviceLoadOptions} from "@scenario/shared/contracts/server/types/Api.Shared/RepositoryOptions/ModbusDeviceLoadOptions.ts";

export interface GetModbusDeviceBySerialNumberRequest {
    loadOption: ModbusDeviceLoadOptions;
}
