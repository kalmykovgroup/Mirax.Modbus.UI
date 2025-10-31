// src/features/scenarioEditor/core/ui/nodes/shared/NodeEditModal/types.ts

import type { ReactNode } from 'react';
import type { Edge } from '@xyflow/react';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode.ts';

/**
 * Параметры для рендеринга контента ноды
 */
export interface RenderContentParams<TDto = any> {
    node: FlowNode;
    dto: TDto;
    onChange: (updatedDto: Partial<TDto>) => void;
}

/**
 * Параметры для рендеринга контента связи (edge)
 */
export interface EdgeRenderContentParams<TDto = any> {
    edge: Edge;
    dto: TDto;
    onChange: (updatedDto: Partial<TDto>) => void;
}

/**
 * Контракт для редактирования ноды
 * Каждый тип ноды должен предоставить свою реализацию этого контракта
 */
export interface NodeEditContract<TDto = any> {
    /**
     * Рендерит содержимое формы редактирования
     */
    renderContent: (props: RenderContentParams<TDto>) => ReactNode;

    /**
     * Валидация данных перед сохранением (опционально)
     * @param dto - данные для валидации
     * @returns массив ошибок (пустой массив = валидация пройдена)
     */
    validate?: (dto: TDto) => string[];

    /**
     * Заголовок модального окна (опционально)
     */
    title?: string;

    /**
     * Ширина модального окна (опционально, по умолчанию 600px)
     */
    width?: string | number;
}

/**
 * Контракт для редактирования связи (edge)
 */
export interface EdgeEditContract<TDto = any> {
    /**
     * Рендерит содержимое формы редактирования
     */
    renderContent: (props: EdgeRenderContentParams<TDto>) => ReactNode;

    /**
     * Валидация данных перед сохранением (опционально)
     */
    validate?: (dto: TDto) => string[];

    /**
     * Заголовок модального окна
     */
    title: string;

    /**
     * Ширина модального окна (опционально, по умолчанию 600px)
     */
    width?: string | number;
}

/**
 * Состояние модального окна редактирования ноды
 */
export interface NodeEditModalState {
    isOpen: boolean;
    node: FlowNode | null;
    contract: NodeEditContract | null;
}

/**
 * Состояние модального окна редактирования связи
 */
export interface EdgeEditModalState {
    isOpen: boolean;
    edge: Edge | null;
    contract: EdgeEditContract | null;
}
