
export interface CreateUserRequest {
    email: string;
    fullName: string;
    password: string;
    roleId: string; // Guid
}