// src/features/scenarioEditor/core/features/scenarioChangeCenter/relations/commands/RelationCommandHandler.ts

import type { CommandHandler } from '@scenario/shared/contracts/registry/CommandHandler';
import {
    isCreateRelationCommand,
    isUpdateRelationCommand,
    isDeleteRelationCommand,
} from '@scenario/core/features/scenarioChangeCenter/scenarioCommands';
import { addRelation, updateRelation, deleteRelation } from '@scenario/store/scenarioSlice';

export const RelationCreateCommandHandler: CommandHandler = {
    commandType: 'CREATE_RELATION',
    canHandle: isCreateRelationCommand,
    execute: (command, dispatch, history) => {
        if (!isCreateRelationCommand(command)) return;
        const { relation } = command.payload;
        dispatch(addRelation(relation));
        history.recordCreate({ ...relation, entityType: 'StepRelation' });
        console.log('[History]  Relation created:', relation.id);
    },
};

export const RelationUpdateCommandHandler: CommandHandler = {
    commandType: 'UPDATE_RELATION',
    canHandle: isUpdateRelationCommand,
    execute: (command, dispatch, history) => {
        if (!isUpdateRelationCommand(command)) return;
        const { relationId, previousState, newState } = command.payload;
        const changes: Partial<typeof newState> = {};
        for (const key in newState) {
            if (
                newState[key as keyof typeof newState] !==
                previousState[key as keyof typeof previousState]
            ) {
                (changes as any)[key] = newState[key as keyof typeof newState];
            }
        }
        dispatch(updateRelation({ relationId, changes }));
        history.recordUpdate(
            { ...newState, entityType: 'StepRelation' },
            { ...previousState, entityType: 'StepRelation' }
        );
        console.log('[History]  Relation updated:', relationId);
    },
};

export const RelationDeleteCommandHandler: CommandHandler = {
    commandType: 'DELETE_RELATION',
    canHandle: isDeleteRelationCommand,
    execute: (command, dispatch, history) => {
        if (!isDeleteRelationCommand(command)) return;
        const { relationId, deletedState } = command.payload;
        dispatch(deleteRelation(relationId));
        history.recordDelete({ ...deletedState, entityType: 'StepRelation' });
        console.log('[History]  Relation deleted:', relationId);
    },
};