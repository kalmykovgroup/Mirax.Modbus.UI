import type { UserLoadOptions } from "@shared/contracts/Types/Api.Shared/RepositoryOptions/UserLoadOptions.ts";

export interface GetAllUsersRequest {
    loadOption: UserLoadOptions;
}