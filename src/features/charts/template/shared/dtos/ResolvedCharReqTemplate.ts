import type {Guid} from "@app/lib/types/Guid.ts";
import type {EntityDto} from "@charts/metaData/shared/dtos/EntityDto.ts";
import type {FieldDto} from "@charts/metaData/shared/dtos/FieldDto.ts";
import type {FilterClause} from "@charts/template/shared/dtos/FilterClause.ts";
import type {SqlParam} from "@charts/template/shared/dtos/SqlParam.ts";
import type {SqlFilter} from "@charts/template/shared/dtos/SqlFilter.ts";

export type ResolvedCharReqTemplate = {
    readonly id: Guid

    // настройки графиков
    readonly databaseId: Guid

    readonly from: Date
    readonly to: Date

    readonly entity: EntityDto
    readonly timeField: FieldDto
    readonly selectedFields: ReadonlyArray<FieldDto>

    readonly where?: ReadonlyArray<FilterClause> | undefined
    readonly params?: ReadonlyArray<SqlParam> | undefined

    readonly sql?: SqlFilter | undefined
}