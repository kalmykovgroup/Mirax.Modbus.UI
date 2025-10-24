// src/features/scenarioEditor/store/scenarioSelectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/baseStore/store';
import type { Guid } from '@app/lib/types/Guid';
import type { ScenarioDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Scenarios/ScenarioDto';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import type { StepBaseDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto';
import { ScenarioLoadStatus, type ScenarioState } from "@scenario/store/scenarioSlice.ts";

// ============================================================================
// BASE SELECTORS
// ============================================================================

export const selectScenarioState = (state: RootState) => state.scenario;

export const selectActiveScenarioId = (state: RootState) => state.scenario.activeScenarioId;

export const selectAllScenarioStates = (state: RootState) => state.scenario.scenarios;

// ============================================================================
// SCENARIO STATE BY ID
// ============================================================================

export const selectScenarioStateById = (state: RootState, scenarioId: Guid): ScenarioState | undefined =>
    state.scenario.scenarios[scenarioId];

// ============================================================================
// BY ID SELECTORS (требуют scenarioId)
// ============================================================================

export const selectScenarioById = (state: RootState, scenarioId: Guid): ScenarioDto | undefined =>
    state.scenario.scenarios[scenarioId]?.scenario;

export const selectBranchById = (state: RootState, scenarioId: Guid, branchId: Guid): BranchDto | undefined =>
    state.scenario.scenarios[scenarioId]?.branches[branchId];

export const selectStepById = (state: RootState, scenarioId: Guid, stepId: Guid): StepBaseDto | undefined =>
    state.scenario.scenarios[scenarioId]?.steps[stepId];

export const selectRelationById = (state: RootState, scenarioId: Guid, relationId: Guid): StepRelationDto | undefined =>
    state.scenario.scenarios[scenarioId]?.relations[relationId];

// ============================================================================
// ALL FROM SCENARIO SELECTORS
// ============================================================================

export const selectAllBranchesInScenario = (state: RootState, scenarioId: Guid): Record<Guid, BranchDto> =>
    state.scenario.scenarios[scenarioId]?.branches ?? {};

export const selectAllStepsInScenario = (state: RootState, scenarioId: Guid): Record<Guid, StepBaseDto> =>
    state.scenario.scenarios[scenarioId]?.steps ?? {};

export const selectAllRelationsInScenario = (state: RootState, scenarioId: Guid): Record<Guid, StepRelationDto> =>
    state.scenario.scenarios[scenarioId]?.relations ?? {};

// ============================================================================
// LIST SELECTORS
// ============================================================================

export const selectScenariosList = createSelector(
    [selectAllScenarioStates],
    (scenarios): readonly ScenarioDto[] =>
        Object.values(scenarios)
            .filter((s): s is ScenarioState => s != null && s.scenario != null)
            .map(s => s.scenario)
);

export const selectBranchesListInScenario = createSelector(
    [(state: RootState, scenarioId: Guid) => selectAllBranchesInScenario(state, scenarioId)],
    (branches): readonly BranchDto[] => Object.values(branches)
);

export const selectStepsListInScenario = createSelector(
    [(state: RootState, scenarioId: Guid) => selectAllStepsInScenario(state, scenarioId)],
    (steps): readonly StepBaseDto[] => Object.values(steps)
);

export const selectRelationsListInScenario = createSelector(
    [(state: RootState, scenarioId: Guid) => selectAllRelationsInScenario(state, scenarioId)],
    (relations): readonly StepRelationDto[] => Object.values(relations)
);

// ============================================================================
// ACTIVE SCENARIO SELECTORS
// ============================================================================

export const selectActiveScenario = createSelector(
    [selectActiveScenarioId, selectAllScenarioStates],
    (activeId, scenarios): ScenarioDto | undefined =>
        activeId != null ? scenarios[activeId]?.scenario : undefined
);

export const selectActiveScenarioState = createSelector(
    [selectActiveScenarioId, selectAllScenarioStates],
    (activeId, scenarios): ScenarioState | undefined =>
        activeId != null ? scenarios[activeId] : undefined
);

export const selectActiveScenarioMainBranch = createSelector(
    [selectActiveScenario, selectActiveScenarioState],
    (scenario, scenarioState): BranchDto | undefined =>
        scenario != null && scenarioState != null ? scenarioState.branches[scenario.branch.id] : undefined
);

// ============================================================================
// RELATIONSHIP SELECTORS
// ============================================================================

// Удалено: selectBranchesByScenarioId был identity selector
// Используйте напрямую selectBranchesListInScenario

export const selectStepsByBranchId = createSelector(
    [
        (state: RootState, scenarioId: Guid) => selectStepsListInScenario(state, scenarioId),
        (_: RootState, __: Guid, branchId: Guid) => branchId
    ],
    (steps, branchId): readonly StepBaseDto[] =>
        steps.filter((s) => s.branchId === branchId)
);

export const selectChildRelationsByStepId = createSelector(
    [
        (state: RootState, scenarioId: Guid) => selectRelationsListInScenario(state, scenarioId),
        (_: RootState, __: Guid, stepId: Guid) => stepId
    ],
    (relations, stepId): readonly StepRelationDto[] =>
        relations.filter((r) => r.parentStepId === stepId)
);

export const selectParentRelationsByStepId = createSelector(
    [
        (state: RootState, scenarioId: Guid) => selectRelationsListInScenario(state, scenarioId),
        (_: RootState, __: Guid, stepId: Guid) => stepId
    ],
    (relations, stepId): readonly StepRelationDto[] =>
        relations.filter((r) => r.childStepId === stepId)
);

// ============================================================================
// MAIN BRANCH SELECTORS
// ============================================================================

export const selectMainBranchByScenarioId = createSelector(
    [
        (state: RootState, scenarioId: Guid) => selectScenarioById(state, scenarioId),
        (state: RootState, scenarioId: Guid) => selectAllBranchesInScenario(state, scenarioId)
    ],
    (scenario, branches): BranchDto | undefined =>
        scenario != null ? branches[scenario.branch.id] : undefined
);

// ============================================================================
// PARENT/CHILD SELECTORS
// ============================================================================

export const selectParentStepOfBranch = createSelector(
    [
        (state: RootState, scenarioId: Guid, branchId: Guid) => selectBranchById(state, scenarioId, branchId),
        (state: RootState, scenarioId: Guid) => selectAllStepsInScenario(state, scenarioId)
    ],
    (branch, steps): StepBaseDto | undefined => {
        if (branch == null) return undefined;
        const parentStepId = branch.parallelStepId ?? branch.conditionStepId;
        return parentStepId != null ? steps[parentStepId] : undefined;
    }
);

export const selectChildBranchesOfStep = createSelector(
    [
        (state: RootState, scenarioId: Guid) => selectBranchesListInScenario(state, scenarioId),
        (_: RootState, __: Guid, stepId: Guid) => stepId
    ],
    (branches, stepId): readonly BranchDto[] =>
        branches.filter(
            (b) => b.parallelStepId === stepId || b.conditionStepId === stepId
        )
);

// ============================================================================
// STATUS & ERROR SELECTORS
// ============================================================================

export const selectScenarioStatus = (state: RootState, id: Guid): ScenarioLoadStatus =>
    state.scenario.scenarios[id]?.status ?? ScenarioLoadStatus.NotLoaded;

export const selectScenarioError = (state: RootState, id: Guid): string | undefined =>
    state.scenario.scenarios[id]?.error;