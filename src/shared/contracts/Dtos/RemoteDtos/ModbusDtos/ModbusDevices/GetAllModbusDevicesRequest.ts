import type {ModbusDeviceLoadOptions} from "@shared/contracts/Types/Api.Shared/RepositoryOptions/ModbusDeviceLoadOptions.ts";
import type {ConnectionType} from "@shared/contracts/Types/Api.Shared/ConnectionType.ts";

export interface GetAllModbusDevicesRequest {
    connectionType: ConnectionType;
    loadOption: ModbusDeviceLoadOptions;
}
