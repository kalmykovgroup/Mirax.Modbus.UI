import type { GetAllModbusDeviceTemplatesRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceTemplates/GetAllModbusDeviceTemplatesRequest.ts";
import type { ModbusDeviceTemplateDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceTemplates/ModbusDeviceTemplateDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
export interface GetAllModbusDeviceTemplatesQuery {
    request: GetAllModbusDeviceTemplatesRequest;
}

export type GetAllModbusDeviceTemplatesQueryResponse = ApiResponse<ModbusDeviceTemplateDto[]>;
