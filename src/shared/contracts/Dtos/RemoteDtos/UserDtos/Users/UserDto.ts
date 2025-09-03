import type { PermissionDto } from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Permissions/PermissionDto.ts";
import type { RoleDto } from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Roles/RoleDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

export interface UserDto {
    id: Guid; // Guid
    email: string;
    fullName: string;
    permissions: PermissionDto[];
    roles: RoleDto[];
}