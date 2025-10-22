// src/features/scenarioEditor/core/features/historySystem/historyRegistry.ts

import type { EntitySnapshot } from './types';
import { nodeTypeRegistry } from '@scenario/shared/contracts/registry/NodeTypeRegistry';
import type { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { Guid } from '@app/lib/types/Guid';

/**
 * Реестр истории — работает через NodeTypeRegistry
 */
class HistoryRegistry {
    /**
     * Создать снимок для любой сущности
     */
    createSnapshot<T extends { id: Guid; entityType: string }>(entity: T): EntitySnapshot<T> {
        const contract = nodeTypeRegistry.get(entity.entityType as FlowType);
        if (!contract?.createSnapshot) {
            console.error(`[HistoryRegistry] No createSnapshot for type: ${entity.entityType}`);
            throw new Error(`No contract for entity type: ${entity.entityType}`);
        }

        return contract.createSnapshot(entity as any) as EntitySnapshot<T>;
    }

    /**
     * Применить снимок (redo)
     */
    applySnapshot<T extends { id: Guid; entityType: string }>(snapshot: EntitySnapshot<T>): void {
        const contract = nodeTypeRegistry.get(snapshot.entityType as FlowType);
        if (!contract?.applySnapshot) {
            console.error(`[HistoryRegistry] No applySnapshot for type: ${snapshot.entityType}`);
            return;
        }

        contract.applySnapshot(snapshot as any);
    }

    /**
     * Отменить снимок (undo)
     */
    revertSnapshot<T extends { id: Guid; entityType: string }>(snapshot: EntitySnapshot<T>): void {
        const contract = nodeTypeRegistry.get(snapshot.entityType as FlowType);
        if (!contract?.revertSnapshot) {
            console.error(`[HistoryRegistry] No revertSnapshot for type: ${snapshot.entityType}`);
            return;
        }

        contract.revertSnapshot(snapshot as any);
    }

    /**
     * Создать сущность из снимка
     */
    createFromSnapshot<T extends { id: Guid; entityType: string }>(
        snapshot: EntitySnapshot<T>
    ): void {
        const contract = nodeTypeRegistry.get(snapshot.entityType as FlowType);
        if (!contract?.createFromSnapshot) {
            console.error(
                `[HistoryRegistry] No createFromSnapshot for type: ${snapshot.entityType}`
            );
            return;
        }

        contract.createFromSnapshot(snapshot as any);
    }

    /**
     * Удалить сущность
     */
    deleteEntity(entityType: string, entityId: Guid): void {
        const contract = nodeTypeRegistry.get(entityType as FlowType);
        if (!contract?.deleteEntity) {
            console.error(`[HistoryRegistry] No deleteEntity for type: ${entityType}`);
            return;
        }

        contract.deleteEntity(entityId);
    }
}

export const historyRegistry = new HistoryRegistry();