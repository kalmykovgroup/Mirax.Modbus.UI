// src/features/scenarioEditor/core/ui/map/components/LockButton/LockButton.tsx

import { useDispatch, useSelector } from 'react-redux';
import { Lock, LockOpen } from 'lucide-react';
import { toggleLock, selectIsLocked } from '@scenario/core/features/lockSystem/lockSlice';
import { setGlobalLock } from '@scenario/core/features/fieldLockSystem';
import styles from './LockButton.module.css';

export function LockButton() {
    const dispatch = useDispatch();
    const isLocked = useSelector(selectIsLocked);

    const handleToggle = () => {
        const newState = !isLocked;
        dispatch(toggleLock());
        // Синхронизируем с глобальной блокировкой полей
        dispatch(setGlobalLock(newState));
    };

    return (
        <button
            className={`${styles.lockButton} ${isLocked ? styles.locked : styles.unlocked}`}
            onClick={handleToggle}
            title={isLocked ? 'Разблокировать карту и все поля' : 'Заблокировать карту и все поля'}
        >
            {isLocked ? <Lock size={20} /> : <LockOpen size={20} />}
        </button>
    );
}
