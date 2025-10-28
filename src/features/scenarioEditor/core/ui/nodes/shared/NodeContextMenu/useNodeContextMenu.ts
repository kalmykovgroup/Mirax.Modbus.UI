// src/features/scenarioEditor/core/ui/nodes/shared/NodeContextMenu/useNodeContextMenu.ts

import { useState, useCallback } from 'react';
import type { FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import type { NodeContextMenuAction, MenuPosition } from './types';
import { NodeContextMenuRegistry } from './NodeContextMenuRegistry';

export interface NodeContextMenuState {
    /** Нода, для которой открыто меню */
    node: FlowNode | null;

    /** Действия для текущей ноды */
    actions: NodeContextMenuAction[];

    /** Открыто ли меню */
    isOpen: boolean;

    /** Позиция меню */
    position: MenuPosition | null;
}

export interface UseNodeContextMenuResult {
    /** Текущее состояние меню */
    state: NodeContextMenuState;

    /** Открыть меню для ноды */
    openMenu: (node: FlowNode, position: MenuPosition) => void;

    /** Закрыть меню */
    closeMenu: () => void;
}

/**
 * Хук для управления контекстным меню ноды
 */
export function useNodeContextMenu(): UseNodeContextMenuResult {
    const [state, setState] = useState<NodeContextMenuState>({
        node: null,
        actions: [],
        isOpen: false,
        position: null,
    });

    const openMenu = useCallback((node: FlowNode, position: MenuPosition) => {
        const provider = NodeContextMenuRegistry.get(node.type);

        if (!provider) {
            console.warn(`[NodeContextMenu] No provider found for node type: ${node.type}`);
            return;
        }

        const actions = provider.getActions(node);

        setState({
            node,
            actions,
            isOpen: true,
            position,
        });
    }, []);

    const closeMenu = useCallback(() => {
        setState({
            node: null,
            actions: [],
            isOpen: false,
            position: null,
        });
    }, []);

    return {
        state,
        openMenu,
        closeMenu,
    };
}
