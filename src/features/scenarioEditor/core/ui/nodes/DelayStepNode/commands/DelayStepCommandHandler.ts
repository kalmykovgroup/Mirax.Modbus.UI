// src/features/scenarioEditor/nodes/delayStep/commands/DelayStepCommandHandler.ts

import type { CommandHandler } from '@scenario/shared/contracts/registry/CommandHandler';
import {
    isCreateStepCommand,
    isUpdateStepCommand,
    isDeleteStepCommand,
    isMoveStepCommand,
} from '@scenario/core/features/scenarioChangeCenter/scenarioCommands';
import { addStep, updateStep, deleteStep } from '@scenario/store/scenarioSlice';
import { StepType } from '@scenario/shared/contracts/server/types/Api.Shared/StepType';
import type { DelayStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';

export const DelayStepCreateCommandHandler: CommandHandler = {
    commandType: 'CREATE_STEP',

    canHandle: (command) => {
        return isCreateStepCommand(command) && command.payload.step.type === StepType.Delay;
    },

    execute: (command, dispatch, history) => {
        if (!isCreateStepCommand(command) || command.payload.step.type !== StepType.Delay) return;

        const { step, branchId } = command.payload;

        console.log('[DelayStepCommandHandler] Creating step:', step.id);

        dispatch(addStep({ branchId, step }));

        history.recordCreate({
            ...(step as DelayStepDto),
            entityType: 'DelayStep',
        });
        console.log('[History] ✅ DelayStep created:', step.id);
    },
};

export const DelayStepUpdateCommandHandler: CommandHandler = {
    commandType: 'UPDATE_STEP',

    canHandle: (command) => {
        return (
            isUpdateStepCommand(command) &&
            command.payload.previousState.type === StepType.Delay
        );
    },

    execute: (command, dispatch, history) => {
        if (
            !isUpdateStepCommand(command) ||
            command.payload.previousState.type !== StepType.Delay
        )
            return;

        const { stepId, previousState, newState } = command.payload;

        console.log('[DelayStepCommandHandler] Updating step:', stepId);

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
            { ...(newState as DelayStepDto), entityType: 'DelayStep' },
            { ...(previousState as DelayStepDto), entityType: 'DelayStep' }
        );
        console.log('[History] ✅ DelayStep updated:', stepId);
    },
};

export const DelayStepDeleteCommandHandler: CommandHandler = {
    commandType: 'DELETE_STEP',

    canHandle: (command) => {
        return (
            isDeleteStepCommand(command) &&
            command.payload.deletedState.type === StepType.Delay
        );
    },

    execute: (command, dispatch, history) => {
        if (
            !isDeleteStepCommand(command) ||
            command.payload.deletedState.type !== StepType.Delay
        )
            return;

        const { stepId, branchId, deletedState } = command.payload;

        console.log('[DelayStepCommandHandler] Deleting step:', stepId);

        dispatch(deleteStep({ branchId, stepId }));

        history.recordDelete({
            ...(deletedState as DelayStepDto),
            entityType: 'DelayStep',
        });
        console.log('[History] ✅ DelayStep deleted:', stepId);
    },
};

export const DelayStepMoveCommandHandler: CommandHandler = {
    commandType: 'MOVE_STEP',

    canHandle: (command) => {
        return isMoveStepCommand(command) && command.payload.previousState.type === StepType.Delay;
    },

    execute: (command, dispatch, history) => {
        if (!isMoveStepCommand(command) || command.payload.previousState.type !== StepType.Delay)
            return;

        const { stepId, previousState, newState } = command.payload;

        console.log('[DelayStepCommandHandler] Moving step:', stepId);

        dispatch(
            updateStep({
                stepId,
                changes: { branchId: newState.branchId, x: newState.x, y: newState.y },
            })
        );

        history.recordUpdate(
            { ...(newState as DelayStepDto), entityType: 'DelayStep' },
            { ...(previousState as DelayStepDto), entityType: 'DelayStep' }
        );
        console.log('[History] ✅ DelayStep moved:', stepId);
    },
};