// @ts-ignore
export enum BranchLoadOptions {
    None = 0,
    IncludeScenario = 1 << 0,
    IncludeParallelStep = 1 << 1,
    IncludeConditionStep = 1 << 2,
    IncludeSteps = 1 << 3,
    IncludeStepsRelations = 1 << 4,

    /** Все данные */
    Full =
        BranchLoadOptions.IncludeScenario |
        BranchLoadOptions.IncludeParallelStep |
        BranchLoadOptions.IncludeConditionStep |
        BranchLoadOptions.IncludeSteps |
        BranchLoadOptions.IncludeStepsRelations,
}
