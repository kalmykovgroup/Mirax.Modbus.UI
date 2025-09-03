export interface CreateRoleRequest {
    name: string; // "Admin", "Manager", "User"
    description: string | null;
}