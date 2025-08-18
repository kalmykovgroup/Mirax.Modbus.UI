export interface RoleDto {
    id: string; // Guid
    name: string; // "Admin", "Manager", "User"
    description: string | null;
    permissionIds: string[]; // Guid[]
}