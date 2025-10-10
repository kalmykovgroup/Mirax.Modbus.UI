// src/features/chartsPage/charts/ui/ChartTabBar/ChartTabBar.tsx

import { useCallback, type JSX } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import styles from './ChartTabBar.module.css';
import {selectActiveTabId} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import {clearAll, closeTab, selectAllTabIds, setActiveTab} from "@chartsPage/charts/core/store/chartsSlice.ts";
import {ChartTabItem} from "@chartsPage/charts/ui/ChartTabBar/ChartTabItem/ChartTabItem.tsx";

export function ChartTabBar(): JSX.Element {
    const dispatch = useAppDispatch();
    const tabIds = useAppSelector(selectAllTabIds);
    const activeTabId = useAppSelector(selectActiveTabId);

    const handleCloseAll = useCallback(() => {
        dispatch(clearAll());
    }, [dispatch]);

    if (tabIds.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.placeholder}>
                    Выберите шаблон из списка слева для создания графика
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.tabs}>
                {tabIds.map((tabId) => (
                    <ChartTabItem
                        key={tabId}
                        tabId={tabId}
                        isActive={tabId === activeTabId}
                        onActivate={() => dispatch(setActiveTab(tabId))}
                        onClose={() => dispatch(closeTab(tabId))}
                    />
                ))}
            </div>

            {tabIds.length > 1 && (
                <button
                    className={styles.closeAllButton}
                    onClick={handleCloseAll}
                    title="Закрыть все графики"
                    type="button"
                >
                    Закрыть все
                </button>
            )}
        </div>
    );
}