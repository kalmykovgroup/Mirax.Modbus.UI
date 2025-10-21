// src/features/scenarioEditor/nodes/signalStep/commands/SignalStepCommandHandler.ts

import type { CommandHandler } from '@scenario/shared/contracts/registry/CommandHandler';
import {
    isCreateStepCommand,
    isUpdateStepCommand,
    isDeleteStepCommand,
    isMoveStepCommand,
} from '@scenario/core/features/scenarioChangeCenter/scenarioCommands';
import { addStep, updateStep, deleteStep } from '@scenario/store/scenarioSlice';
import { StepType } from '@scenario/shared/contracts/server/types/Api.Shared/StepType';
import type { SignalStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';

export const SignalStepCreateCommandHandler: CommandHandler = {
    commandType: 'CREATE_STEP',
    canHandle: (command) =>
        isCreateStepCommand(command) && command.payload.step.type === StepType.Signal,
    execute: (command, dispatch, history) => {
        if (!isCreateStepCommand(command) || command.payload.step.type !== StepType.Signal) return;
        const { step, branchId } = command.payload;
        dispatch(addStep({ branchId, step }));
        history.recordCreate({ ...(step as SignalStepDto), entityType: 'SignalStep' });
        console.log('[History] ✅ SignalStep created:', step.id);
    },
};

export const SignalStepUpdateCommandHandler: CommandHandler = {
    commandType: 'UPDATE_STEP',
    canHandle: (command) =>
        isUpdateStepCommand(command) && command.payload.previousState.type === StepType.Signal,
    execute: (command, dispatch, history) => {
        if (!isUpdateStepCommand(command) || command.payload.previousState.type !== StepType.Signal)
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
            { ...(newState as SignalStepDto), entityType: 'SignalStep' },
            { ...(previousState as SignalStepDto), entityType: 'SignalStep' }
        );
        console.log('[History] ✅ SignalStep updated:', stepId);
    },
};

export const SignalStepDeleteCommandHandler: CommandHandler = {
    commandType: 'DELETE_STEP',
    canHandle: (command) =>
        isDeleteStepCommand(command) && command.payload.deletedState.type === StepType.Signal,
    execute: (command, dispatch, history) => {
        if (!isDeleteStepCommand(command) || command.payload.deletedState.type !== StepType.Signal)
            return;
        const { stepId, branchId, deletedState } = command.payload;
        dispatch(deleteStep({ branchId, stepId }));
        history.recordDelete({ ...(deletedState as SignalStepDto), entityType: 'SignalStep' });
        console.log('[History] ✅ SignalStep deleted:', stepId);
    },
};

export const SignalStepMoveCommandHandler: CommandHandler = {
    commandType: 'MOVE_STEP',
    canHandle: (command) =>
        isMoveStepCommand(command) && command.payload.previousState.type === StepType.Signal,
    execute: (command, dispatch, history) => {
        if (!isMoveStepCommand(command) || command.payload.previousState.type !== StepType.Signal)
            return;
        const { stepId, previousState, newState } = command.payload;
        dispatch(
            updateStep({
                stepId,
                changes: { branchId: newState.branchId, x: newState.x, y: newState.y },
            })
        );
        history.recordUpdate(
            { ...(newState as SignalStepDto), entityType: 'SignalStep' },
            { ...(previousState as SignalStepDto), entityType: 'SignalStep' }
        );
        console.log('[History] ✅ SignalStep moved:', stepId);
    },
};