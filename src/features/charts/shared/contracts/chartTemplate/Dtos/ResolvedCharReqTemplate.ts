import type {Guid} from "@app/lib/types/Guid.ts";
import type {EntityDto} from "@charts/shared/contracts/metadata/Dtos/EntityDto.ts";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import type {FilterClause} from "@charts/shared/contracts/chartTemplate/Dtos/FilterClause.ts";
import type {SqlParam} from "@charts/shared/contracts/chartTemplate/Dtos/SqlParam.ts";
import type {SqlFilter} from "@charts/shared/contracts/chartTemplate/Dtos/SqlFilter.ts";

export type CharReqTemplateAssembled = {
    id: Guid

    // настройки графиков
    databaseId : Guid

    //Это исходный при старте графика
    from?: Date | undefined
    to?: Date | undefined

    entity: EntityDto
    timeField: FieldDto
    selectedFields: FieldDto[]

    where?: FilterClause[]
    params?: SqlParam[]

    sql?: SqlFilter | undefined
}
