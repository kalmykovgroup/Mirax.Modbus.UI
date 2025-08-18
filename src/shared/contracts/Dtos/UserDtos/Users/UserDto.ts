import type { PermissionDto } from "@shared/contracts/Dtos/UserDtos/Permissions/PermissionDto.ts";
import type { RoleDto } from "@shared/contracts/Dtos/UserDtos/Roles/RoleDto.ts";

export interface UserDto {
    id: string; // Guid
    email: string;
    fullName: string;
    permissions: PermissionDto[];
    roles: RoleDto[];
}