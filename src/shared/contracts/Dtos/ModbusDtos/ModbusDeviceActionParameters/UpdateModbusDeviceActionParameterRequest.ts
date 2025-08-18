export interface UpdateModbusDeviceActionParameterRequest {
    /** Id связки Action → Parameter (primary key в таблице) */
    id: string; // Guid

    /** Значение для записи, если параметр записываемый. */
    value?: string | null;
}
