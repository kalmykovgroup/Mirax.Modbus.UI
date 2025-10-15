import type {Guid} from "@app/lib/types/Guid.ts";

export interface UpdateModbusDeviceActionParameterRequest {
    /** Id связки Action → Parameter (primary key в таблице) */
    id: Guid; // Guid

    /** Значение для записи, если параметр записываемый. */
    value?: string | null;
}
