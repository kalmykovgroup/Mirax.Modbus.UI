import type {Guid} from "@app/lib/types/Guid.ts";

export interface UpdateUserRequest {
    id: Guid; // Guid
    email: string;
    fullName: string;
    roleId: string; // Guid
}