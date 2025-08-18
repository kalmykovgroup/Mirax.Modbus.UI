export interface UpdatePermissionRequest {
    id: string; // Guid
    name: string; // "ViewDevices", "RunScenarios"
    description: string | null;
}