import type {Guid} from "@app/lib/types/Guid.ts";

export interface UserPermissionDto {
    userId: Guid; // Guid
    permissionId: Guid; // Guid
}