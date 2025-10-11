// src/features/chartsPage/charts/ui/ChartTabBar/ChartTabBar.tsx

import { type JSX } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { ChartTabItem } from '@chartsPage/charts/ui/ChartTabBar/ChartTabItem/ChartTabItem.tsx';
import { useConfirm } from '@ui/components/ConfirmProvider/ConfirmProvider.tsx';

import { clearAll } from '@chartsPage/charts/core/store/chartsSlice'; // ← clearAll остался в contextsSlice
import styles from './ChartTabBar.module.css';
import {closeTab, selectActiveTabId, selectAllTabIds, setActiveTab} from "@chartsPage/charts/core/store/tabsSlice.ts";

export function ChartTabBar(): JSX.Element {
    const dispatch = useAppDispatch();
    const tabIds = useAppSelector(selectAllTabIds);
    const activeTabId = useAppSelector(selectActiveTabId);
    const confirm = useConfirm();

    const handleCloseAll = async () => {
        const ok = await confirm({
            title: 'Закрыть все вкладки?',
            description: 'Данные по графикам будут очищены из браузера.',
            confirmText: 'Закрыть',
            cancelText: 'Отмена',
            danger: true,
        });
        if (ok) {
            // Закрыть все вкладки
            tabIds.forEach((tabId) => {
                dispatch(closeTab(tabId));
            });
            // Опционально: очистить все контексты
            dispatch(clearAll());
        }
    };

    if (tabIds.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.placeholder}>
                    Выберите шаблон или испытание из списка слева для создания графика
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