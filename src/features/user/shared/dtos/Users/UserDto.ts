import type { PermissionDto } from "@/features/user/shared/dtos/Permissions/PermissionDto.ts";
import type { RoleDto } from "@/features/user/shared/dtos/Roles/RoleDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

export interface UserDto {
    id: Guid; // Guid
    email: string;
    fullName: string;
    permissions: PermissionDto[];
    roles: RoleDto[];
}