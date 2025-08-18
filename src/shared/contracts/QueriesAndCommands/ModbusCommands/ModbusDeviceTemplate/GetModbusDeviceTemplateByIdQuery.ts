import type { GetModbusDeviceTemplateByIdRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceTemplates/GetModbusDeviceTemplateByIdRequest.ts";
import type { ModbusDeviceTemplateDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceTemplates/ModbusDeviceTemplateDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface GetModbusDeviceTemplateByIdQuery {
    id: string; // Guid
    request: GetModbusDeviceTemplateByIdRequest;
}

export type GetModbusDeviceTemplateByIdQueryResponse = ApiResponse<ModbusDeviceTemplateDto>;
