// src/features/scenarioEditor/nodes/activitySystem/commands/ActivitySystemCommandHandler.ts

import type { CommandHandler } from '@scenario/shared/contracts/registry/CommandHandler';
import {
    isCreateStepCommand,
    isUpdateStepCommand,
    isDeleteStepCommand,
    isMoveStepCommand,
} from '@scenario/core/features/scenarioChangeCenter/scenarioCommands';
import { addStep, updateStep, deleteStep } from '@scenario/store/scenarioSlice';
import { StepType } from '@scenario/shared/contracts/server/types/Api.Shared/StepType';
import type { ActivitySystemStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';

export const ActivitySystemCreateCommandHandler: CommandHandler = {
    commandType: 'CREATE_STEP',
    canHandle: (command) =>
        isCreateStepCommand(command) && command.payload.step.type === StepType.ActivitySystem,
    execute: (command, dispatch, history) => {
        if (!isCreateStepCommand(command) || command.payload.step.type !== StepType.ActivitySystem)
            return;
        const { step, branchId } = command.payload;
        dispatch(addStep({ branchId, step }));
        history.recordCreate({
            ...(step as ActivitySystemStepDto),
            entityType: 'ActivitySystemStep',
        });
        console.log('[History] ✅ ActivitySystemStep created:', step.id);
    },
};

export const ActivitySystemUpdateCommandHandler: CommandHandler = {
    commandType: 'UPDATE_STEP',
    canHandle: (command) =>
        isUpdateStepCommand(command) &&
        command.payload.previousState.type === StepType.ActivitySystem,
    execute: (command, dispatch, history) => {
        if (
            !isUpdateStepCommand(command) ||
            command.payload.previousState.type !== StepType.ActivitySystem
        )
            return;
        const { stepId, previousState, newState } = command.payload;
        const changes: Partial<typeof newState> = {};
        for (const key in newState) {
            if (
                newState[key as keyof typeof newState] !==
                previousState[key as keyof typeof previousState]
            ) {
                (changes as any)[key] = newState[key as keyof typeof newState];
            }
        }
        dispatch(updateStep({ stepId, changes }));
        history.recordUpdate(
            { ...(newState as ActivitySystemStepDto), entityType: 'ActivitySystemStep' },
            { ...(previousState as ActivitySystemStepDto), entityType: 'ActivitySystemStep' }
        );
        console.log('[History] ✅ ActivitySystemStep updated:', stepId);
    },
};

export const ActivitySystemDeleteCommandHandler: CommandHandler = {
    commandType: 'DELETE_STEP',
    canHandle: (command) =>
        isDeleteStepCommand(command) &&
        command.payload.deletedState.type === StepType.ActivitySystem,
    execute: (command, dispatch, history) => {
        if (
            !isDeleteStepCommand(command) ||
            command.payload.deletedState.type !== StepType.ActivitySystem
        )
            return;
        const { stepId, branchId, deletedState } = command.payload;
        dispatch(deleteStep({ branchId, stepId }));
        history.recordDelete({
            ...(deletedState as ActivitySystemStepDto),
            entityType: 'ActivitySystemStep',
        });
        console.log('[History] ✅ ActivitySystemStep deleted:', stepId);
    },
};

export const ActivitySystemMoveCommandHandler: CommandHandler = {
    commandType: 'MOVE_STEP',
    canHandle: (command) =>
        isMoveStepCommand(command) &&
        command.payload.previousState.type === StepType.ActivitySystem,
    execute: (command, dispatch, history) => {
        if (
            !isMoveStepCommand(command) ||
            command.payload.previousState.type !== StepType.ActivitySystem
        )
            return;
        const { stepId, previousState, newState } = command.payload;
        dispatch(
            updateStep({
                stepId,
                changes: { branchId: newState.branchId, x: newState.x, y: newState.y },
            })
        );
        history.recordUpdate(
            { ...(newState as ActivitySystemStepDto), entityType: 'ActivitySystemStep' },
            { ...(previousState as ActivitySystemStepDto), entityType: 'ActivitySystemStep' }
        );
        console.log('[History] ✅ ActivitySystemStep moved:', stepId);
    },
};