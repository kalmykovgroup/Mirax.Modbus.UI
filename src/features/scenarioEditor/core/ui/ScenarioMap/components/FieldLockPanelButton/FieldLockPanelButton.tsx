// src/features/scenarioEditor/core/ui/map/components/FieldLockPanelButton/FieldLockPanelButton.tsx

import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectRegisteredGroupsCount } from '@scenario/core/features/fieldLockSystem';
import { FieldLockPanel } from '@scenario/core/features/fieldLockSystem';
import styles from './FieldLockPanelButton.module.css';

/**
 * Кнопка для открытия панели управления группами полей
 */
export function FieldLockPanelButton() {
    const [isOpen, setIsOpen] = useState(false);
    const groupsCount = useSelector(selectRegisteredGroupsCount);

    const handleToggle = () => {
        setIsOpen((prev) => !prev);
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    return (
        <>
            <button
                className={styles.button}
                onClick={handleToggle}
                title={`Управление полями редактирования${groupsCount > 0 ? ` (${groupsCount} групп)` : ''}`}
            >
                <Settings size={20} />
                {groupsCount > 0 && <span className={styles.badge}>{groupsCount}</span>}
            </button>

            {isOpen && (
                <div className={styles.modalOverlay} onClick={handleClose}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <FieldLockPanel />
                    </div>
                </div>
            )}
        </>
    );
}
