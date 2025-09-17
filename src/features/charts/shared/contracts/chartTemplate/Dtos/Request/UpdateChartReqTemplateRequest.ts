import type {Guid} from "@app/lib/types/Guid.ts";
import type {FilterClause} from "@charts/shared/contracts/chartTemplate/Dtos/FilterClause.ts";
import type {SqlParam} from "@charts/shared/contracts/chartTemplate/Dtos/SqlParam.ts";
import type {SqlFilter} from "@charts/shared/contracts/chartTemplate/Dtos/SqlFilter.ts";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import type {EntityDto} from "@charts/shared/contracts/metadata/Dtos/EntityDto.ts";

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