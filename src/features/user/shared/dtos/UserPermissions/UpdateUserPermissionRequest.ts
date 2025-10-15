import type {Guid} from "@app/lib/types/Guid.ts";

export interface UpdateUserPermissionRequest {
    userId: Guid; // Guid
    permissionId: Guid; // Guid
}