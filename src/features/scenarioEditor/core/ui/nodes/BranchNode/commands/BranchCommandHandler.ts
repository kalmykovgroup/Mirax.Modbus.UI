// src/features/scenarioEditor/nodes/branchNode/commands/BranchCommandHandler.ts

import type { CommandHandler } from '@scenario/shared/contracts/registry/CommandHandler';
import {
    isCreateBranchCommand,
    isUpdateBranchCommand,
    isDeleteBranchCommand,
    isResizeBranchCommand,
} from '@scenario/core/features/scenarioChangeCenter/scenarioCommands';
import { addBranch, updateBranch, deleteBranch } from '@scenario/store/scenarioSlice';

export const BranchCreateCommandHandler: CommandHandler = {
    commandType: 'CREATE_BRANCH',

    canHandle: isCreateBranchCommand,

    execute: (command, dispatch, history) => {
        if (!isCreateBranchCommand(command)) return;

        const { branch, parentStepId } = command.payload;

        console.log('[BranchCommandHandler] Creating branch:', branch.id);

        dispatch(
            addBranch({
                scenarioId: command.scenarioId,
                branch,
                parentStepId: parentStepId ?? null,
            })
        );

        history.recordCreate({ ...branch, entityType: 'Branch' });
        console.log('[History] ✅ Branch created:', branch.id);
    },
};

export const BranchUpdateCommandHandler: CommandHandler = {
    commandType: 'UPDATE_BRANCH',

    canHandle: isUpdateBranchCommand,

    execute: (command, dispatch, history) => {
        if (!isUpdateBranchCommand(command)) return;

        const { branchId, previousState, newState } = command.payload;

        console.log('[BranchCommandHandler] Updating branch:', branchId);

        // Вычисляем изменения
        const changes: Partial<typeof newState> = {};
        for (const key in newState) {
            if (newState[key as keyof typeof newState] !== previousState[key as keyof typeof previousState]) {
                (changes as any)[key] = newState[key as keyof typeof newState];
            }
        }

        dispatch(updateBranch({ branchId, changes }));

        history.recordUpdate(
            { ...newState, entityType: 'Branch' },
            { ...previousState, entityType: 'Branch' }
        );
        console.log('[History] ✅ Branch updated:', branchId);
    },
};

export const BranchDeleteCommandHandler: CommandHandler = {
    commandType: 'DELETE_BRANCH',

    canHandle: isDeleteBranchCommand,

    execute: (command, dispatch, history) => {
        if (!isDeleteBranchCommand(command)) return;

        const { branchId, deletedState } = command.payload;

        console.log('[BranchCommandHandler] Deleting branch:', branchId);

        dispatch(deleteBranch({ branchId }));

        history.recordDelete({ ...deletedState, entityType: 'Branch' });
        console.log('[History] ✅ Branch deleted:', branchId);
    },
};

export const BranchResizeCommandHandler: CommandHandler = {
    commandType: 'RESIZE_BRANCH',

    canHandle: isResizeBranchCommand,

    execute: (command, dispatch, history) => {
        if (!isResizeBranchCommand(command)) return;

        const { branchId, previousState, newState } = command.payload;

        console.log('[BranchCommandHandler] Resizing branch:', branchId);

        dispatch(updateBranch({ branchId, changes: { width: newState.width, height: newState.height } }));

        history.recordUpdate(
            { ...newState, entityType: 'Branch' },
            { ...previousState, entityType: 'Branch' }
        );
        console.log('[History] ✅ Branch resized:', branchId);
    },
};