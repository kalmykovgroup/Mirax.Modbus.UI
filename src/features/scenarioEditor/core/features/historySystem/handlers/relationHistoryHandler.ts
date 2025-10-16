// src/features/history/handlers/relationHistoryHandler.ts

import type { EntityHandler, EntitySnapshot, Entity } from '../types.ts';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto';
import { store } from '@/baseStore/store';
import {addRelation, deleteRelation, updateRelation} from "@scenario/store/scenarioSlice.ts";

// ============================================================================
// ENTITY WRAPPER
// ============================================================================

export interface RelationEntity extends StepRelationDto, Entity {
    readonly entityType: 'StepRelation';
}

// ============================================================================
// HANDLER
// ============================================================================

const relationHandler: EntityHandler<RelationEntity> = {
    createSnapshot: (entity): EntitySnapshot<RelationEntity> => ({
        entityId: entity.id,
        entityType: 'StepRelation',
        data: entity,
        timestamp: Date.now(),
    }),

    apply: (snapshot): void => {
        store.dispatch(
            updateRelation({
                relationId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    revert: (snapshot): void => {
        store.dispatch(
            updateRelation({
                relationId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    create: (snapshot): void => {
        store.dispatch(addRelation(snapshot.data));
    },

    delete: (entityId): void => {
        store.dispatch(deleteRelation(entityId));
    },
};

// ============================================================================
// REGISTRATION
// ============================================================================

export function registerRelationHandler(): void {
    import('../historyRegistry').then(({ historyRegistry }) => {
        historyRegistry.register<RelationEntity>('StepRelation', relationHandler);
        console.log('[History] ✅ StepRelation handler registered');
    });
}