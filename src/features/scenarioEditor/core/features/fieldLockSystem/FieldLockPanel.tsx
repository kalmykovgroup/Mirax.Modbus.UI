// src/features/scenarioEditor/core/features/fieldLockSystem/FieldLockPanel.tsx

import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Settings, RotateCcw, Lock, Unlock, MapPin } from 'lucide-react';
import {
    selectAllGroups,
    selectGlobalLock,
    selectRegisteredGroupsCount,
    setGlobalLock,
    resetAllGroups,
    FieldGroupState,
} from './fieldLockSlice';
import { selectIsLocked } from '@scenario/core/features/lockSystem/lockSlice';
import { GroupControl } from './GroupControl';
import styles from './FieldLockPanel.module.css';

/**
 * Панель управления группами полей
 * Показывает все зарегистрированные группы и позволяет управлять их состоянием
 */
export function FieldLockPanel() {
    const dispatch = useDispatch();
    const groups = useSelector(selectAllGroups);
    const globalLock = useSelector(selectGlobalLock);
    const scenarioLock = useSelector(selectIsLocked);
    const groupsCount = useSelector(selectRegisteredGroupsCount);

    // Сортируем группы по дате регистрации
    const sortedGroups = useMemo(() => {
        return Object.values(groups).sort((a, b) => a.registeredAt - b.registeredAt);
    }, [groups]);

    // Подсчет групп по состояниям
    const stats = useMemo(() => {
        const visible = sortedGroups.filter((g) => g.state === FieldGroupState.Visible).length;
        const locked = sortedGroups.filter((g) => g.state === FieldGroupState.Locked).length;
        const hidden = sortedGroups.filter((g) => g.state === FieldGroupState.Hidden).length;

        return { visible, locked, hidden };
    }, [sortedGroups]);

    const handleToggleGlobalLock = () => {
        dispatch(setGlobalLock(!globalLock));
    };

    const handleResetAll = () => {
        dispatch(resetAllGroups());
        dispatch(setGlobalLock(false));
    };

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <Settings size={18} />
                    <span>Управление полями</span>
                </div>
                <div className={styles.headerStats}>
                    {groupsCount === 0 ? (
                        <span className={styles.noGroups}>Группы не зарегистрированы</span>
                    ) : (
                        <span className={styles.statsText}>
                            {stats.visible > 0 && <span className={styles.statVisible}>{stats.visible} доступно</span>}
                            {stats.locked > 0 && <span className={styles.statLocked}>{stats.locked} заблокировано</span>}
                            {stats.hidden > 0 && <span className={styles.statHidden}>{stats.hidden} скрыто</span>}
                        </span>
                    )}
                </div>
            </div>

            {/* Индикатор блокировки карты */}
            {scenarioLock && (
                <div className={styles.scenarioLockInfo}>
                    <MapPin size={16} />
                    <span>Карта заблокирована - все поля автоматически заблокированы</span>
                </div>
            )}

            {groupsCount > 0 && (
                <div className={styles.controls}>
                    <button
                        className={`${styles.globalLockButton} ${globalLock ? styles.globalLocked : ''}`}
                        onClick={handleToggleGlobalLock}
                        disabled={scenarioLock}
                        title={
                            scenarioLock
                                ? 'Разблокируйте карту чтобы управлять полями'
                                : globalLock
                                ? 'Снять глобальную блокировку всех полей'
                                : 'Заблокировать все поля глобально'
                        }
                    >
                        {globalLock ? <Lock size={16} /> : <Unlock size={16} />}
                        <span>{globalLock ? 'Глобальная блокировка' : 'Блокировать все'}</span>
                    </button>

                    <button
                        className={styles.resetButton}
                        onClick={handleResetAll}
                        disabled={scenarioLock}
                        title={scenarioLock ? 'Разблокируйте карту чтобы сбросить группы' : 'Сбросить все группы'}
                    >
                        <RotateCcw size={16} />
                        <span>Сбросить</span>
                    </button>
                </div>
            )}

            <div className={styles.groupsList}>
                {groupsCount === 0 ? (
                    <div className={styles.emptyState}>
                        <p>Группы появятся здесь автоматически при использовании компонента Block</p>
                        <code className={styles.exampleCode}>
                            {'<Block group="myGroup" label="Моя группа">...</Block>'}
                        </code>
                    </div>
                ) : (
                    sortedGroups.map((group) => <GroupControl key={group.id} group={group} />)
                )}
            </div>
        </div>
    );
}
