export interface CreateModbusDeviceActionParameterRequest {
    /** Id параметра, который участвует в действии. */
    modbusDeviceParameterId: string; // Guid

    /** Id действия (шаблонного). */
    modbusDeviceActionId: string; // Guid

    /** Значение для записи, если параметр записываемый. */
    value?: string | null;
}
