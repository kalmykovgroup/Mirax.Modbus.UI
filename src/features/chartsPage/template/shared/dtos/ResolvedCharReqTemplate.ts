import type {Guid} from "@app/lib/types/Guid.ts";
import type {EntityDto} from "@chartsPage/metaData/shared/dtos/EntityDto.ts";
import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import type {FilterClause} from "@chartsPage/template/shared//dtos/FilterClause.ts";
import type {SqlParam} from "@chartsPage/template/shared//dtos/SqlParam.ts";
import type {SqlFilter} from "@chartsPage/template/shared//dtos/SqlFilter.ts";

export type ResolvedCharReqTemplate = {
    readonly id: Guid

    // настройки графиков
    readonly databaseId: Guid

    readonly fromMs: number
    readonly toMs: number

    readonly entity: EntityDto
    readonly timeField: FieldDto
    readonly selectedFields: ReadonlyArray<FieldDto>

    readonly where?: ReadonlyArray<FilterClause> | undefined
    readonly params?: ReadonlyArray<SqlParam> | undefined

    readonly sql?: SqlFilter | undefined
}