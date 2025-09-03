import type {Guid} from "@app/lib/types/Guid.ts";

export interface RoleDto {
    id: Guid; // Guid
    name: string; // "Admin", "Manager", "User"
    description: string | null;
    permissionIds: Guid[]; // Guid[]
}