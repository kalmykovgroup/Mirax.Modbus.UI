import type {FilterClause} from "@/charts/shared/contracts/chart/Dtos/FilterClause.ts";
import type {SqlFilter} from "@/charts/shared/contracts/chart/Dtos/SqlFilter.ts";

export type GetRawRequest = {
    entity: string; // например, DeviceEntity
    field: string; // например, BatteryVoltage
    timeField: string; // например, CreateDate
    from: string;
    to: string;
    maxPoints?: number | undefined; // ограничитель на всякий случай, чтобы не сломать сервер

    where?: FilterClause[] | undefined;
    sql?: SqlFilter | undefined;
    sqlValues?: Record<string, unknown> | undefined;
}