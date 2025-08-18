import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
export interface DeleteModbusDeviceTemplateCommand {
    templateId: string; // Guid
}

export type DeleteModbusDeviceTemplateCommandResponse = ApiResponse<boolean>;
