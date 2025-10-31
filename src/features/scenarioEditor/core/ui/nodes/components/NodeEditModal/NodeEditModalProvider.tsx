// src/features/scenarioEditor/core/ui/nodes/shared/NodeEditModal/NodeEditModalProvider.tsx

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Edge } from '@xyflow/react';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode.ts';
import type { NodeEditContract, NodeEditModalState, EdgeEditContract, EdgeEditModalState } from './types.ts';
import { NodeEditModal } from './NodeEditModal.tsx';
import { useScenarioOperations } from '@scenario/core/hooks/useScenarioOperations.ts';
import { useSelector } from 'react-redux';
import { selectActiveScenarioId } from '@scenario/store/scenarioSelectors.ts';

interface NodeEditModalContextValue {
    /**
     * Открыть модальное окно редактирования для ноды
     */
    openEditModal: (node: FlowNode, contract: NodeEditContract) => void;

    /**
     * Открыть модальное окно редактирования для edge (связи)
     */
    openEdgeEditModal: (edge: Edge, contract: EdgeEditContract) => void;

    /**
     * Закрыть текущее модальное окно (вернуться на предыдущее если есть)
     */
    closeEditModal: () => void;

    /**
     * Закрыть все модальные окна
     */
    closeAllModals: () => void;

    /**
     * Стек модальных окон для нод
     */
    modalStack: NodeEditModalState[];

    /**
     * Стек модальных окон для edges
     */
    edgeModalStack: EdgeEditModalState[];
}

const NodeEditModalContext = createContext<NodeEditModalContextValue | null>(null);

interface NodeEditModalProviderProps {
    children: ReactNode;
}

