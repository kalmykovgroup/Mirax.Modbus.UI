// src/features/history/handlers/stepHistoryHandlers.ts

import type { EntityHandler, EntitySnapshot } from '../types.ts';
import type {
    ActivityModbusStepEntity,
    ActivitySystemStepEntity,
    DelayStepEntity,
    SignalStepEntity,
    JumpStepEntity,
    ParallelStepEntity,
    ConditionStepEntity,
} from '../entities/stepEntities';
import { store } from '@/baseStore/store';
import {addStep, deleteStep, updateStep} from "@scenario/store/scenarioSlice.ts";

// ============================================================================
// HELPER: Получить step из state
// ============================================================================

function getStepFromState(entityId: string) {
    const state = store.getState();
    return state.scenario.steps.entities[entityId] ?? null;
}

// ============================================================================
// MODBUS ACTIVITY STEP HANDLER
// ============================================================================

const ActivityModbusStepHandler: EntityHandler<ActivityModbusStepEntity> = {
    createSnapshot: (entity): EntitySnapshot<ActivityModbusStepEntity> => ({
        entityId: entity.id,
        entityType: 'ActivityModbusStep',
        data: entity,
        timestamp: Date.now(),
    }),

    apply: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    revert: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    create: (snapshot): void => {
        store.dispatch(
            addStep({
                branchId: snapshot.data.branchId,
                step: snapshot.data as any, // Type assertion needed due to normalization
            })
        );
    },

    delete: (entityId): void => {
        const step = getStepFromState(entityId);
        if (step) {
            store.dispatch(
                deleteStep({
                    branchId: step.branchId,
                    stepId: entityId,
                })
            );
        } else {
            console.warn(`[ActivityModbusStepHandler] Step ${entityId} not found for deletion`);
        }
    },
};

// ============================================================================
// SYSTEM ACTIVITY STEP HANDLER
// ============================================================================

const ActivitySystemStepHandler: EntityHandler<ActivitySystemStepEntity> = {
    createSnapshot: (entity): EntitySnapshot<ActivitySystemStepEntity> => ({
        entityId: entity.id,
        entityType: 'ActivitySystemStep',
        data: entity,
        timestamp: Date.now(),
    }),

    apply: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    revert: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    create: (snapshot): void => {
        store.dispatch(
            addStep({
                branchId: snapshot.data.branchId,
                step: snapshot.data as any,
            })
        );
    },

    delete: (entityId): void => {
        const step = getStepFromState(entityId);
        if (step) {
            store.dispatch(
                deleteStep({
                    branchId: step.branchId,
                    stepId: entityId,
                })
            );
        }
    },
};

// ============================================================================
// DELAY STEP HANDLER
// ============================================================================

const delayStepHandler: EntityHandler<DelayStepEntity> = {
    createSnapshot: (entity): EntitySnapshot<DelayStepEntity> => ({
        entityId: entity.id,
        entityType: 'DelayStep',
        data: entity,
        timestamp: Date.now(),
    }),

    apply: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    revert: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    create: (snapshot): void => {
        store.dispatch(
            addStep({
                branchId: snapshot.data.branchId,
                step: snapshot.data as any,
            })
        );
    },

    delete: (entityId): void => {
        const step = getStepFromState(entityId);
        if (step) {
            store.dispatch(
                deleteStep({
                    branchId: step.branchId,
                    stepId: entityId,
                })
            );
        }
    },
};

// ============================================================================
// SIGNAL STEP HANDLER
// ============================================================================

const signalStepHandler: EntityHandler<SignalStepEntity> = {
    createSnapshot: (entity): EntitySnapshot<SignalStepEntity> => ({
        entityId: entity.id,
        entityType: 'SignalStep',
        data: entity,
        timestamp: Date.now(),
    }),

    apply: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    revert: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    create: (snapshot): void => {
        store.dispatch(
            addStep({
                branchId: snapshot.data.branchId,
                step: snapshot.data as any,
            })
        );
    },

    delete: (entityId): void => {
        const step = getStepFromState(entityId);
        if (step) {
            store.dispatch(
                deleteStep({
                    branchId: step.branchId,
                    stepId: entityId,
                })
            );
        }
    },
};

// ============================================================================
// JUMP STEP HANDLER
// ============================================================================

const jumpStepHandler: EntityHandler<JumpStepEntity> = {
    createSnapshot: (entity): EntitySnapshot<JumpStepEntity> => ({
        entityId: entity.id,
        entityType: 'JumpStep',
        data: entity,
        timestamp: Date.now(),
    }),

    apply: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    revert: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    create: (snapshot): void => {
        store.dispatch(
            addStep({
                branchId: snapshot.data.branchId,
                step: snapshot.data as any,
            })
        );
    },

    delete: (entityId): void => {
        const step = getStepFromState(entityId);
        if (step) {
            store.dispatch(
                deleteStep({
                    branchId: step.branchId,
                    stepId: entityId,
                })
            );
        }
    },
};

// ============================================================================
// PARALLEL STEP HANDLER
// ============================================================================

const parallelStepHandler: EntityHandler<ParallelStepEntity> = {
    createSnapshot: (entity): EntitySnapshot<ParallelStepEntity> => ({
        entityId: entity.id,
        entityType: 'ParallelStep',
        data: entity,
        timestamp: Date.now(),
    }),

    apply: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    revert: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    create: (snapshot): void => {
        store.dispatch(
            addStep({
                branchId: snapshot.data.branchId,
                step: snapshot.data as any,
            })
        );
    },

    delete: (entityId): void => {
        const step = getStepFromState(entityId);
        if (step) {
            store.dispatch(
                deleteStep({
                    branchId: step.branchId,
                    stepId: entityId,
                })
            );
        }
    },
};

// ============================================================================
// CONDITION STEP HANDLER
// ============================================================================

const conditionStepHandler: EntityHandler<ConditionStepEntity> = {
    createSnapshot: (entity): EntitySnapshot<ConditionStepEntity> => ({
        entityId: entity.id,
        entityType: 'ConditionStep',
        data: entity,
        timestamp: Date.now(),
    }),

    apply: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    revert: (snapshot): void => {
        store.dispatch(
            updateStep({
                stepId: snapshot.data.id,
                changes: snapshot.data,
            })
        );
    },

    create: (snapshot): void => {
        store.dispatch(
            addStep({
                branchId: snapshot.data.branchId,
                step: snapshot.data as any,
            })
        );
    },

    delete: (entityId): void => {
        const step = getStepFromState(entityId);
        if (step) {
            store.dispatch(
                deleteStep({
                    branchId: step.branchId,
                    stepId: entityId,
                })
            );
        }
    },
};

// ============================================================================
// REGISTRATION
// ============================================================================

export function registerStepHandlers(): void {
    // Динамический импорт для избежания circular dependency
    import('../historyRegistry').then(({ historyRegistry }) => {
        historyRegistry.register<ActivityModbusStepEntity>('ActivityModbusStep', ActivityModbusStepHandler);
        historyRegistry.register<ActivitySystemStepEntity>('ActivitySystemStep', ActivitySystemStepHandler);
        historyRegistry.register<DelayStepEntity>('DelayStep', delayStepHandler);
        historyRegistry.register<SignalStepEntity>('SignalStep', signalStepHandler);
        historyRegistry.register<JumpStepEntity>('JumpStep', jumpStepHandler);
        historyRegistry.register<ParallelStepEntity>('ParallelStep', parallelStepHandler);
        historyRegistry.register<ConditionStepEntity>('ConditionStep', conditionStepHandler);

        console.log('[History] ✅ All step handlers registered');
    });
}