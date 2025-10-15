import type {Guid} from "@app/lib/types/Guid.ts";

export interface UpdatePermissionRequest {
    id: Guid; // Guid
    name: string; // "ViewDevices", "RunScenarios"
    description: string | null;
}