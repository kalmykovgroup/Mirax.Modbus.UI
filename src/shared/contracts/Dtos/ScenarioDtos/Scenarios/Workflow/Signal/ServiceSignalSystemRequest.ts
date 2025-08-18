export interface ServiceSignalSystemRequest {
    inputKey: string; // Guid
    message: string;
    data?: string | null;
}
