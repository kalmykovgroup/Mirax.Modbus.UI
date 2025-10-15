import type {Guid} from "@app/lib/types/Guid.ts";

export interface RolePermissionDto {
    roleId: Guid; // Guid
    permissionId: Guid; // Guid
}