// src/features/scenarioEditor/core/ui/map/components/LockButton/LockButton.tsx

import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Lock, LockOpen, Settings } from 'lucide-react';
import { toggleLock, selectIsLocked } from '@scenario/core/features/lockSystem/lockSlice';
import { setGlobalLock, selectRegisteredGroupsCount } from '@scenario/core/features/fieldLockSystem';
import { FieldLockPanel } from '@scenario/core/features/fieldLockSystem';
import styles from './LockButton.module.css';

export function LockButton() {
    const dispatch = useDispatch();
    const isLocked = useSelector(selectIsLocked);
    const groupsCount = useSelector(selectRegisteredGroupsCount);

    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [panelOpen, setPanelOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleToggle = () => {
        const newState = !isLocked;
        dispatch(toggleLock());
        // Синхронизируем с глобальной блокировкой полей
        dispatch(setGlobalLock(newState));
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Позиционируем меню относительно кнопки
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
            setContextMenuPosition({
                x: rect.right + 8,
                y: rect.top,
            });
        }

        setContextMenuOpen(true);
    };

    const handleOpenPanel = () => {
        setPanelOpen(true);
        setContextMenuOpen(false);
    };

    const handleClosePanel = () => {
        setPanelOpen(false);
    };

    // Закрываем контекстное меню при клике вне его
    useEffect(() => {
        if (!contextMenuOpen) return;

        const handleClickOutside = () => {
            setContextMenuOpen(false);
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [contextMenuOpen]);

    return (
        <>
            <button
                ref={buttonRef}
                className={`${styles.lockButton} ${isLocked ? styles.locked : styles.unlocked}`}
                onClick={handleToggle}
                onContextMenu={handleContextMenu}
                title={isLocked ? 'Разблокировать карту и все поля' : 'Заблокировать карту и все поля'}
            >
                {isLocked ? <Lock size={20} /> : <LockOpen size={20} />}
            </button>

            {/* Контекстное меню */}
            {contextMenuOpen && (
                <div
                    className={styles.contextMenu}
                    style={{
                        position: 'fixed',
                        left: `${contextMenuPosition.x}px`,
                        top: `${contextMenuPosition.y}px`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className={styles.contextMenuItem}
                        onClick={handleOpenPanel}
                    >
                        <Settings size={16} />
                        <span>Настройки блокировки полей</span>
                        {groupsCount > 0 && (
                            <span className={styles.groupCount}>({groupsCount})</span>
                        )}
                    </button>
                </div>
            )}

            {/* Панель блокировок */}
            {panelOpen && (
                <div className={styles.modalOverlay} onClick={handleClosePanel}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <FieldLockPanel />
                    </div>
                </div>
            )}
        </>
    );
}
