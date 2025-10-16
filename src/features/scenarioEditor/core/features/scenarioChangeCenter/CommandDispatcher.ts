// src/features/scenario/commands/CommandDispatcher.ts

import type { AppDispatch } from '@/baseStore/store';
import { store } from '@/baseStore/store';
import type { Guid } from '@app/lib/types/Guid';
import type {UseHistoryResult} from "@scenario/core/features/historySystem/useHistory.ts";
import {
    type AnyScenarioCommand, isBatchCommand, isCreateBranchCommand, isCreateRelationCommand,
    isCreateStepCommand,
    isDeleteBranchCommand, isDeleteRelationCommand, isDeleteStepCommand, isMoveStepCommand,
    isResizeBranchCommand, isUpdateBranchCommand, isUpdateRelationCommand, isUpdateStepCommand
} from "@scenario/core/features/scenarioChangeCenter/scenarioCommands.ts";
import {
    addBranch,
    addRelation,
    addStep,
    deleteBranch, deleteRelation,
    deleteStep,
    updateBranch, updateRelation,
    updateStep
} from "@scenario/store/scenarioSlice.ts";
import {
    denormalizeStepForHistory, normalizedBranchToEntity,
    normalizedStepToEntity, relationToEntity
} from "@scenario/core/features/scenarioChangeCenter/entityMappers.ts";
/**
 * Диспетчер команд сценария с автоматической записью в историю
 *
 * ЗАМЕНЯЕТ ScenarioChangeCenter полностью!
 */
export class CommandDispatcher {
    private readonly dispatch: AppDispatch;
    private readonly contextId: Guid;
    private readonly history: UseHistoryResult;

    constructor(contextId: Guid, dispatch: AppDispatch, history: UseHistoryResult) {
        this.contextId = contextId;
        this.dispatch = dispatch;
        this.history = history;
    }

    /**
     * Выполнить команду
     */
    execute(command: AnyScenarioCommand): void {
        console.log('[CommandDispatcher] Executing:', command.type, command.payload);
        this.executeCommand(command);
    }

    /**
     * Начать батч операций
     */
    startBatch(): void {
        this.history.startBatch();
    }

    /**
     * Завершить батч
     */
    commitBatch(description?: string): void {
        this.history.commitBatch(description);
    }

    /**
     * Отменить батч
     */
    cancelBatch(): void {
        this.history.cancelBatch();
    }

    /**
     * Внутренняя логика выполнения команды
     */
    private executeCommand(command: AnyScenarioCommand): void {
        // STEP COMMANDS
        if (isCreateStepCommand(command)) {
            this.handleCreateStep(command);
        } else if (isUpdateStepCommand(command)) {
            this.handleUpdateStep(command);
        } else if (isDeleteStepCommand(command)) {
            this.handleDeleteStep(command);
        } else if (isMoveStepCommand(command)) {
            this.handleMoveStep(command);
        }

        // BRANCH COMMANDS
        else if (isCreateBranchCommand(command)) {
            this.handleCreateBranch(command);
        } else if (isUpdateBranchCommand(command)) {
            this.handleUpdateBranch(command);
        } else if (isDeleteBranchCommand(command)) {
            this.handleDeleteBranch(command);
        } else if (isResizeBranchCommand(command)) {
            this.handleResizeBranch(command);
        }

        // RELATION COMMANDS
        else if (isCreateRelationCommand(command)) {
            this.handleCreateRelation(command);
        } else if (isUpdateRelationCommand(command)) {
            this.handleUpdateRelation(command);
        } else if (isDeleteRelationCommand(command)) {
            this.handleDeleteRelation(command);
        }

        // BATCH COMMAND
        else if (isBatchCommand(command)) {
            this.history.startBatch();
            for (const cmd of command.payload.commands) {
                this.executeCommand(cmd);
            }
            this.history.commitBatch(command.payload.description);
        }
    }

    // ========================================================================
    // STEP HANDLERS
    // ========================================================================

    private handleCreateStep(command: any): void {
        const { step, branchId } = command.payload;

        console.log('[CommandDispatcher] Creating step:', step.id, 'in branch:', branchId);

        // Применяем изменение
        this.dispatch(addStep({ branchId, step }));

        // Получаем созданный step из state
        const state = store.getState();
        const createdStep = state.scenario.steps.entities[step.id];
        if (!createdStep) {
            console.error('[CommandDispatcher] Created step not found in state:', step.id);
            return;
        }

        // Записываем в историю
        const entity = normalizedStepToEntity(createdStep, state.scenario.relations.entities);
        this.history.recordCreate(entity);

        console.log('[History] ✅ Step created:', entity.id);
    }

