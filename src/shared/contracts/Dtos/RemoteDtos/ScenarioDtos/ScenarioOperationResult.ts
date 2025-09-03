import type {ApiResponse} from "@shared/contracts/Dtos/RemoteDtos/CommonDtos/ApiResponse.ts";
import type {Guid} from "@app/lib/types/Guid.ts";
import type {DbEntityType} from "@shared/contracts/Types/Api.Shared/Scenario/DbEntityType.ts";
import type {DbActionType} from "@shared/contracts/Types/Api.Shared/Scenario/DbActionType.ts";
/** Результат отдельной операции в батче: содержит ApiResponse<object> */
export interface ScenarioOperationResult<T = unknown> {
    opId: Guid
    entity: DbEntityType
    action: DbActionType
    result: ApiResponse<T>
}