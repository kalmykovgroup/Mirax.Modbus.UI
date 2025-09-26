import type {Guid} from "@app/lib/types/Guid.ts";
import type {EntityDto} from "@charts/shared/contracts/metadata/Dtos/EntityDto.ts";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import type {FilterClause} from "@charts/shared/contracts/chartTemplate/Dtos/FilterClause.ts";
import type {SqlParam} from "@charts/shared/contracts/chartTemplate/Dtos/SqlParam.ts";
import type {SqlFilter} from "@charts/shared/contracts/chartTemplate/Dtos/SqlFilter.ts";

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