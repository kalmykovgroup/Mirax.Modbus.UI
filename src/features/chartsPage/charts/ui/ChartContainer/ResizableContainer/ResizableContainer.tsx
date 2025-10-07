// ResizableContainer.tsx - исправленная версия

import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './ResizableContainer.module.css';

interface ResizableContainerProps {
    groupId: string;
    children: React.ReactNode;
    minHeight?: number | undefined;
    maxHeight?: number | undefined;
    defaultHeight?: number | undefined;
    onHeightChange?: ((height: number) => void) | undefined;
    className?: string | undefined;
}

// Улучшенный менеджер синхронизации
class SyncManager {
    private groups = new Map<string, {
        height: number;
        listeners: Set<(height: number) => void>;
        stateListeners: Set<(enabled: boolean) => void>; // Добавляем слушателей состояния
        enabled: boolean;
    }>();

    getGroup(groupId: string) {
        if (!this.groups.has(groupId)) {
            this.groups.set(groupId, {
                height: 500,
                listeners: new Set(),
                stateListeners: new Set(),
                enabled: false
            });
        }
        return this.groups.get(groupId)!;
    }

    subscribe(groupId: string, listener: (height: number) => void) {
        const group = this.getGroup(groupId);
        group.listeners.add(listener);
        return () => group.listeners.delete(listener);
    }

    // Новый метод для подписки на изменение состояния синхронизации
    subscribeToState(groupId: string, listener: (enabled: boolean) => void) {
        const group = this.getGroup(groupId);
        group.stateListeners.add(listener);
        // Сразу уведомляем о текущем состоянии
        listener(group.enabled);
        return () => group.stateListeners.delete(listener);
    }

    updateHeight(groupId: string, height: number) {
        const group = this.getGroup(groupId);
        group.height = height;
        if (group.enabled) {
            group.listeners.forEach(listener => listener(height));
        }
    }

    toggleGroup(groupId: string, enabled?: boolean) {
        const group = this.getGroup(groupId);
        const newState = enabled !== undefined ? enabled : !group.enabled;
        group.enabled = newState;

        // Уведомляем все контейнеры об изменении состояния
        group.stateListeners.forEach(listener => listener(newState));

        if (newState) {
            // При включении синхронизируем высоту
            group.listeners.forEach(listener => listener(group.height));
        }

        return newState;
    }

    setIndividualSync(groupId: string, enabled: boolean) {
        const group = this.getGroup(groupId);
        // Если хотя бы один контейнер включает синхронизацию, включаем для группы
        if (enabled && !group.enabled) {
            group.enabled = true;
            group.stateListeners.forEach(listener => listener(true));
        }
    }

    isGroupEnabled(groupId: string): boolean {
        return this.getGroup(groupId).enabled;
    }

    getGroupHeight(groupId: string): number {
        return this.getGroup(groupId).height;
    }
}

const syncManager = new SyncManager();

export const ResizableContainer: React.FC<ResizableContainerProps> = ({
                                                                          groupId,
                                                                          children,
                                                                          minHeight = 200,
                                                                          maxHeight = 1200,
                                                                          defaultHeight = 500,
                                                                          onHeightChange,
                                                                          className
                                                                      }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(defaultHeight);
    const [isResizing, setIsResizing] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const updateFromSyncRef = useRef(false);

    // Обработчик изменения высоты
    const handleHeightUpdate = useCallback((newHeight: number) => {
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        setHeight(clampedHeight);
        onHeightChange?.(clampedHeight);

        // Обновляем другие контейнеры если синхронизация включена
        if (isSynced && !updateFromSyncRef.current) {
            syncManager.updateHeight(groupId, clampedHeight );
        }
    }, [minHeight, maxHeight, onHeightChange, isSynced, groupId]);

    // Подписка на изменения высоты и состояния группы
    useEffect(() => {
        // Подписка на изменения высоты
        const unsubscribeHeight = syncManager.subscribe(groupId, (newHeight: number) => {
            if (isSynced) {
                updateFromSyncRef.current = true;
                const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
                setHeight(clampedHeight);
                onHeightChange?.(clampedHeight);
                updateFromSyncRef.current = false;
            }
        });

        // Подписка на изменения состояния синхронизации
        const unsubscribeState = syncManager.subscribeToState(groupId, (enabled: boolean) => {
            setIsSynced(enabled);
            if (enabled) {
                // При включении применяем высоту группы
                const groupHeight = syncManager.getGroupHeight(groupId);
                const clampedHeight = Math.max(minHeight, Math.min(maxHeight, groupHeight));
                updateFromSyncRef.current = true;
                setHeight(clampedHeight);
                onHeightChange?.(clampedHeight);
                updateFromSyncRef.current = false;
            }
        });

        return () => {
            unsubscribeHeight();
            unsubscribeState();
        };
    }, [groupId, minHeight, maxHeight, onHeightChange, isSynced]);

    // Обработка ресайза мышью
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        const startY = e.clientY;
        const startHeight = height;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaY = e.clientY - startY;
            handleHeightUpdate(startHeight + deltaY);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [height, handleHeightUpdate]);



    return (
        <div
            ref={containerRef}
            className={`${styles.resizableContainer} ${className || ''} ${isResizing ? styles.resizing : ''}`}
            style={{ height }}
        >
            <div className={styles.resizableContainer__content}>
                {children}
            </div>

            <div
                className={styles.resizeHandle}
                onMouseDown={handleMouseDown}
            >
                <div className={styles.resizeGrip}>
                    <SyncGroupControl groupId={groupId} />
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>

        </div>
    );
};

// Компонент управления группой
export const SyncGroupControl: React.FC<{ groupId: string }> = ({ groupId }) => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [_groupHeight, setGroupHeight] = useState(500);

    useEffect(() => {
        // Подписка на изменения высоты
        const unsubscribeHeight = syncManager.subscribe(groupId, (newHeight) => {
            setGroupHeight(newHeight);
        });

        // Подписка на изменения состояния
        const unsubscribeState = syncManager.subscribeToState(groupId, (enabled) => {
            setIsEnabled(enabled);
        });

        // Получаем начальные значения
        setIsEnabled(syncManager.isGroupEnabled(groupId));
        setGroupHeight(syncManager.getGroupHeight(groupId));

        return () => {
            unsubscribeHeight();
            unsubscribeState();
        };
    }, [groupId]);

    const toggleGroupSync = () => {
        const newState = syncManager.toggleGroup(groupId);
        setIsEnabled(newState);
    };

    return (
        <div className={styles.groupControl}>
            <button
                onClick={toggleGroupSync}
                className={`${styles.groupSyncButton} ${isEnabled ? styles.active : ''}`}
            >
                {isEnabled ? '🔗' : '🔓'}
            </button>
        </div>
    );
};