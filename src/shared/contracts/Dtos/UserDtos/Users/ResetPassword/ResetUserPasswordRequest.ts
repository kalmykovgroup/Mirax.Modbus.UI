export interface ResetUserPasswordRequest {
    email: string;
    token: string;
    newPassword: string;
}