    private handleUpdateStep(command: any): void {
        const { stepId, changes, previousState } = command.payload;

        console.log('[CommandDispatcher] Updating step:', stepId, 'changes:', changes);

        // Получаем текущее состояние ДО изменения
        const stateBefore = store.getState();
        const currentStep = stateBefore.scenario.steps.entities[stepId];
        if (!currentStep) {
            console.error('[CommandDispatcher] Step not found:', stepId);
            return;
        }

        const previousEntity = normalizedStepToEntity(
            currentStep,
            stateBefore.scenario.relations.entities
        );

        // Применяем изменение
        this.dispatch(updateStep({ stepId, changes }));

        // Получаем новое состояние ПОСЛЕ изменения
        const stateAfter = store.getState();
        const updatedStep = stateAfter.scenario.steps.entities[stepId];
        if (!updatedStep) {
            console.error('[CommandDispatcher] Updated step not found:', stepId);
            return;
        }

        const newEntity = normalizedStepToEntity(updatedStep, stateAfter.scenario.relations.entities);

        // Записываем в историю
        this.history.recordUpdate(newEntity, previousEntity);

        console.log('[History] ✅ Step updated:', stepId);
    }

    private handleDeleteStep(command: any): void {
        const { stepId, previousState } = command.payload;

        console.log('[CommandDispatcher] Deleting step:', stepId);

        // Получаем состояние ДО удаления
        const state = store.getState();
        const step = state.scenario.steps.entities[stepId];
        if (!step) {
            console.error('[CommandDispatcher] Step not found for deletion:', stepId);
            return;
        }

        const entity = normalizedStepToEntity(step, state.scenario.relations.entities);

        // Применяем удаление
        this.dispatch(deleteStep({ branchId: step.branchId, stepId }));

        // Записываем в историю
        this.history.recordDelete(entity);

        console.log('[History] ✅ Step deleted:', stepId);
    }

    private handleMoveStep(command: any): void {
        const { stepId, branchId, x, y, previousBranchId, previousX, previousY } = command.payload;

        console.log('[CommandDispatcher] Moving step:', stepId, 'to branch:', branchId, 'position:', x, y);

        // Получаем текущее состояние ДО перемещения
        const stateBefore = store.getState();
        const currentStep = stateBefore.scenario.steps.entities[stepId];
        if (!currentStep) {
            console.error('[CommandDispatcher] Step not found for move:', stepId);
            return;
        }

        const previousEntity = normalizedStepToEntity(
            currentStep,
            stateBefore.scenario.relations.entities
        );

        // Применяем изменение
        this.dispatch(updateStep({ stepId, changes: { branchId, x, y } }));

        // Получаем новое состояние
        const stateAfter = store.getState();
        const movedStep = stateAfter.scenario.steps.entities[stepId];
        if (!movedStep) {
            console.error('[CommandDispatcher] Moved step not found:', stepId);
            return;
        }

        const newEntity = normalizedStepToEntity(movedStep, stateAfter.scenario.relations.entities);

        // Записываем в историю
        this.history.recordUpdate(newEntity, previousEntity);

        console.log('[History] ✅ Step moved:', stepId);
    }

    // ========================================================================
    // BRANCH HANDLERS
    // ========================================================================

    private handleCreateBranch(command: any): void {
        const { branch, parentStepId } = command.payload;

        console.log('[CommandDispatcher] Creating branch:', branch.id);

        // Применяем изменение
        this.dispatch(
            addBranch({
                scenarioId: command.scenarioId,
                branch,
                parentStepId: parentStepId ?? null,
            })
        );

        // Получаем созданную ветку
        const state = store.getState();
        const createdBranch = state.scenario.branches.entities[branch.id];
        if (!createdBranch) {
            console.error('[CommandDispatcher] Created branch not found:', branch.id);
            return;
        }

        // Получаем шаги ветки
        const steps = createdBranch.stepIds
            .map((id) => state.scenario.steps.entities[id])
            .filter(Boolean)
            .map((step) => denormalizeStepForHistory(step!, state.scenario.relations.entities));

        const entity = normalizedBranchToEntity(createdBranch, steps);

        // Записываем в историю
        this.history.recordCreate(entity);

        console.log('[History] ✅ Branch created:', branch.id);
    }

    private handleUpdateBranch(command: any): void {
        const { branchId, changes } = command.payload;

        console.log('[CommandDispatcher] Updating branch:', branchId, 'changes:', changes);

        // Получаем текущее состояние
        const stateBefore = store.getState();
        const currentBranch = stateBefore.scenario.branches.entities[branchId];
        if (!currentBranch) {
            console.error('[CommandDispatcher] Branch not found:', branchId);
            return;
        }

        const currentSteps = currentBranch.stepIds
            .map((id) => stateBefore.scenario.steps.entities[id])
            .filter(Boolean)
            .map((step) => denormalizeStepForHistory(step!, stateBefore.scenario.relations.entities));

        const previousEntity = normalizedBranchToEntity(currentBranch, currentSteps);

        // Применяем изменение
        this.dispatch(updateBranch({ branchId, changes }));

        // Получаем новое состояние
        const stateAfter = store.getState();
        const updatedBranch = stateAfter.scenario.branches.entities[branchId];
        if (!updatedBranch) {
            console.error('[CommandDispatcher] Updated branch not found:', branchId);
            return;
        }

        const newSteps = updatedBranch.stepIds
            .map((id) => stateAfter.scenario.steps.entities[id])
            .filter(Boolean)
            .map((step) => denormalizeStepForHistory(step!, stateAfter.scenario.relations.entities));

        const newEntity = normalizedBranchToEntity(updatedBranch, newSteps);

        // Записываем в историю
        this.history.recordUpdate(newEntity, previousEntity);

        console.log('[History] ✅ Branch updated:', branchId);
    }

