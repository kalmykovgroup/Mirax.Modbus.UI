// src/features/scenarioEditor/core/ui/nodes/shared/NodeEditButton/useNodeEdit.tsx

import { useState, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { EditButton } from '../../../map/components/EditButton';
import { useNodeEditModal } from '../NodeEditModal';
import type { NodeEditContract } from '../NodeEditModal/types';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { BaseNodeDto } from '@scenario/shared/contracts/registry/NodeTypeContract';

/**
 * Хук для добавления функциональности редактирования в ноду.
 * Упрощает интеграцию кнопки редактирования - не требует дополнительной стилизации.
 *
 * @example
 * ```tsx
 * export function MyNode({ id, data, selected }: Props) {
 *     const { EditButton, containerProps } = useNodeEdit(id, selected, MyNodeEditContract);
 *
 *     return (
 *         <div className={styles.container} {...containerProps}>
 *             {EditButton}
 *             {/* остальной контент ноды *\/}
 *         </div>
 *     );
 * }
 * ```
 */
export function useNodeEdit<TDto = any>(
    nodeId: string,
    selected: boolean,
    editContract: NodeEditContract<TDto>,
    hasErrors: boolean,
) {
    const [isHovered, setIsHovered] = useState(false);
    const rf = useReactFlow();
    const { openEditModal } = useNodeEditModal();

    const handleEdit = useCallback(() => {
        const node = rf.getNode(nodeId);
        // Type guard: проверяем что нода существует и имеет правильный тип
        if (node && node.type) {
            // Приводим к типу FlowNode<BaseNodeDto>
            openEditModal(node as FlowNode<BaseNodeDto>, editContract);
        }
    }, [nodeId, rf, openEditModal, editContract]);

    const containerProps = {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
    };

    const EditButtonComponent = (
        <EditButton
            hasErrors={hasErrors}
            visible={isHovered || selected}
            onClick={handleEdit}
        />
    );

    return {
        /** Компонент кнопки редактирования для рендера */
        EditButton: EditButtonComponent,
        /** Props для контейнера ноды (onMouseEnter/onMouseLeave) */
        containerProps,
        /** Наведена ли мышь на ноду */
        isHovered,
    };
}
