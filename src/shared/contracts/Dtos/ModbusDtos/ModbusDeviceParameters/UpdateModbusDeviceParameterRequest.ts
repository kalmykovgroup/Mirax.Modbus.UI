import type {RegisterType} from "@shared/contracts/Types/RegisterType.ts";

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
