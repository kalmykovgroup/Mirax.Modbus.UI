
export interface UpdateUserRequest {
    id: string; // Guid
    email: string;
    fullName: string;
    roleId: string; // Guid
}