export function NodeEditModalProvider({ children }: NodeEditModalProviderProps) {
    // Стеки модальных окон для нод и edges
    const [modalStack, setModalStack] = useState<NodeEditModalState[]>([]);
    const [edgeModalStack, setEdgeModalStack] = useState<EdgeEditModalState[]>([]);

    const activeScenarioId = useSelector(selectActiveScenarioId);
    const operations = useScenarioOperations(activeScenarioId);

    // Открыть новое модальное окно для ноды
    const openEditModal = useCallback((node: FlowNode, contract: NodeEditContract) => {
        setModalStack((prev) => [
            ...prev,
            {
                isOpen: true,
                node,
                contract,
            },
        ]);
        console.log('[NodeEditModalProvider] Opened node modal, stack depth:', modalStack.length + 1);
    }, [modalStack.length]);

    // Открыть новое модальное окно для edge
    const openEdgeEditModal = useCallback((edge: Edge, contract: EdgeEditContract) => {
        setEdgeModalStack((prev) => [
            ...prev,
            {
                isOpen: true,
                edge,
                contract,
            },
        ]);
        console.log('[NodeEditModalProvider] Opened edge modal, stack depth:', edgeModalStack.length + 1);
    }, [edgeModalStack.length]);

    // Закрыть текущее модальное окно (убрать последнее из любого стека)
    const closeEditModal = useCallback(() => {
        // Закрываем из того стека, который не пустой (приоритет - edge, потом node)
        if (edgeModalStack.length > 0) {
            setEdgeModalStack((prev) => {
                const newStack = prev.slice(0, -1);
                console.log('[NodeEditModalProvider] Closed edge modal, stack depth:', newStack.length);
                return newStack;
            });
        } else if (modalStack.length > 0) {
            setModalStack((prev) => {
                const newStack = prev.slice(0, -1);
                console.log('[NodeEditModalProvider] Closed node modal, stack depth:', newStack.length);
                return newStack;
            });
        }
    }, [modalStack.length, edgeModalStack.length]);

    // Закрыть все модальные окна
    const closeAllModals = useCallback(() => {
        setModalStack([]);
        setEdgeModalStack([]);
        console.log('[NodeEditModalProvider] Closed all modals');
    }, []);

    const handleSave = useCallback(
        (node: FlowNode, updatedDto: any) => {
            console.log('[NodeEditModal] Saving node:', node.id, updatedDto);

            // Создаем обновленную ноду с новыми данными
            const updatedNode: FlowNode = {
                ...node,
                data: {
                    ...node.data,
                    object: updatedDto,
                },
            };

            // Сохраняем через operations (попадает в историю с меткой 'user-edit')
            operations.updateEntity(updatedNode, 'user-edit');

            // Закрываем модальное окно
            closeEditModal();
        },
        [operations, closeEditModal]
    );

    const handleEdgeSave = useCallback(
        (edge: Edge, updatedDto: any) => {
            console.log('[NodeEditModal] Saving edge:', edge.id, updatedDto);

            if (!activeScenarioId) {
                console.error('[NodeEditModal] Cannot save edge: no activeScenarioId');
                return;
            }

            // Получаем текущий relationDto из edge.data
            const currentDto = (edge.data as any)?.relationDto;

            if (!currentDto) {
                console.error('[NodeEditModal] No relationDto found in edge.data');
                return;
            }

            // Создаем обновленный DTO с измененными полями
            const mergedDto = {
                ...currentDto,
                ...updatedDto,
            };

            // Определяем тип связи
            let entityType = 'StepRelation';
            if ('parallelStepId' in currentDto && 'branchId' in currentDto) {
                entityType = 'ParallelStepBranchRelation';
            } else if ('conditionStepId' in currentDto && 'branchId' in currentDto) {
                entityType = 'ConditionStepBranchRelation';
            }

            console.log('[NodeEditModal] Updating edge:', {
                type: entityType,
                id: edge.id,
                changes: updatedDto,
            });

            // Используем метод updateRelation для сохранения
            operations.updateRelation(mergedDto, entityType, 'user-edit');

            // Закрываем модальное окно
            closeEditModal();
        },
        [activeScenarioId, operations, closeEditModal]
    );

    const contextValue: NodeEditModalContextValue = {
        openEditModal,
        openEdgeEditModal,
        closeEditModal,
        closeAllModals,
        modalStack,
        edgeModalStack,
    };

    return (
        <NodeEditModalContext.Provider value={contextValue}>
            {children}

            {/* Рендерим все модальные окна нод из стека */}
            {modalStack.map((modalState, index) => {
                if (!modalState.isOpen || !modalState.node || !modalState.contract) {
                    return null;
                }

                const isTopmost = index === modalStack.length - 1 && edgeModalStack.length === 0;
                const zIndex = 10000 + index * 10;

                return (
                    <div key={`node-modal-${index}`} style={{ zIndex }}>
                        <NodeEditModal
                            node={modalState.node}
                            contract={modalState.contract}
                            onSave={handleSave}
                            onCancel={closeEditModal}
                            stackDepth={index}
                            isTopmost={isTopmost}
                        />
                    </div>
                );
            })}

            {/* Рендерим все модальные окна edges из стека */}
            {edgeModalStack.map((edgeState, index) => {
                if (!edgeState.isOpen || !edgeState.edge || !edgeState.contract) {
                    return null;
                }

                const isTopmost = index === edgeModalStack.length - 1;
                const zIndex = 10000 + modalStack.length * 10 + index * 10; // Edges поверх нод

                return (
                    <div key={`edge-modal-${index}`} style={{ zIndex }}>
                        <NodeEditModal
                            edge={edgeState.edge}
                            contract={edgeState.contract as any}
                            onSave={handleEdgeSave as any}
                            onCancel={closeEditModal}
                            stackDepth={modalStack.length + index}
                            isTopmost={isTopmost}
                        />
                    </div>
                );
            })}
        </NodeEditModalContext.Provider>
    );
}

/**
 * Хук для доступа к функциям модального окна редактирования
 */
export function useNodeEditModal() {
    const context = useContext(NodeEditModalContext);

    if (!context) {
        throw new Error('useNodeEditModal must be used within NodeEditModalProvider');
    }

    return context;
}
