import type {Guid} from "@app/lib/types/Guid.ts";

export interface CreateUserRoleRequest {
    userId: Guid; // Guid
    roleId: Guid; // Guid
}