// src/features/history/historyRegistry.ts

import type { Entity, EntityHandler } from './types.ts';

/**
 * Глобальный реестр обработчиков для разных типов сущностей
 */
class HistoryRegistry {
    private readonly handlers = new Map<string, EntityHandler<Entity>>();

    /**
     * Зарегистрировать обработчик для типа сущности
     */
    register<T extends Entity>(entityType: string, handler: EntityHandler<T>): void {
        if (this.handlers.has(entityType)) {
            console.warn(`[HistoryRegistry] Handler for "${entityType}" already registered, overwriting`);
        }

        // Безопасное приведение: T extends Entity, поэтому EntityHandler<T> совместим с EntityHandler<Entity>
        this.handlers.set(entityType, handler as unknown as EntityHandler<Entity>);
        console.log(`[HistoryRegistry] ✅ Registered handler for "${entityType}"`);
    }

    /**
     * Получить обработчик для типа сущности
     */
    getHandler<T extends Entity>(entityType: string): EntityHandler<T> | null {
        const handler = this.handlers.get(entityType);
        if (!handler) {
            return null;
        }

        // Возвращаем как EntityHandler<T>, т.к. caller знает конкретный тип
        return handler as unknown as EntityHandler<T>;
    }

    /**
     * Проверить, зарегистрирован ли тип
     */
    hasHandler(entityType: string): boolean {
        return this.handlers.has(entityType);
    }

    /**
     * Получить все зарегистрированные типы
     */
    getRegisteredTypes(): readonly string[] {
        return Array.from(this.handlers.keys());
    }

    /**
     * Удалить обработчик
     */
    unregister(entityType: string): boolean {
        return this.handlers.delete(entityType);
    }

    /**
     * Очистить все обработчики (использовать только в тестах)
     */
    clear(): void {
        this.handlers.clear();
        console.log('[HistoryRegistry] All handlers cleared');
    }
}

// Синглтон экземпляр
export const historyRegistry = new HistoryRegistry();