// src/features/scenarioEditor/core/ui/nodes/shared/NodeEditModal/NodeEditModalProvider.tsx

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { NodeEditContract, NodeEditModalState } from './types';
import { NodeEditModal } from './NodeEditModal';
import { useScenarioOperations } from '@scenario/core/hooks/useScenarioOperations';
import { useSelector } from 'react-redux';
import { selectActiveScenarioId } from '@scenario/store/scenarioSelectors';

interface NodeEditModalContextValue {
    /**
     * Открыть модальное окно редактирования для ноды
     */
    openEditModal: (node: FlowNode, contract: NodeEditContract) => void;

    /**
     * Закрыть модальное окно
     */
    closeEditModal: () => void;

    /**
     * Текущее состояние модального окна
     */
    state: NodeEditModalState;
}

const NodeEditModalContext = createContext<NodeEditModalContextValue | null>(null);

interface NodeEditModalProviderProps {
    children: ReactNode;
}

export function NodeEditModalProvider({ children }: NodeEditModalProviderProps) {
    const [state, setState] = useState<NodeEditModalState>({
        isOpen: false,
        node: null,
        contract: null,
    });

    const activeScenarioId = useSelector(selectActiveScenarioId);
    const operations = useScenarioOperations(activeScenarioId);

    const openEditModal = useCallback((node: FlowNode, contract: NodeEditContract) => {
        setState({
            isOpen: true,
            node,
            contract,
        });
    }, []);

    const closeEditModal = useCallback(() => {
        setState({
            isOpen: false,
            node: null,
            contract: null,
        });
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

    const contextValue: NodeEditModalContextValue = {
        openEditModal,
        closeEditModal,
        state,
    };

    return (
        <NodeEditModalContext.Provider value={contextValue}>
            {children}

            {/* Рендерим модальное окно если оно открыто */}
            {state.isOpen && state.node && state.contract && (
                <NodeEditModal
                    node={state.node}
                    contract={state.contract}
                    onSave={handleSave}
                    onCancel={closeEditModal}
                />
            )}
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
