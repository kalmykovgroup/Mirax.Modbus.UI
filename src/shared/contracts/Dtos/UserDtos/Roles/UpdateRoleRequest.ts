export interface UpdateRoleRequest {
    id: string; // Guid
    name: string; // "Admin", "Manager", "User"
    description: string | null;
}