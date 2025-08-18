import type {ModbusDeviceLoadOptions} from "@shared/contracts/Types/RepositoryOptions/ModbusDeviceLoadOptions.ts";
import type {ConnectionType} from "@shared/contracts/Types/ConnectionType.ts";

export interface GetAllModbusDevicesRequest {
    connectionType: ConnectionType;
    loadOption: ModbusDeviceLoadOptions;
}
