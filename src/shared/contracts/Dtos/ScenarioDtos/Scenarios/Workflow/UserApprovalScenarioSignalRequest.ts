export interface UserApprovalScenarioSignalRequest {
    workflowId: string;
    contextId: string;
    key: string;
    data?: unknown | null;
}
