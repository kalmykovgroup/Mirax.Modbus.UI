// src/features/scenario/commands/builders/commandBuilders.ts

import type { Guid } from '@app/lib/types/Guid';
import type {
    BatchCommand,
    BatchCommandPayload,
    CreateBranchCommand,
    CreateBranchPayload, CreateRelationCommand, CreateRelationPayload,
    CreateStepCommand,
    CreateStepPayload, DeleteBranchCommand, DeleteBranchPayload, DeleteRelationCommand,
    DeleteRelationPayload, DeleteStepCommand, DeleteStepPayload,
    MoveStepCommand, MoveStepPayload, ResizeBranchCommand,
    ResizeBranchPayload, UpdateBranchCommand, UpdateBranchPayload, UpdateRelationCommand,
    UpdateRelationPayload, UpdateStepCommand, UpdateStepPayload
} from "@scenario/core/features/scenarioChangeCenter/scenarioCommands.ts";


/**
 * Утилита для создания команд с автоматическими метаданными
 */
function createCommand<T extends string, P>(
    type: T,
    scenarioId: Guid,
    payload: P,
    description?: string | undefined
) {
    return {
        type,
        scenarioId,
        payload,
        metadata: {
            timestamp: Date.now(),
            description,
        },
    };
}

// ============================================================================
// STEP COMMAND BUILDERS
// ============================================================================

export const StepCommands = {
    create: (scenarioId: Guid, payload: CreateStepPayload, description?: string): CreateStepCommand =>
        createCommand('CREATE_STEP', scenarioId, payload, description ?? 'Создать шаг') as CreateStepCommand,

    update: (scenarioId: Guid, payload: UpdateStepPayload, description?: string): UpdateStepCommand =>
        createCommand('UPDATE_STEP', scenarioId, payload, description ?? 'Обновить шаг') as UpdateStepCommand,

    delete: (scenarioId: Guid, payload: DeleteStepPayload, description?: string): DeleteStepCommand =>
        createCommand('DELETE_STEP', scenarioId, payload, description ?? 'Удалить шаг') as DeleteStepCommand,

    move: (scenarioId: Guid, payload: MoveStepPayload, description?: string): MoveStepCommand =>
        createCommand('MOVE_STEP', scenarioId, payload, description ?? 'Переместить шаг') as MoveStepCommand,
};

// ============================================================================
// BRANCH COMMAND BUILDERS
// ============================================================================

export const BranchCommands = {
    create: (scenarioId: Guid, payload: CreateBranchPayload, description?: string): CreateBranchCommand =>
        createCommand('CREATE_BRANCH', scenarioId, payload, description ?? 'Создать ветку') as CreateBranchCommand,

    update: (scenarioId: Guid, payload: UpdateBranchPayload, description?: string): UpdateBranchCommand =>
        createCommand('UPDATE_BRANCH', scenarioId, payload, description ?? 'Обновить ветку') as UpdateBranchCommand,

    delete: (scenarioId: Guid, payload: DeleteBranchPayload, description?: string): DeleteBranchCommand =>
        createCommand('DELETE_BRANCH', scenarioId, payload, description ?? 'Удалить ветку') as DeleteBranchCommand,

    resize: (scenarioId: Guid, payload: ResizeBranchPayload, description?: string): ResizeBranchCommand =>
        createCommand('RESIZE_BRANCH', scenarioId, payload, description ?? 'Изменить размер ветки') as ResizeBranchCommand,
};

// ============================================================================
// RELATION COMMAND BUILDERS
// ============================================================================

export const RelationCommands = {
    create: (
        scenarioId: Guid,
        payload: CreateRelationPayload,
        description?: string
    ): CreateRelationCommand =>
        createCommand('CREATE_RELATION', scenarioId, payload, description ?? 'Создать связь') as CreateRelationCommand,

    update: (
        scenarioId: Guid,
        payload: UpdateRelationPayload,
        description?: string
    ): UpdateRelationCommand =>
        createCommand('UPDATE_RELATION', scenarioId, payload, description ?? 'Обновить связь') as UpdateRelationCommand,

    delete: (
        scenarioId: Guid,
        payload: DeleteRelationPayload,
        description?: string
    ): DeleteRelationCommand =>
        createCommand('DELETE_RELATION', scenarioId, payload, description ?? 'Удалить связь') as DeleteRelationCommand,
};

// ============================================================================
// BATCH COMMAND BUILDER
// ============================================================================

export const BatchCommands = {
    create: (scenarioId: Guid, payload: BatchCommandPayload): BatchCommand =>
        createCommand('BATCH', scenarioId, payload, payload.description ?? 'Групповая операция') as BatchCommand,
};