// @ts-ignore
export enum BranchLoadOptions {
    None = 0,
    IncludeScenario = 1 << 0,
    IncludeSteps = 1 << 1,
    IncludeStepsRelations = 1 << 2,
    IncludeStepBranchRels = 1 << 3, // b.StepBranchRelations
    IncludeStepBranchRelsWithOwners = 1 << 3, // + ConditionStep/ParallelStep

    /** Все данные */
    Full =
        BranchLoadOptions.IncludeScenario |
        BranchLoadOptions.IncludeSteps |
        BranchLoadOptions.IncludeStepsRelations |
        BranchLoadOptions.IncludeStepBranchRels |
        BranchLoadOptions.IncludeStepBranchRelsWithOwners
}

