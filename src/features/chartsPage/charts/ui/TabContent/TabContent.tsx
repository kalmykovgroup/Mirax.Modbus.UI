// src/features/chartsPage/charts/ui/TabContent/TabContent.tsx

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { useConfirm } from '@ui/components/ConfirmProvider/ConfirmProvider';
import {
    selectTabContextIds,
    selectVisibleContextIds,
    toggleContextVisibility,
    showAllContexts,
    hideAllContexts,
    removeContextFromTab,
} from '@chartsPage/charts/core/store/tabsSlice.ts';
import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/store/store';
import styles from './TabContent.module.css';
import {ContextFilterItem} from "@chartsPage/charts/ui/TabContent/ContextFilterItem/ContextFilterItem.tsx";
import {ContextSection} from "@chartsPage/charts/ui/TabContent/ContextSection/ContextSection.tsx";
import {
    SyncButton
} from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/SyncFields/SyncButton/SyncButton.tsx";

interface TabContentProps {
    readonly tabId: Guid;
}

/**
 * Контент вкладки: фильтр контекстов + список графиков
 */
export function TabContent({ tabId }: TabContentProps) {
    const dispatch = useAppDispatch();
    const confirm = useConfirm();

    const allContextIds = useSelector((state: RootState) => selectTabContextIds(state, tabId));
    const visibleContextIds = useSelector((state: RootState) =>
        selectVisibleContextIds(state, tabId)
    );

    // Состояние раскрытия фильтра
    const [filterOpen, setFilterOpen] = useState(false);

    const allVisible = allContextIds.length === visibleContextIds.length;

    const handleToggleAll = () => {
        if (allVisible) {
            dispatch(hideAllContexts(tabId));
        } else {
            dispatch(showAllContexts(tabId));
        }
    };

    const handleRemoveContext = async (contextId: Guid) => {
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
    };

    if (allContextIds.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>Выберите шаблон из списка слева для добавления в эту вкладку</p>
            </div>
        );
    }

    return (
        <div className={styles.tabContent}>
            {/* Фильтр контекстов (collapsible) */}
            <div className={styles.contextFilter}>
                {/* Заголовок с кнопкой раскрытия */}
                <button
                    className={styles.filterToggle}
                    onClick={() => setFilterOpen(!filterOpen)}
                    type="button"
                    aria-expanded={filterOpen}
                >
                    <span className={styles.filterArrow}>{filterOpen ? '▼' : '▶'}</span>
                    <span className={styles.filterTitle}>
                        Фильтр шаблонов ({visibleContextIds.length} из {allContextIds.length})
                    </span>
                </button>

                {/* Раскрывающийся контент */}
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
                            {allContextIds.map(contextId => (
                                <ContextFilterItem
                                    key={contextId}
                                    tabId={tabId}
                                    contextId={contextId}
                                    isVisible={visibleContextIds.includes(contextId)}
                                    onToggle={() =>
                                        dispatch(toggleContextVisibility({ tabId, contextId }))
                                    }
                                    onRemove={() => handleRemoveContext(contextId)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <SyncButton />

            {/* Графики */}
            {visibleContextIds.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>Нет выбранных шаблонов для отображения</p>
                    <p className={styles.hint}>Используйте фильтр выше для выбора шаблонов</p>
                </div>
            ) : (
                <div className={styles.contextSections}>
                    {visibleContextIds.map(contextId => (
                        <ContextSection key={contextId} contextId={contextId} />
                    ))}
                </div>
            )}
        </div>
    );
}