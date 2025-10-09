// src/features/mirax/components/TabBar/TabBar.tsx
import { useCallback, type JSX } from 'react';

import styles from './TabBar.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    selectOpenTabs,
    selectActiveTabId,
    setActiveTab,
    closeTechnicalRunTab,
    closeAllTabs,
} from '@chartsPage/charts/mirax/miraxSlice';
import { TabItem } from './TabItem/TabItem';

export function TabBar(): JSX.Element {
    const dispatch = useAppDispatch();
    const openTabs = useAppSelector(selectOpenTabs);
    const activeTabId = useAppSelector(selectActiveTabId);

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
                    <TabItem
                        key={tab.id}
                        tab={tab}
                        isActive={tab.id === activeTabId}
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