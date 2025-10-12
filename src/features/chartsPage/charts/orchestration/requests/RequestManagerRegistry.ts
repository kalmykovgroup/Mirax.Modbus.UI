// src/features/chartsPage/charts/orchestration/requests/RequestManagerRegistry.ts

import type { Guid } from '@app/lib/types/Guid';
import type { RequestManager } from './RequestManager'; // путь к твоему RequestManager

/**
 * Глобальный реестр RequestManager'ов
 *
 * Каждый RequestManagerProvider регистрирует свой менеджер при монтировании
 * и удаляет при размонтировании.
 *
 * Это позволяет FieldChartContainer'у получить доступ к менеджерам
 * других контекстов для синхронизации запросов.
 */
class RequestManagerRegistryClass {
    private readonly managers = new Map<Guid, RequestManager>();

    /**
     * Зарегистрировать менеджер для контекста
     */
    register(contextId: Guid, manager: RequestManager): void {
        if (this.managers.has(contextId)) {
            console.warn('[RequestManagerRegistry] Manager already registered:', contextId);
        }

        this.managers.set(contextId, manager);
        console.log('[RequestManagerRegistry] Registered manager for context:', contextId);
    }

    /**
     * Удалить менеджер контекста
     */
    unregister(contextId: Guid): void {
        const deleted = this.managers.delete(contextId);

        if (deleted) {
            console.log('[RequestManagerRegistry] Unregistered manager for context:', contextId);
        } else {
            console.warn('[RequestManagerRegistry] Manager not found:', contextId);
        }
    }

    /**
     * Получить менеджер по contextId
     */
    get(contextId: Guid): RequestManager | undefined {
        return this.managers.get(contextId);
    }

    /**
     * Проверить наличие менеджера
     */
    has(contextId: Guid): boolean {
        return this.managers.has(contextId);
    }

    /**
     * Получить все зарегистрированные contextId
     */
    getAllContextIds(): readonly Guid[] {
        return Array.from(this.managers.keys());
    }

    /**
     * Очистить все менеджеры (для тестов или экстренных случаев)
     */
    clear(): void {
        this.managers.clear();
        console.log('[RequestManagerRegistry] Cleared all managers');
    }

    /**
     * Получить количество зарегистрированных менеджеров
     */
    size(): number {
        return this.managers.size;
    }
}

/**
 * Singleton instance
 */
export const RequestManagerRegistry = new RequestManagerRegistryClass();