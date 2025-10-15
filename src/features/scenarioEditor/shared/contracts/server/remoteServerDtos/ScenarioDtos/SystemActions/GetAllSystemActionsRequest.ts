import type { SystemActionLoadOptions } from "@scenario/shared/contracts/server/types/Api.Shared/RepositoryOptions/SystemActionLoadOptions.ts";

export interface GetAllSystemActionsRequest {
    loadOption: SystemActionLoadOptions;
}
