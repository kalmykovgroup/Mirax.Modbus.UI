import type { UpdateModbusDeviceTemplateRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceTemplates/UpdateModbusDeviceTemplateRequest.ts";
import type { ModbusDeviceTemplateDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceTemplates/ModbusDeviceTemplateDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface UpdateModbusDeviceTemplateCommand {
    request: UpdateModbusDeviceTemplateRequest;
}

export type UpdateModbusDeviceTemplateCommandResponse = ApiResponse<ModbusDeviceTemplateDto>;
