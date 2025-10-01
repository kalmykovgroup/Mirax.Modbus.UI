import type {Guid} from "@app/lib/types/Guid.ts";
import type {FilterClause} from "@charts/template/shared/dtos/FilterClause.ts";
import type {EntityDto} from "@charts/metaData/shared/dtos/EntityDto.ts";
import type {FieldDto} from "@charts/metaData/shared/dtos/FieldDto.ts";
import type {SqlParam} from "@charts/template/shared/dtos/SqlParam.ts";
import type {SqlFilter} from "@charts/template/shared/dtos/SqlFilter.ts";

export type UpdateChartReqTemplateRequest = {
    id: Guid;
    name: string
    description?: string | undefined

    // настройки графиков
    databaseId: Guid
    entity: EntityDto
    timeField: FieldDto
    selectedFields: FieldDto[]

    where?: FilterClause[] | undefined
    params?: SqlParam[] | undefined

    sql?: SqlFilter | undefined
}