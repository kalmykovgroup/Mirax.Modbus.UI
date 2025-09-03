import type {
    ModbusDeviceActionLoadOptions
} from "@shared/contracts/Types/Api.Shared/RepositoryOptions/ModbusDeviceActionLoadOptions.ts";

export interface GetModbusDeviceActionByIdRequest {
    /** Опции загрузки связей/полей. */
    loadOption: ModbusDeviceActionLoadOptions;

    /**
     * В оригинальном имени класса указано "ById", но в присланном C# поле Id отсутствует.
     * Если на бэке оно есть — добавь сюда:
     * id: string; // Guid
     */
}
