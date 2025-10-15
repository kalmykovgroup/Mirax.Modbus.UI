import type {Guid} from "@app/lib/types/Guid.ts";
import type {DbEntityType} from "@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbEntityType.ts";
import type {DbActionType} from "@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbActionType.ts";

/** Операция батча (JsonElement на сервере → свободная форма payload здесь) */
export interface ScenarioOperationDto<TPayload = unknown> {
    opId: Guid
    entity: DbEntityType
    action: DbActionType
    payload: TPayload
}