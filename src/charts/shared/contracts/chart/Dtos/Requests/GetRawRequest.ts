export type GetRawRequest = {
    entity: string; // например, DeviceEntity
    field: string; // например, BatteryVoltage
    timeField: string; // например, CreateDate
    from: string;
    to: string;
    filters?:  Record<string, unknown> | undefined; // например, { "BatteryVoltage__gt": 0 }
    maxPoints?: number | undefined; // ограничитель на всякий случай, чтобы не сломать сервер
}