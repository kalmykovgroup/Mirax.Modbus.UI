import type {RegisterType} from "@scenario/shared/contracts/server/types/Api.Shared/RegisterType.ts";

export interface UpdateModbusDeviceParameterRequest {
    id: string;
    modbusDeviceTemplateId: string;
    name: string;
    isReadable: boolean;
    isWritable: boolean;
    applyOnChange: boolean;
    applyParameterId?: string | null;
    applyValue?: string | null;
    registerType: RegisterType;
    startRegister: number;
    functionCodeRead?: number | null;
    functionCodeWrite?: number | null;
    registerDataTypeId: string;
    unit?: string | null;
    description?: string | null;
}
