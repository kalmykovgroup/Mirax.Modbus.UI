import type {
    ModbusDeviceActionLoadOptions
} from "@shared/contracts/Types/Api.Shared/RepositoryOptions/ModbusDeviceActionLoadOptions.ts";

export interface GetAllModbusDeviceActionsRequest {
    modbusDeviceTemplateId: string; // Guid
    modbusDeviceActionLoadOptions: ModbusDeviceActionLoadOptions;
}
