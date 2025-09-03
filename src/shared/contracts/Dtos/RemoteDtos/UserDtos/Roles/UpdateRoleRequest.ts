import type {Guid} from "@app/lib/types/Guid.ts";

export interface UpdateRoleRequest {
    id: Guid; // Guid
    name: string; // "Admin", "Manager", "User"
    description: string | null;
}