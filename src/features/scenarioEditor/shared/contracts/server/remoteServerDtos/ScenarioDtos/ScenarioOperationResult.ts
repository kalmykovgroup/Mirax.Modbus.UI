import type {ApiResponse} from "@/baseShared/dtos/ApiResponse.ts";
import type {Guid} from "@app/lib/types/Guid.ts";
import type {DbEntityType} from "@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbEntityType.ts";
import type {DbActionType} from "@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbActionType.ts";
/** Результат отдельной операции в батче: содержит ApiResponse<object> */
export interface ScenarioOperationResult<T = unknown> {
    opId: Guid
    entity: DbEntityType
    action: DbActionType
    result: ApiResponse<T>
}