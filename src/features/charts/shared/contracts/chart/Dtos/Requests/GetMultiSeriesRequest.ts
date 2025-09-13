import type {FilterClause} from "@charts/shared/contracts/chart/Dtos/FilterClause.ts";
import type {SqlFilter} from "@charts/shared/contracts/chart/Dtos/SqlFilter.ts";

export type GetMultiSeriesRequest = {
    entity: string
    fields: string[]
    timeField?: string | undefined
    from: string
    to: string
    px: number

    where?: FilterClause[] | undefined;
    sql?: SqlFilter | undefined;
    sqlValues?: Record<string, unknown> | undefined;
}