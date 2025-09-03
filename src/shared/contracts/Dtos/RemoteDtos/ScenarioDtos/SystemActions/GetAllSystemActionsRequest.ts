import type { SystemActionLoadOptions } from "@shared/contracts/Types/Api.Shared/RepositoryOptions/SystemActionLoadOptions.ts";

export interface GetAllSystemActionsRequest {
    loadOption: SystemActionLoadOptions;
}
