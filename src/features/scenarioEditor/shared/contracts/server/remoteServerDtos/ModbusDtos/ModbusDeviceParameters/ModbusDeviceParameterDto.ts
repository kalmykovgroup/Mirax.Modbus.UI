import type {ModbusByteOrder} from "@scenario/shared/contracts/server/types/Api.Shared/ModbusByteOrder.ts";
import type {RegisterType} from "@scenario/shared/contracts/server/types/Api.Shared/RegisterType.ts";
import type {RegisterDataTypeDto} from "@scenario/shared/contracts/server/remoteServerDtos/ModbusDtos/RegisterDataTypes/RegisterDataTypeDto.ts";

export interface ModbusDeviceParameterDto {
    id: string;
    modbusDeviceTemplateId: string;
    name: string;
    isReadable: boolean;
    isWritable: boolean;
    applyOnChange: boolean;
    applyParameterId?: string | null;
    applyValue?: string | null;
    registerType: RegisterType;
    startAddress: number;
    functionCodeRead?: number | null;
    functionCodeWrite?: number | null;
    byteOrder: ModbusByteOrder;
    registerDataTypeId: string;
    unit?: string | null;
    description?: string | null;
    registerDataType: RegisterDataTypeDto;
    applyParameter?: ModbusDeviceParameterDto | null;
}
