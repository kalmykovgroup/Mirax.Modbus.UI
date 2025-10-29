// src/features/scenarioEditor/core/features/fieldLockSystem/GroupControl.tsx

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, Lock, LockOpen } from 'lucide-react';
import { toggleGroupState, type FieldGroupMetadata, FieldGroupState } from './fieldLockSlice';
import { selectIsLocked } from '@scenario/core/features/lockSystem/lockSlice';
import styles from './GroupControl.module.css';

interface GroupControlProps {
    group: FieldGroupMetadata;
}

/**
 * Компонент управления одной группой полей
 */
export function GroupControl({ group }: GroupControlProps) {
    const dispatch = useDispatch();
    const scenarioLock = useSelector(selectIsLocked);

    const handleToggle = () => {
        if (scenarioLock) return;
        dispatch(toggleGroupState(group.id));
    };

    const getStateInfo = () => {
        switch (group.state) {
            case FieldGroupState.Visible:
                return {
                    icon: <LockOpen size={16} />,
                    label: 'Доступно',
                    className: styles.stateVisible,
                    title: 'Группа видима и доступна для редактирования. Нажмите для блокировки.',
                };
            case FieldGroupState.Locked:
                return {
                    icon: <Lock size={16} />,
                    label: 'Заблокировано',
                    className: styles.stateLocked,
                    title: 'Группа видима, но заблокирована для редактирования. Нажмите для скрытия.',
                };
            case FieldGroupState.Hidden:
                return {
                    icon: <EyeOff size={16} />,
                    label: 'Скрыто',
                    className: styles.stateHidden,
                    title: 'Группа полностью скрыта. Нажмите для показа.',
                };
        }
    };

    const stateInfo = getStateInfo();

    return (
        <div className={styles.groupControl}>
            <div className={styles.groupInfo}>
                <div className={styles.groupLabel}>{group.label}</div>
                {group.description && <div className={styles.groupDescription}>{group.description}</div>}
            </div>

            <button
                className={`${styles.stateButton} ${stateInfo.className}`}
                onClick={handleToggle}
                disabled={scenarioLock}
                title={scenarioLock ? 'Разблокируйте карту для управления группой' : stateInfo.title}
            >
                {stateInfo.icon}
                <span className={styles.stateLabel}>{stateInfo.label}</span>
            </button>
        </div>
    );
}
