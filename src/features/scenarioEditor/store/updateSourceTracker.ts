// src/features/scenarioEditor/core/store/updateSourceTracker.ts

/**
 * Трекер источника обновлений Redux
 *
 * Позволяет отличить обновления из ReactFlow от внешних обновлений (API, Undo/Redo)
 * чтобы избежать циклических ре-рендеров
 */

type UpdateSource = 'reactflow' | 'external';

class UpdateSourceTracker {
    private currentSource: UpdateSource = 'external';
    private reactFlowUpdateIds = new Set<string>();

    /**
     * Начать отслеживание обновления из ReactFlow
     */
    startReactFlowUpdate(entityIds: string[]): void {
        this.currentSource = 'reactflow';
        entityIds.forEach(id => this.reactFlowUpdateIds.add(id));
    }

    /**
     * Завершить отслеживание обновления из ReactFlow
     */
    endReactFlowUpdate(entityIds: string[]): void {
        entityIds.forEach(id => this.reactFlowUpdateIds.delete(id));

        // Если больше нет активных обновлений из ReactFlow
        if (this.reactFlowUpdateIds.size === 0) {
            this.currentSource = 'external';
        }
    }

    /**
     * Проверить является ли обновление сущности из ReactFlow
     */
    isReactFlowUpdate(entityId: string): boolean {
        return this.reactFlowUpdateIds.has(entityId);
    }

    /**
     * Получить текущий источник обновлений
     */
    getCurrentSource(): UpdateSource {
        return this.currentSource;
    }

    /**
     * Проверить есть ли активные обновления из ReactFlow
     */
    hasActiveReactFlowUpdates(): boolean {
        return this.reactFlowUpdateIds.size > 0;
    }

    /**
     * Сбросить все отслеживания (на случай ошибки)
     */
    reset(): void {
        this.currentSource = 'external';
        this.reactFlowUpdateIds.clear();
    }
}

// Singleton instance
export const updateSourceTracker = new UpdateSourceTracker();