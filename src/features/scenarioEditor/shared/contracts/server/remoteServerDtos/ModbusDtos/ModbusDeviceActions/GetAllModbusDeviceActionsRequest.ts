import type {
    ModbusDeviceActionLoadOptions
} from "@scenario/shared/contracts/server/types/Api.Shared/RepositoryOptions/ModbusDeviceActionLoadOptions.ts";

export interface GetAllModbusDeviceActionsRequest {
    modbusDeviceTemplateId: string; // Guid
    modbusDeviceActionLoadOptions: ModbusDeviceActionLoadOptions;
}
