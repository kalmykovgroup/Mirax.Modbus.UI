// src/features/scenarioEditor/core/ui/edges/StepRelationContract.ts

import type { EntitySnapshot, Entity } from '@scenario/core/features/historySystem/types';
import  { Guid } from '@app/lib/types/Guid';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto';
import { store } from '@/baseStore/store';
import { addRelation, deleteRelation, findScenarioIdByStepId, findScenarioIdByRelationId } from '@scenario/store/scenarioSlice';


export interface StepRelationContract {
    readonly type: 'StepRelation';

    /**
     * Создать новую связь между степами (только DTO, БЕЗ dispatch)
     */
    readonly create: (params: {
        parentStepId: Guid;
        childStepId: Guid;
        conditionExpression?: string | null;
        conditionOrder?: number;
    }) => StepRelationDto;

    /**
     * Валидация перед созданием связи
     */
    readonly validateCreate: (params: {
        parentStepId: Guid;
        childStepId: Guid;
    }) => { valid: boolean; error?: string };

    /**
     * Хук жизненного цикла - после создания
     */
    readonly onCreated?: (dto: StepRelationDto) => void;

    /**
     * Хук жизненного цикла - перед удалением
     */
    readonly onBeforeDelete?: (dto: StepRelationDto) => void;

    /**
     * Хук жизненного цикла - после обновления
     */
    readonly onUpdated?: (previousDto: StepRelationDto, newDto: StepRelationDto) => void;

    // ============================================================================
    // МЕТОДЫ ИСТОРИИ (как в SignalStepNodeContract)
    // ============================================================================

    readonly createSnapshot: (dto: StepRelationDto) => EntitySnapshot<Entity>;
    readonly applySnapshot: (snapshot: EntitySnapshot<Entity>) => void;
    readonly revertSnapshot: (snapshot: EntitySnapshot<Entity>) => void;
    readonly createFromSnapshot: (snapshot: EntitySnapshot<Entity>) => void;
    readonly deleteEntity: (entityId: Guid, scenarioId?: Guid) => void;
}

