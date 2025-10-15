// src/features/mirax/components/TabBar/TabBar.tsx
import { useCallback, type JSX } from 'react';

import styles from './TabBar_PortableDevices.module.css';
import { useAppDispatch, useAppSelector } from '@/baseStore/hooks.ts';
import {
    selectOpenTabs,
    selectActiveContextId,
    setActiveTab,
    closeTechnicalRunTab,
    closeAllTabs,
} from '@chartsPage/mirax/miraxSlice.ts';
import { TabItem_PortableDevices } from './TabItem_PortableDevices/TabItem_PortableDevices.tsx';

export function TabBar_PortableDevices(): JSX.Element {
    const dispatch = useAppDispatch();
    const openTabs = useAppSelector(selectOpenTabs);
    const activeContextId = useAppSelector(selectActiveContextId);

    const handleCloseAll = useCallback(() => {
        dispatch(closeAllTabs());
    }, [dispatch]);

    if (openTabs.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.placeholder}>
                    Выберите испытание из списка слева
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.tabs}>
                {openTabs.map((tab) => (
                    <TabItem_PortableDevices
                        key={tab.id}
                        tab={tab}
                        isActive={tab.id === activeContextId}
                        onActivate={() => dispatch(setActiveTab(tab.id))}
                        onClose={() => dispatch(closeTechnicalRunTab(tab.id))}
                    />
                ))}
            </div>

            {openTabs.length > 1 && (
                <button className={styles.closeAllButton} onClick={handleCloseAll} title="Закрыть все">
                    Закрыть все
                </button>
            )}
        </div>
    );
}