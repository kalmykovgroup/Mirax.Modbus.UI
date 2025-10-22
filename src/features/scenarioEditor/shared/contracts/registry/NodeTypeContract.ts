// src/features/scenarioEditor/shared/contracts/registry/NodeTypeContract.ts

import type { ComponentType } from 'react';
import type { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeProps } from '@xyflow/react';
import type { Guid } from '@app/lib/types/Guid';
import type { Entity, EntitySnapshot } from '@scenario/core/features/historySystem/types';

/**
 * Базовый тип для всех DTO нод (БЕЗ entityType — он добавляется при записи в историю)
 */
export interface BaseNodeDto {
    readonly id: Guid;
}

/**
 * Контракт типа ноды — инкапсулирует ВСЮ логику конкретного типа
 * Все методы ОБЯЗАТЕЛЬНЫ для реализации
 */
export interface NodeTypeContract<TDto extends BaseNodeDto = BaseNodeDto> {
    // ============================================================================
    // БАЗОВЫЕ ПОЛЯ (ОБЯЗАТЕЛЬНЫ)
    // ============================================================================

    readonly type: FlowType;
    readonly displayName: string;
    readonly Component: ComponentType<NodeProps<any>>;

    // ============================================================================
    // МАППИНГ DTO ↔ Node (ОБЯЗАТЕЛЬНЫ)
    // ============================================================================

    /**
     * Преобразовать DTO в ReactFlow ноду
     */
    readonly mapFromDto: (dto: TDto, parentId?: string) => any;

    /**
     * Преобразовать ReactFlow ноду в DTO
     */
    readonly mapToDto: (node: any) => TDto;

    // ============================================================================
    // МЕТА-ИНФОРМАЦИЯ (ОПЦИОНАЛЬНЫ)
    // ============================================================================

    /**
     * Может ли нода содержать дочерние ветки
     */
    readonly canHaveChildBranches?: boolean;

    /**
     * Режим связи веток (для Parallel/Condition нод)
     */
    readonly getBranchLinkMode?: (dto: TDto) => 'parallel' | 'condition' | undefined;

    // ============================================================================
    // ОПЕРАЦИИ С НОДОЙ (ОБЯЗАТЕЛЬНЫ — возвращают новый DTO)
    // ============================================================================

    /**
     * Создать новый DTO с обновлённой позицией
     */
    readonly createMoveEntity: (dto: TDto, newX: number, newY: number) => TDto;

    /**
     * Создать новый DTO с обновлённым размером
     */
    readonly createResizeEntity: (dto: TDto, newWidth: number, newHeight: number) => TDto;

    /**
     * Создать новый DTO с автоматически расширенным размером (для веток)
     */
    readonly createAutoExpandEntity: (dto: TDto, newWidth: number, newHeight: number) => TDto;

    /**
     * Создать новый DTO с присоединением к ветке (для степов)
     */
    readonly createAttachToBranchEntity: (
        dto: TDto,
        branchId: Guid,
        newX: number,
        newY: number
    ) => TDto;

    /**
     * Создать новый DTO с отсоединением от ветки (для степов)
     */
    readonly createDetachFromBranchEntity: (dto: TDto, newX: number, newY: number) => TDto;

    // ============================================================================
    // ВАЛИДАЦИЯ ОПЕРАЦИЙ (ОПЦИОНАЛЬНА)
    // ============================================================================

    /**
     * Валидировать операцию перед выполнением
     */
    readonly validateOperation?: (
        operation:
            | 'move'
            | 'resize'
            | 'attach'
            | 'detach'
            | 'auto-expand'
            | 'delete'
            | 'select',
        dto: TDto,
        params: Record<string, unknown>
    ) => { valid: boolean; error?: string };

    // ============================================================================
    // ХУКИ ЖИЗНЕННОГО ЦИКЛА (ОПЦИОНАЛЬНЫ)
    // ============================================================================

    /**
     * Вызывается после создания ноды
     */
    readonly onCreated?: (dto: TDto) => void;

    /**
     * Вызывается перед удалением ноды
     */
    readonly onBeforeDelete?: (dto: TDto) => void;

    /**
     * Вызывается после обновления ноды
     */
    readonly onUpdated?: (previousDto: TDto, newDto: TDto) => void;

    // ============================================================================
    // МЕТОДЫ ИСТОРИИ (ОБЯЗАТЕЛЬНЫ — работают с Entity)
    // ============================================================================

    /**
     * Создать снимок сущности для истории
     * Автоматически добавляет entityType из contract.type
     */
    readonly createSnapshot: (dto: TDto) => EntitySnapshot<Entity>;

    /**
     * Применить изменение (redo) — диспатчит экшен в Redux
     */
    readonly applySnapshot: (snapshot: EntitySnapshot<Entity>) => void;

    /**
     * Отменить изменение (undo) — диспатчит экшен в Redux
     */
    readonly revertSnapshot: (snapshot: EntitySnapshot<Entity>) => void;

    /**
     * Создать сущность из снимка (undo удаления)
     */
    readonly createFromSnapshot: (snapshot: EntitySnapshot<Entity>) => void;

    /**
     * Удалить сущность (redo удаления или undo создания)
     */
    readonly deleteEntity: (entityId: Guid) => void;
}