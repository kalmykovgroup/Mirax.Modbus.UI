export interface CreateModbusDeviceTemplateRequest {
    /** Название шаблона устройства */
    name: string;
    /** Производитель устройства */
    manufacturer?: string | null;
    /** Описание шаблона */
    description?: string | null;
}
