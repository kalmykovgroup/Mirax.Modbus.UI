import type { UserPermissionDto } from "@shared/contracts/Dtos/RemoteDtos/UserDtos/UserPermissions/UserPermissionDto.ts";
import type { RolePermissionDto } from "@shared/contracts/Dtos/RemoteDtos/UserDtos/RolePermissions/RolePermissionDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

export interface PermissionDto {
    id: Guid; // Guid
    name: string; // "ViewDevices", "RunScenarios"
    description: string | null;
    userPermissions: UserPermissionDto[];
    rolePermissions: RolePermissionDto[];
}