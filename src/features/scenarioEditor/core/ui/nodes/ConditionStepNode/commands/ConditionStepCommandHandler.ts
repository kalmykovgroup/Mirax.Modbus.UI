// src/features/scenarioEditor/nodes/conditionStep/commands/ConditionStepCommandHandler.ts

import type { CommandHandler } from '@scenario/shared/contracts/registry/CommandHandler';
import {
    isCreateStepCommand,
    isUpdateStepCommand,
    isDeleteStepCommand,
    isMoveStepCommand,
} from '@scenario/core/features/scenarioChangeCenter/scenarioCommands';
import { addStep, updateStep, deleteStep } from '@scenario/store/scenarioSlice';
import { StepType } from '@scenario/shared/contracts/server/types/Api.Shared/StepType';
import type { ConditionStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';

export const ConditionStepCreateCommandHandler: CommandHandler = {
    commandType: 'CREATE_STEP',
    canHandle: (command) =>
        isCreateStepCommand(command) && command.payload.step.type === StepType.Condition,
    execute: (command, dispatch, history) => {
        if (!isCreateStepCommand(command) || command.payload.step.type !== StepType.Condition)
            return;
        const { step, branchId } = command.payload;
        dispatch(addStep({ branchId, step }));
        history.recordCreate({ ...(step as ConditionStepDto), entityType: 'ConditionStep' });
        console.log('[History] ✅ ConditionStep created:', step.id);
    },
};

export const ConditionStepUpdateCommandHandler: CommandHandler = {
    commandType: 'UPDATE_STEP',
    canHandle: (command) =>
        isUpdateStepCommand(command) && command.payload.previousState.type === StepType.Condition,
    execute: (command, dispatch, history) => {
        if (
            !isUpdateStepCommand(command) ||
            command.payload.previousState.type !== StepType.Condition
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
            { ...(newState as ConditionStepDto), entityType: 'ConditionStep' },
            { ...(previousState as ConditionStepDto), entityType: 'ConditionStep' }
        );
        console.log('[History] ✅ ConditionStep updated:', stepId);
    },
};

export const ConditionStepDeleteCommandHandler: CommandHandler = {
    commandType: 'DELETE_STEP',
    canHandle: (command) =>
        isDeleteStepCommand(command) && command.payload.deletedState.type === StepType.Condition,
    execute: (command, dispatch, history) => {
        if (
            !isDeleteStepCommand(command) ||
            command.payload.deletedState.type !== StepType.Condition
        )
            return;
        const { stepId, branchId, deletedState } = command.payload;
        dispatch(deleteStep({ branchId, stepId }));
        history.recordDelete({
            ...(deletedState as ConditionStepDto),
            entityType: 'ConditionStep',
        });
        console.log('[History] ✅ ConditionStep deleted:', stepId);
    },
};

export const ConditionStepMoveCommandHandler: CommandHandler = {
    commandType: 'MOVE_STEP',
    canHandle: (command) =>
        isMoveStepCommand(command) && command.payload.previousState.type === StepType.Condition,
    execute: (command, dispatch, history) => {
        if (
            !isMoveStepCommand(command) ||
            command.payload.previousState.type !== StepType.Condition
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
            { ...(newState as ConditionStepDto), entityType: 'ConditionStep' },
            { ...(previousState as ConditionStepDto), entityType: 'ConditionStep' }
        );
        console.log('[History] ✅ ConditionStep moved:', stepId);
    },
};