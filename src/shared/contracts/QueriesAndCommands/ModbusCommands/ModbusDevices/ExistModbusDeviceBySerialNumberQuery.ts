import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface ExistModbusDeviceBySerialNumberQuery {
    serialNumber: string;
}

export type ExistModbusDeviceBySerialNumberQueryResponse = ApiResponse<boolean>;
