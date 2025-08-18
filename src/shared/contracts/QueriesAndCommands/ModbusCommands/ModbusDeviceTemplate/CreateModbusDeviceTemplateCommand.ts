import type { CreateModbusDeviceTemplateRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceTemplates/CreateModbusDeviceTemplateRequest.ts";
import type { ModbusDeviceTemplateDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceTemplates/ModbusDeviceTemplateDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
export interface CreateModbusDeviceTemplateCommand {
    request: CreateModbusDeviceTemplateRequest;
}

export type CreateModbusDeviceTemplateCommandResponse = ApiResponse<ModbusDeviceTemplateDto>;
