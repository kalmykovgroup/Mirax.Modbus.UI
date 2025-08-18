import type { UserLoadOptions } from "@shared/contracts/Types/RepositoryOptions/UserLoadOptions.ts";

export interface GetUserByEmailRequest {
    loadOption: UserLoadOptions;
}