export const stepRelationContract: StepRelationContract = {
    type: 'StepRelation',

    // ============================================================================
    // СОЗДАНИЕ DTO
    // ============================================================================

    create: (params) => {
        return {
            id: Guid.NewGuid(),
            parentStepId: params.parentStepId,
            childStepId: params.childStepId,
            conditionExpression: params.conditionExpression ?? null,
            conditionOrder: params.conditionOrder ?? 0,
        };
    },

    // ============================================================================
    // ВАЛИДАЦИЯ
    // ============================================================================

    validateCreate: (params) => {
        if (!params.parentStepId) {
            return { valid: false, error: 'parentStepId не может быть пустым' };
        }

        if (!params.childStepId) {
            return { valid: false, error: 'childStepId не может быть пустым' };
        }

        if (params.parentStepId === params.childStepId) {
            return { valid: false, error: 'Нельзя создать связь на самого себя' };
        }

        return { valid: true };
    },

    // ============================================================================
    // ХУКИ ЖИЗНЕННОГО ЦИКЛА
    // ============================================================================

    onCreated: (dto) => {
        console.log(`[StepRelationContract] ✅ Created relation: ${dto.id}`, {
            parentStepId: dto.parentStepId,
            childStepId: dto.childStepId,
        });
    },

    onBeforeDelete: (dto) => {
        console.log(`[StepRelationContract] 🗑️ Deleting relation: ${dto.id}`, dto);
    },

    onUpdated: (previousDto, newDto) => {
        console.log(`[StepRelationContract] 📝 Updated relation: ${newDto.id}`, {
            changes: {
                conditionExpression:
                    previousDto.conditionExpression !== newDto.conditionExpression
                        ? { from: previousDto.conditionExpression, to: newDto.conditionExpression }
                        : undefined,
                conditionOrder:
                    previousDto.conditionOrder !== newDto.conditionOrder
                        ? { from: previousDto.conditionOrder, to: newDto.conditionOrder }
                        : undefined,
            },
        });
    },

    // ============================================================================
    // МЕТОДЫ ИСТОРИИ (аналогично SignalStepNodeContract)
    // ============================================================================

    createSnapshot: (dto): EntitySnapshot<Entity> => {
        console.log('[StepRelationContract] Creating snapshot for:', dto.id);

        return {
            entityId: dto.id,
            entityType: 'StepRelation',
            data: {
                ...dto,
                entityType: 'StepRelation',
            } as Entity,
            timestamp: Date.now(),
        };
    },

    applySnapshot: (snapshot) => {
        console.log('[StepRelationContract] Applying snapshot (redo):', snapshot.entityId);

        const { entityType, ...dto } = snapshot.data;
        const relation = dto as StepRelationDto;
        const state = store.getState();

        // Находим scenarioId через parentStepId (оба степа должны быть в одном сценарии)
        const scenarioId = findScenarioIdByStepId(state.scenario, relation.parentStepId);

        if (!scenarioId) {
            console.error(`[StepRelationContract] Scenario not found for relation ${relation.id} (parentStep: ${relation.parentStepId})`);
            return;
        }

        store.dispatch(addRelation({ scenarioId, relation }));

        console.log('[StepRelationContract] ✅ Snapshot applied');
    },

    revertSnapshot: (snapshot) => {
        console.log('[StepRelationContract] Reverting snapshot (undo):', snapshot.entityId);

        const { entityType, ...dto } = snapshot.data;
        const relation = dto as StepRelationDto;
        const state = store.getState();

        // Находим scenarioId через parentStepId
        const scenarioId = findScenarioIdByStepId(state.scenario, relation.parentStepId);

        if (!scenarioId) {
            console.error(`[StepRelationContract] Scenario not found for relation ${relation.id} (parentStep: ${relation.parentStepId})`);
            return;
        }

        store.dispatch(addRelation({ scenarioId, relation }));

        console.log('[StepRelationContract] ✅ Snapshot reverted');
    },

    createFromSnapshot: (snapshot) => {
        console.log('[StepRelationContract] Creating relation from snapshot:', snapshot.entityId);

        const { entityType, ...dto } = snapshot.data;
        const relation = dto as StepRelationDto;
        const state = store.getState();

        // Находим scenarioId через parentStepId
        const scenarioId = findScenarioIdByStepId(state.scenario, relation.parentStepId);

        if (!scenarioId) {
            console.error(`[StepRelationContract] Scenario not found for relation ${relation.id} (parentStep: ${relation.parentStepId})`);
            return;
        }

        store.dispatch(addRelation({ scenarioId, relation }));

        console.log('[StepRelationContract] ✅ Relation created from snapshot');
    },

    deleteEntity: (entityId, scenarioId) => {
        console.log('[StepRelationContract] Deleting entity:', entityId);

        const state = store.getState();

        // scenarioId может быть передан явно (из useScenarioOperations) или найден через relationId
        let actualScenarioId: string | undefined | null = scenarioId;
        if (!actualScenarioId) {
            actualScenarioId = findScenarioIdByRelationId(state.scenario, entityId);
        }

        if (!actualScenarioId) {
            console.error(`[StepRelationContract] Scenario not found for relation ${entityId}`);
            return;
        }

        const scenarioState = state.scenario.scenarios[actualScenarioId];
        if (!scenarioState) {
            console.error(`[StepRelationContract] Scenario ${actualScenarioId} not found in store`);
            return;
        }

        const relation = scenarioState.relations[entityId];

        if (relation) {
            store.dispatch(deleteRelation({ scenarioId: actualScenarioId, relationId: entityId }));
            console.log('[StepRelationContract] ✅ Entity deleted');
        } else {
            console.warn(`[StepRelationContract] ⚠️ Relation ${entityId} not found for deletion`);
        }
    },
} as const;