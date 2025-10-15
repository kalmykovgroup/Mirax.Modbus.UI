import type { UserLoadOptions } from "@scenario/shared/contracts/server/types/Api.Shared/RepositoryOptions/UserLoadOptions.ts";

export interface GetAllUsersRequest {
    loadOption: UserLoadOptions;
}