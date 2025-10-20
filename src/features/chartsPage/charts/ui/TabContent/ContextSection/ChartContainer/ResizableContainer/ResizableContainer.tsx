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
    disabled?: boolean | undefined; // НОВОЕ
}

// Улучшенный менеджер синхронизации
class SyncManager {
    private groups = new Map<string, {
        height: number;
        listeners: Set<(height: number) => void>;
        stateListeners: Set<(enabled: boolean) => void>;
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

    subscribeToState(groupId: string, listener: (enabled: boolean) => void) {
        const group = this.getGroup(groupId);
        group.stateListeners.add(listener);
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

        group.stateListeners.forEach(listener => listener(newState));

        if (newState) {
            group.listeners.forEach(listener => listener(group.height));
        }

        return newState;
    }

    setIndividualSync(groupId: string, enabled: boolean) {
        const group = this.getGroup(groupId);
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
                                                                          className,
                                                                          disabled = false // НОВОЕ
                                                                      }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(defaultHeight);
    const [isResizing, setIsResizing] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const updateFromSyncRef = useRef(false);

    // Синхронизация с внешним defaultHeight
    useEffect(() => {
        setHeight(defaultHeight);
    }, [defaultHeight]);

    const handleHeightUpdate = useCallback((newHeight: number) => {
        if (disabled) return; // НОВОЕ: Блокируем обновление если disabled

        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        setHeight(clampedHeight);
        onHeightChange?.(clampedHeight);

        if (isSynced && !updateFromSyncRef.current) {
            syncManager.updateHeight(groupId, clampedHeight);
        }
    }, [minHeight, maxHeight, onHeightChange, isSynced, groupId, disabled]); // НОВОЕ: добавили disabled

    useEffect(() => {
        const unsubscribeHeight = syncManager.subscribe(groupId, (newHeight: number) => {
            if (isSynced && !disabled) { // НОВОЕ: проверка disabled
                updateFromSyncRef.current = true;
                const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
                setHeight(clampedHeight);
                onHeightChange?.(clampedHeight);
                updateFromSyncRef.current = false;
            }
        });

        const unsubscribeState = syncManager.subscribeToState(groupId, (enabled: boolean) => {
            if (!disabled) { // НОВОЕ: проверка disabled
                setIsSynced(enabled);
                if (enabled) {
                    const groupHeight = syncManager.getGroupHeight(groupId);
                    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, groupHeight));
                    updateFromSyncRef.current = true;
                    setHeight(clampedHeight);
                    onHeightChange?.(clampedHeight);
                    updateFromSyncRef.current = false;
                }
            }
        });

        return () => {
            unsubscribeHeight();
            unsubscribeState();
        };
    }, [groupId, minHeight, maxHeight, onHeightChange, isSynced, disabled]); // НОВОЕ: добавили disabled

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (disabled) return; // НОВОЕ: Блокируем ресайз если disabled

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
    }, [height, handleHeightUpdate, disabled]); // НОВОЕ: добавили disabled

    return (
        <div
            ref={containerRef}
            className={`${styles.resizableContainer} ${className || ''} ${isResizing ? styles.resizing : ''}`}
            style={{ height }}
        >
            <div className={styles.resizableContainer__content}>
                {children}
            </div>

            {/* НОВОЕ: Скрываем handle если disabled */}
            {!disabled && (
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
            )}
        </div>
    );
};

// Компонент управления группой
export const SyncGroupControl: React.FC<{ groupId: string }> = ({ groupId }) => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [_groupHeight, setGroupHeight] = useState(500);

    useEffect(() => {
        const unsubscribeHeight = syncManager.subscribe(groupId, (newHeight) => {
            setGroupHeight(newHeight);
        });

        const unsubscribeState = syncManager.subscribeToState(groupId, (enabled) => {
            setIsEnabled(enabled);
        });

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