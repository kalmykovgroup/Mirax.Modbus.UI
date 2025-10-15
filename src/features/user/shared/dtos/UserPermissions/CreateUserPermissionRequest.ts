import type {Guid} from "@app/lib/types/Guid.ts";

export interface CreateUserPermissionRequest {
    userId: Guid; // Guid
    permissionId: Guid; // Guid
}