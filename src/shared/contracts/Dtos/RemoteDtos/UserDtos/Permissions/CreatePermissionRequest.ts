export interface CreatePermissionRequest {
    name: string; // "ViewDevices", "RunScenarios"
    description: string | null;
}