// src/features/scenarioEditor/core/ui/nodes/shared/NodeEditModal/types.ts

import type { ReactNode } from 'react';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';

/**
 * Контракт для редактирования ноды
 * Каждый тип ноды должен предоставить свою реализацию этого контракта
 */
export interface NodeEditContract<TDto = any> {
    /**
     * Рендерит содержимое формы редактирования
     * @param node - текущая нода
     * @param dto - текущие данные DTO
     * @param onChange - callback для изменения данных
     */
    renderContent: (props: {
        node: FlowNode;
        dto: TDto;
        onChange: (updatedDto: Partial<TDto>) => void;
    }) => ReactNode;

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
 * Состояние модального окна редактирования
 */
export interface NodeEditModalState {
    isOpen: boolean;
    node: FlowNode | null;
    contract: NodeEditContract | null;
}
