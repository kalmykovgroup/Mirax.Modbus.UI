// @ts-ignore
export enum StepLoadOptions {
    None = 0,
    IncludeModbusAction = 1 << 0,
    IncludeModbusAddress = 1 << 1,
    IncludeSystemAction = 1 << 2,
    IncludeBranch = 1 << 3,
    IncludeOwnedBranches = 1 << 4,
    IncludeRelations = 1 << 5,

    Full =
        StepLoadOptions.IncludeModbusAction |
        StepLoadOptions.IncludeModbusAddress |
        StepLoadOptions.IncludeSystemAction |
        StepLoadOptions.IncludeBranch |
        StepLoadOptions.IncludeOwnedBranches |
        StepLoadOptions.IncludeRelations,
}
