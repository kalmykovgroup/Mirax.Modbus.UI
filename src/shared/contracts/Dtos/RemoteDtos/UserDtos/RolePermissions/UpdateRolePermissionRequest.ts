import type {Guid} from "@app/lib/types/Guid.ts";

export interface UpdateRolePermissionRequest {
    roleId: Guid; // Guid
    permissionId: Guid; // Guid
}