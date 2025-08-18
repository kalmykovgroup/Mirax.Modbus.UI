import type {
    ModbusDeviceActionLoadOptions
} from "@shared/contracts/Types/RepositoryOptions/ModbusDeviceActionLoadOptions.ts";

export interface GetAllModbusDeviceActionsRequest {
    modbusDeviceTemplateId: string; // Guid
    modbusDeviceActionLoadOptions: ModbusDeviceActionLoadOptions;
}