    private handleDeleteBranch(command: any): void {
        const { branchId } = command.payload;

        console.log('[CommandDispatcher] Deleting branch:', branchId);

        // Получаем состояние ДО удаления
        const state = store.getState();
        const branch = state.scenario.branches.entities[branchId];
        if (!branch) {
            console.error('[CommandDispatcher] Branch not found for deletion:', branchId);
            return;
        }

        const steps = branch.stepIds
            .map((id) => state.scenario.steps.entities[id])
            .filter(Boolean)
            .map((step) => denormalizeStepForHistory(step!, state.scenario.relations.entities));

        const entity = normalizedBranchToEntity(branch, steps);

        // Применяем удаление
        this.dispatch(deleteBranch({ branchId }));

        // Записываем в историю
        this.history.recordDelete(entity);

        console.log('[History] ✅ Branch deleted:', branchId);
    }

    private handleResizeBranch(command: any): void {
        const { branchId, width, height, previousWidth, previousHeight } = command.payload;

        console.log('[CommandDispatcher] Resizing branch:', branchId, 'to', width, 'x', height);

        // Получаем текущее состояние
        const stateBefore = store.getState();
        const currentBranch = stateBefore.scenario.branches.entities[branchId];
        if (!currentBranch) {
            console.error('[CommandDispatcher] Branch not found for resize:', branchId);
            return;
        }

        const currentSteps = currentBranch.stepIds
            .map((id) => stateBefore.scenario.steps.entities[id])
            .filter(Boolean)
            .map((step) => denormalizeStepForHistory(step!, stateBefore.scenario.relations.entities));

        const previousEntity = normalizedBranchToEntity(currentBranch, currentSteps);

        // Применяем изменение
        this.dispatch(updateBranch({ branchId, changes: { width, height } }));

        // Получаем новое состояние
        const stateAfter = store.getState();
        const resizedBranch = stateAfter.scenario.branches.entities[branchId];
        if (!resizedBranch) {
            console.error('[CommandDispatcher] Resized branch not found:', branchId);
            return;
        }

        const newSteps = resizedBranch.stepIds
            .map((id) => stateAfter.scenario.steps.entities[id])
            .filter(Boolean)
            .map((step) => denormalizeStepForHistory(step!, stateAfter.scenario.relations.entities));

        const newEntity = normalizedBranchToEntity(resizedBranch, newSteps);

        // Записываем в историю
        this.history.recordUpdate(newEntity, previousEntity);

        console.log('[History] ✅ Branch resized:', branchId);
    }

    // ========================================================================
    // RELATION HANDLERS
    // ========================================================================

    private handleCreateRelation(command: any): void {
        const { relation } = command.payload;

        console.log('[CommandDispatcher] Creating relation:', relation.id);

        // Применяем изменение
        this.dispatch(addRelation(relation));

        // Получаем созданную relation
        const state = store.getState();
        const createdRelation = state.scenario.relations.entities[relation.id];
        if (!createdRelation) {
            console.error('[CommandDispatcher] Created relation not found:', relation.id);
            return;
        }

        const entity = relationToEntity(createdRelation);

        // Записываем в историю
        this.history.recordCreate(entity);

        console.log('[History] ✅ Relation created:', relation.id);
    }

    private handleUpdateRelation(command: any): void {
        const { relationId, changes } = command.payload;

        console.log('[CommandDispatcher] Updating relation:', relationId, 'changes:', changes);

        // Получаем текущее состояние
        const stateBefore = store.getState();
        const currentRelation = stateBefore.scenario.relations.entities[relationId];
        if (!currentRelation) {
            console.error('[CommandDispatcher] Relation not found:', relationId);
            return;
        }

        const previousEntity = relationToEntity(currentRelation);

        // Применяем изменение
        this.dispatch(updateRelation({ relationId, changes }));

        // Получаем новое состояние
        const stateAfter = store.getState();
        const updatedRelation = stateAfter.scenario.relations.entities[relationId];
        if (!updatedRelation) {
            console.error('[CommandDispatcher] Updated relation not found:', relationId);
            return;
        }

        const newEntity = relationToEntity(updatedRelation);

        // Записываем в историю
        this.history.recordUpdate(newEntity, previousEntity);

        console.log('[History] ✅ Relation updated:', relationId);
    }

    private handleDeleteRelation(command: any): void {
        const { relationId, previousState } = command.payload;

        console.log('[CommandDispatcher] Deleting relation:', relationId);

        // Получаем состояние ДО удаления
        const state = store.getState();
        const relation = state.scenario.relations.entities[relationId];
        if (!relation) {
            console.error('[CommandDispatcher] Relation not found for deletion:', relationId);
            return;
        }

        const entity = relationToEntity(relation);

        // Применяем удаление
        this.dispatch(deleteRelation(relationId));

        // Записываем в историю
        this.history.recordDelete(entity);

        console.log('[History] ✅ Relation deleted:', relationId);
    }
}