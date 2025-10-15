// src/features/chartsPage/charts/ui/TabContent/TabContent.tsx

import {useMemo, useState, useCallback} from 'react';
import { useSelector } from 'react-redux';
import {useAppDispatch, useAppSelector} from '@/baseStore/hooks.ts';
import { useConfirm } from '@ui/components/ConfirmProvider/ConfirmProvider';
import {
    selectTabContextIds,
    selectVisibleContextIds,
    toggleContextVisibility,
    showAllContexts,
    hideAllContexts,
    removeContextFromTab,
    selectTabSyncEnabled,
    selectActiveTabId,
    selectTabName,
} from '@chartsPage/charts/core/store/tabsSlice';
import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/baseStore/store.ts';
import styles from './TabContent.module.css';
import { ContextFilterItem } from '@chartsPage/charts/ui/TabContent/ContextFilterItem/ContextFilterItem';
import { ContextSection } from '@chartsPage/charts/ui/TabContent/ContextSection/ContextSection';
import { SyncButton } from '@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/SyncFields/SyncButton/SyncButton';
import { useDocumentTitle } from '@app/lib/hooks/DocumentTitleContext';
import {selectChartContexts} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";

interface TabContentProps {
    readonly tabId: Guid;
}

export function TabContent({ tabId }: TabContentProps) {
    const dispatch = useAppDispatch();
    const confirm = useConfirm();

    const allContextIds = useSelector((state: RootState) =>
        selectTabContextIds(state, tabId)
    );
    const visibleContextIds = useSelector((state: RootState) =>
        selectVisibleContextIds(state, tabId)
    );
    const chartContexts = useAppSelector(selectChartContexts);

    const [filterOpen, setFilterOpen] = useState(false);

    const allVisible = allContextIds.length === visibleContextIds.length;

    const activeTabId = useSelector(selectActiveTabId);
    const isActiveTab = tabId === activeTabId;

    const syncEnabled = useSelector((state: RootState) => {
        if (!activeTabId) return false;
        return selectTabSyncEnabled(state, activeTabId);
    });

    const tabName = useSelector((state: RootState) =>
        selectTabName(state, tabId)
    );


    const sortedContextIds = useMemo(() => {
        return [...allContextIds].sort((contextIdA: Guid, contextIdB: Guid) => {
            const template1 = chartContexts[contextIdA]?.template;
            const template2 = chartContexts[contextIdB]?.template;

            if (!template1) {
                console.error(`Шаблон не найден для contextId: ${contextIdA}`);
                return 0;
            }

            if (!template2) {
                console.error(`Шаблон не найден для contextId: ${contextIdB}`);
                return 0;
            }

            const orderA = template1.visualOrder ?? 0;
            const orderB = template2.visualOrder ?? 0;
            return orderA - orderB;
        });
    }, [allContextIds, chartContexts]);
    
    const pageTitle = useMemo(() => {
        if (!isActiveTab) return 'Графики';
        return `Графики | ${tabName}`;
    }, [isActiveTab, tabName]);

    useDocumentTitle(pageTitle, 0, isActiveTab);

    const handleToggleAll = useCallback(() => {
        if (allVisible) {
            dispatch(hideAllContexts(tabId));
        } else {
            dispatch(showAllContexts(tabId));
        }
    }, [allVisible, dispatch, tabId]);

    const handleRemoveContext = useCallback(
        async (contextId: Guid) => {
            const ok = await confirm({
                title: 'Удалить контекст?',
                description: 'Контекст будет удалён из вкладки',
                confirmText: 'Удалить',
                cancelText: 'Отмена',
                danger: true,
            });
            if (ok) {
                dispatch(removeContextFromTab({ tabId, contextId }));
            }
        },
        [confirm, dispatch, tabId]
    );


    if (allContextIds.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>Выберите шаблон из списка слева для добавления в эту вкладку</p>
            </div>
        );
    }

    return (
        <div className={styles.tabContent}>
            {/* Фильтр контекстов */}
            <div className={styles.contextFilter}>
                <button
                    className={styles.filterToggle}
                    onClick={() => setFilterOpen(!filterOpen)}
                    type="button"
                    aria-expanded={filterOpen}
                >
                    <span className={styles.filterArrow}>
                        {filterOpen ? '▼' : '▶'}
                    </span>
                    <span className={styles.filterTitle}>
                        Фильтр шаблонов ({visibleContextIds.length} из{' '}
                        {allContextIds.length})
                    </span>
                </button>

                {filterOpen && (
                    <div className={styles.filterContent}>
                        <div className={styles.filterActions}>
                            <button
                                className={styles.filterToggleAll}
                                onClick={handleToggleAll}
                                type="button"
                                title={allVisible ? 'Скрыть все' : 'Показать все'}
                            >
                                {allVisible ? '☑' : '☐'} Все
                            </button>
                        </div>

                        <div className={styles.contextList}>
                            {sortedContextIds.map((contextId) => {

                                return (
                                    <ContextFilterItem
                                        key={contextId}
                                        tabId={tabId}
                                        contextId={contextId}
                                        isVisible={visibleContextIds.includes(contextId)}
                                        onToggle={() =>
                                            dispatch(
                                                toggleContextVisibility({ tabId, contextId })
                                            )
                                        }
                                        onRemove={() => handleRemoveContext(contextId)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Липкая обёртка для SyncButton */}
            <div
                className={`${styles.syncButtonContainer} ${
                    syncEnabled ? styles.syncButtonSticky : ''
                }`}
            >
                <SyncButton />
            </div>

            {/* Рендерим ВСЕ контексты, управляем видимостью через CSS */}
            <div className={styles.contextSections}>
                {sortedContextIds.map((contextId) => {
                    const isVisible = visibleContextIds.includes(contextId);

                    return (
                        <div
                            key={contextId}
                            className={styles.contextWrapper}
                            style={{ display: isVisible ? 'block' : 'none' }}
                        >
                            <ContextSection contextId={contextId} />
                        </div>
                    );
                })}
            </div>

            {/* Пустое состояние показываем поверх скрытых контекстов */}
            {visibleContextIds.length === 0 && (
                <div className={styles.emptyStateOverlay}>
                    <p>Нет выбранных шаблонов для отображения</p>
                    <p className={styles.hint}>
                        Используйте фильтр выше для выбора шаблонов
                    </p>
                </div>
            )}
        </div>
    );
}