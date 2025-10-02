// src/shared/contracts/Dtos/Templates/ChartReqTemplateDto.ts


import type {Guid} from "@app/lib/types/Guid.ts";
import type {DatabaseDto} from "@chartsPage/metaData/shared/dtos/DatabaseDto.ts";
import type {EntityDto} from "@chartsPage/metaData/shared/dtos/EntityDto.ts";
import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import type {FilterClause} from "@chartsPage/template/shared//dtos/FilterClause.ts";
import type {SqlParam} from "@chartsPage/template/shared//dtos/SqlParam.ts";
import type {SqlFilter} from "@chartsPage/template/shared//dtos/SqlFilter.ts";

export type ChartReqTemplateDto = {
    id: Guid
    name: string
    description?: string | undefined

    //Это исходный при старте графика
    from?: Date | undefined
    to?: Date | undefined

    // настройки графиков
    databaseId : Guid
    database: DatabaseDto
    entity: EntityDto
    timeField: FieldDto
    selectedFields: FieldDto[]

    where?: FilterClause[] | undefined
    params?: SqlParam[] | undefined

    sql?: SqlFilter | undefined
}



