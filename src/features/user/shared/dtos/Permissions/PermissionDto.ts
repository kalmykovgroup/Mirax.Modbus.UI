import type { UserPermissionDto } from "@/features/user/shared/dtos/UserPermissions/UserPermissionDto.ts";
import type { RolePermissionDto } from "@/features/user/shared/dtos/RolePermissions/RolePermissionDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

export interface PermissionDto {
    id: Guid; // Guid
    name: string; // "ViewDevices", "RunScenarios"
    description: string | null;
    userPermissions: UserPermissionDto[];
    rolePermissions: RolePermissionDto[];
}