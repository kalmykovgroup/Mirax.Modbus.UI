import type {ModbusDeviceLoadOptions} from "@scenario/shared/contracts/server/types/Api.Shared/RepositoryOptions/ModbusDeviceLoadOptions.ts";
import type {ConnectionType} from "@scenario/shared/contracts/server/types/Api.Shared/ConnectionType.ts";

export interface GetAllModbusDevicesRequest {
    connectionType: ConnectionType;
    loadOption: ModbusDeviceLoadOptions;
}
