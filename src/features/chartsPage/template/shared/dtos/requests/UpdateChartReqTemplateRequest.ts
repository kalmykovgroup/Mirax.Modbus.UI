import type {Guid} from "@app/lib/types/Guid.ts";
import type {FilterClause} from "@chartsPage/template/shared//dtos/FilterClause.ts";
import type {EntityDto} from "@chartsPage/metaData/shared/dtos/EntityDto.ts";
import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import type {SqlParam} from "@chartsPage/template/shared//dtos/SqlParam.ts";
import type {SqlFilter} from "@chartsPage/template/shared//dtos/SqlFilter.ts";

export type UpdateChartReqTemplateRequest = {
    id: Guid;
    name: string
    description?: string | undefined

    originalFromMs?: number | undefined
    originalToMs?: number | undefined

    // настройки графиков
    databaseId: Guid
    entity: EntityDto
    timeField: FieldDto
    selectedFields: FieldDto[]

    where?: FilterClause[] | undefined
    params?: SqlParam[] | undefined

    sql?: SqlFilter | undefined
}