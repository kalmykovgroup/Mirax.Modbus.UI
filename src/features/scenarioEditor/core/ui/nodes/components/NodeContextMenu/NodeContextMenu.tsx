// src/features/scenarioEditor/core/ui/nodes/shared/NodeContextMenu/NodeContextMenu.tsx

import React, { useEffect, useRef } from 'react';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode.ts';
import type { NodeContextMenuAction, MenuPosition } from './types.ts';
import styles from './NodeContextMenu.module.css';

export interface NodeContextMenuProps {
    /** Нода, для которой показывается меню */
    node: FlowNode;

    /** Список действий */
    actions: NodeContextMenuAction[];

    /** Позиция меню */
    position: MenuPosition;

    /** Callback при закрытии меню */
    onClose: () => void;
}

export function NodeContextMenu({ node, actions, position, onClose }: NodeContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Закрытие по клику вне меню
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Небольшая задержка, чтобы не закрыть меню сразу после открытия
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // Закрытие по Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Корректировка позиции меню, чтобы оно не выходило за пределы экрана
    useEffect(() => {
        if (!menuRef.current) return;

        const menu = menuRef.current;
        const rect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let adjustedX = position.x;
        let adjustedY = position.y;

        // Если меню выходит за правую границу экрана
        if (position.x + rect.width > viewportWidth) {
            adjustedX = viewportWidth - rect.width - 10;
        }

        // Если меню выходит за нижнюю границу экрана
        if (position.y + rect.height > viewportHeight) {
            adjustedY = viewportHeight - rect.height - 10;
        }

        // Если позиция изменилась, применяем её
        if (adjustedX !== position.x || adjustedY !== position.y) {
            menu.style.left = `${adjustedX}px`;
            menu.style.top = `${adjustedY}px`;
        }
    }, [position]);

    const handleActionClick = (action: NodeContextMenuAction) => {
        if (!action.disabled) {
            action.onClick(node);
            onClose();
        }
    };

    if (actions.length === 0) {
        return null;
    }

    return (
        <>
            <div className={styles.overlay} />
            <div
                ref={menuRef}
                className={styles.menu}
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                }}
            >
                {actions.map((action) => {
                    const IconComponent = action.icon;

                    return (
                        <button
                            key={action.id}
                            className={`${styles.menuItem} ${action.destructive ? styles.destructive : ''}`}
                            onClick={() => handleActionClick(action)}
                            disabled={action.disabled}
                            title={action.disabled ? action.disabledTooltip : undefined}
                        >
                            {IconComponent && (
                                <IconComponent className={styles.menuItemIcon} />
                            )}
                            <span className={styles.menuItemLabel}>{action.label}</span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
