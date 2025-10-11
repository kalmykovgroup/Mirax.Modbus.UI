// src/features/chartsPage/tabs/ui/TabContent.tsx

import { useSelector } from 'react-redux';
import { RequestManagerProvider } from '@chartsPage/charts/orchestration/requests/RequestManagerProvider';
import { ChartContainer } from '@chartsPage/charts/ui/ChartContainer/ChartContainer';

import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/store/store';
import styles from './TabContent.module.css';
import {selectActiveContextId, selectTabContextIds} from "@chartsPage/charts/core/store/tabsSlice.ts";
import {ContextTabBar} from "@chartsPage/charts/ui/ContextTabBar/ContextTabBar.tsx";

interface TabContentProps {
    readonly tabId: Guid;
}

/**
 * Контент одной вкладки - отображает список контекстов
 */
export function TabContent({ tabId }: TabContentProps) {
    const contextIds = useSelector((state: RootState) => selectTabContextIds(state, tabId));
    const activeContextId = useSelector((state: RootState) => selectActiveContextId(state, tabId));

    if (contextIds.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>Выберите шаблон из списка слева для добавления в эту вкладку</p>
            </div>
        );
    }

    return (
        <div className={styles.tabContent}>
            {/* Панель переключения контекстов */}
            <ContextTabBar
                tabId={tabId}
                contextIds={contextIds}
                activeContextId={activeContextId}
            />

            {/* Рендерим все контексты, показываем только активный */}
            <div className={styles.contextsContainer}>
                {contextIds.map((contextId) => (
                    <div
                        key={contextId}
                        className={
                            contextId === activeContextId
                                ? styles.contextVisible
                                : styles.contextHidden
                        }
                    >
                        <RequestManagerProvider contextId={contextId}>
                            <ChartContainer/>
                        </RequestManagerProvider>
                    </div>
                ))}
            </div>
        </div>
    );
}