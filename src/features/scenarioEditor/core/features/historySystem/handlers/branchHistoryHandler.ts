// src/features/history/handlers/branchHistoryHandler.ts

import type { EntityHandler, EntitySnapshot, Entity } from '../types.ts';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import { store } from '@/baseStore/store';
import {addBranch, deleteBranch, updateBranch} from "@scenario/store/scenarioSlice.ts";

// ============================================================================
// ENTITY WRAPPER
// ============================================================================

export interface BranchEntity extends BranchDto, Entity {
    readonly entityType: 'Branch';
}

// ============================================================================
// HANDLER
// ============================================================================

const branchHandler: EntityHandler<BranchEntity> = {
    createSnapshot: (entity): EntitySnapshot<BranchEntity> => ({
        entityId: entity.id,
        entityType: 'Branch',
        data: entity,
        timestamp: Date.now(),
    }),

    apply: (snapshot): void => {
        store.dispatch(
            updateBranch({
                branchId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    revert: (snapshot): void => {
        store.dispatch(
            updateBranch({
                branchId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    create: (snapshot): void => {
        store.dispatch(
            addBranch({
                scenarioId: snapshot.data.scenarioId,
                branch: snapshot.data,
                parentStepId: snapshot.data.parallelStepId ?? snapshot.data.conditionStepId ?? null,
            })
        );
    },

    delete: (entityId): void => {
        store.dispatch(
            deleteBranch({
                branchId: entityId,
            })
        );
    },
};

// ============================================================================
// REGISTRATION
// ============================================================================

export function registerBranchHandler(): void {
    import('../historyRegistry').then(({ historyRegistry }) => {
        historyRegistry.register<BranchEntity>('Branch', branchHandler);
        console.log('[History] ✅ Branch handler registered');
    });
}