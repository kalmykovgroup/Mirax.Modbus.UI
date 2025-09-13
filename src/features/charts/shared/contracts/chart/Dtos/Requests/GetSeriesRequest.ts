import type {FilterClause} from "@charts/shared/contracts/chart/Dtos/FilterClause.ts";
import type {SqlFilter} from "@charts/shared/contracts/chart/Dtos/SqlFilter.ts";

export type GetSeriesRequest = {
    entity: string
    field: string
    timeField?: string | undefined
    from: string // ISO
    to: string   // ISO
    px: number

    // Новый типизированный способ
    where?: FilterClause[] | undefined;

    // Пользовательский SQL-фрагмент с {{key}}
    sql?: SqlFilter | undefined;

    // Значения для {{key}}, приходящие на исполнении.
    // Перекрывают SqlFilter.params[].value.
    sqlValues?: Record<string, unknown> | undefined;
}