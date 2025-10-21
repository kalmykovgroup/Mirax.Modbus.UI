// src/features/scenarioEditor/store/scenarioSelectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/baseStore/store';
import type { Guid } from '@app/lib/types/Guid';
import type { ScenarioDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Scenarios/ScenarioDto';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import type { StepBaseDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto';

// ============================================================================
// BASE SELECTORS
// ============================================================================

export const selectScenarioState = (state: RootState) => state.scenario;

export const selectActiveScenarioId = (state: RootState) => state.scenario.activeScenarioId;

export const selectAllScenarios = (state: RootState) => state.scenario.scenarios;

export const selectAllBranches = (state: RootState) => state.scenario.branches;

export const selectAllSteps = (state: RootState) => state.scenario.steps;

export const selectAllRelations = (state: RootState) => state.scenario.relations;

// ============================================================================
// BY ID SELECTORS
// ============================================================================

export const selectScenarioById = (state: RootState, scenarioId: Guid): ScenarioDto | undefined =>
    state.scenario.scenarios[scenarioId];

export const selectBranchById = (state: RootState, branchId: Guid): BranchDto | undefined =>
    state.scenario.branches[branchId];

export const selectStepById = (state: RootState, stepId: Guid): StepBaseDto | undefined =>
    state.scenario.steps[stepId];

export const selectRelationById = (state: RootState, relationId: Guid): StepRelationDto | undefined =>
    state.scenario.relations[relationId];

// ============================================================================
// LIST SELECTORS
// ============================================================================

export const selectScenariosList = createSelector(
    [selectAllScenarios],
    (scenarios): readonly ScenarioDto[] => Object.values(scenarios)
);

export const selectBranchesList = createSelector(
    [selectAllBranches],
    (branches): readonly BranchDto[] => Object.values(branches)
);

export const selectStepsList = createSelector(
    [selectAllSteps],
    (steps): readonly StepBaseDto[] => Object.values(steps)
);

export const selectRelationsList = createSelector(
    [selectAllRelations],
    (relations): readonly StepRelationDto[] => Object.values(relations)
);

// ============================================================================
// ACTIVE SCENARIO SELECTORS
// ============================================================================

export const selectActiveScenario = createSelector(
    [selectActiveScenarioId, selectAllScenarios],
    (activeId, scenarios): ScenarioDto | undefined =>
        activeId != null ? scenarios[activeId] : undefined
);

export const selectActiveScenarioMainBranch = createSelector(
    [selectActiveScenario, selectAllBranches],
    (scenario, branches): BranchDto | undefined =>
        scenario != null ? branches[scenario.branch.id] : undefined
);

// ============================================================================
// RELATIONSHIP SELECTORS
// ============================================================================

export const selectBranchesByScenarioId = createSelector(
    [selectBranchesList, (_: RootState, scenarioId: Guid) => scenarioId],
    (branches, scenarioId): readonly BranchDto[] =>
        branches.filter((b) => b.scenarioId === scenarioId)
);

export const selectStepsByBranchId = createSelector(
    [selectStepsList, (_: RootState, branchId: Guid) => branchId],
    (steps, branchId): readonly StepBaseDto[] =>
        steps.filter((s) => s.branchId === branchId)
);

export const selectChildRelationsByStepId = createSelector(
    [selectRelationsList, (_: RootState, stepId: Guid) => stepId],
    (relations, stepId): readonly StepRelationDto[] =>
        relations.filter((r) => r.parentStepId === stepId)
);

export const selectParentRelationsByStepId = createSelector(
    [selectRelationsList, (_: RootState, stepId: Guid) => stepId],
    (relations, stepId): readonly StepRelationDto[] =>
        relations.filter((r) => r.childStepId === stepId)
);

// ============================================================================
// MAIN BRANCH SELECTORS
// ============================================================================

export const selectMainBranchByScenarioId = createSelector(
    [selectScenarioById, selectAllBranches],
    (scenario, branches): BranchDto | undefined =>
        scenario != null ? branches[scenario.branch.id] : undefined
);

// ============================================================================
// PARENT/CHILD SELECTORS
// ============================================================================

export const selectParentStepOfBranch = createSelector(
    [selectBranchById, selectAllSteps],
    (branch, steps): StepBaseDto | undefined => {
        if (branch == null) return undefined;
        const parentStepId = branch.parallelStepId ?? branch.conditionStepId;
        return parentStepId != null ? steps[parentStepId] : undefined;
    }
);

export const selectChildBranchesOfStep = createSelector(
    [selectBranchesList, (_: RootState, stepId: Guid) => stepId],
    (branches, stepId): readonly BranchDto[] =>
        branches.filter(
            (b) => b.parallelStepId === stepId || b.conditionStepId === stepId
        )
);