import type { UserPermissionDto } from "@shared/contracts/Dtos/UserDtos/UserPermissions/UserPermissionDto.ts";
import type { RolePermissionDto } from "@shared/contracts/Dtos/UserDtos/RolePermissions/RolePermissionDto.ts";

export interface PermissionDto {
    id: string; // Guid
    name: string; // "ViewDevices", "RunScenarios"
    description: string | null;
    userPermissions: UserPermissionDto[];
    rolePermissions: RolePermissionDto[];
}