// src/features/chartsPage/charts/ui/TabContent/TabContent.tsx

import {useMemo, useState} from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { useConfirm } from '@ui/components/ConfirmProvider/ConfirmProvider';
import {
    selectTabContextIds,
    selectVisibleContextIds,
    toggleContextVisibility,
    showAllContexts,
    hideAllContexts,
    removeContextFromTab, selectTabSyncEnabled, selectActiveTabId, selectTabName,
} from '@chartsPage/charts/core/store/tabsSlice.ts';
import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/store/store';
import styles from './TabContent.module.css';
import { ContextFilterItem } from '@chartsPage/charts/ui/TabContent/ContextFilterItem/ContextFilterItem.tsx';
import { ContextSection } from '@chartsPage/charts/ui/TabContent/ContextSection/ContextSection.tsx';
import {
    SyncButton,
} from '@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/SyncFields/SyncButton/SyncButton.tsx';
import {useDocumentTitle} from "@app/lib/hooks/DocumentTitleContext.tsx";


interface TabContentProps {
    readonly tabId: Guid;
}

/**
 * Контент вкладки: фильтр контекстов + список графиков
 *
 * АРХИТЕКТУРА "ЖИВЫХ КОНТЕКСТОВ":
 * - Рендерит ВСЕ контексты одновременно (не unmount при скрытии)
 * - Управляет видимостью через CSS (display: block/none)
 * - RequestManager'ы остаются живыми → загрузка для всех контекстов
 */
export function TabContent({ tabId }: TabContentProps) {
    const dispatch = useAppDispatch();
    const confirm = useConfirm();

    //  КРИТИЧНО: allContextIds для рендеринга, visibleContextIds для видимости
    const allContextIds = useSelector((state: RootState) => selectTabContextIds(state, tabId));
    const visibleContextIds = useSelector((state: RootState) =>
        selectVisibleContextIds(state, tabId)
    );


 
    const [filterOpen, setFilterOpen] = useState(false);

    const allVisible = allContextIds.length === visibleContextIds.length;
    
    // Получаем активную вкладку
    const activeTabId = useSelector(selectActiveTabId);

    const isActiveTab = tabId === activeTabId;
    // Состояние синхронизации текущей вкладки
    const syncEnabled = useSelector((state: RootState) => {
        if (!activeTabId) return false;
        return selectTabSyncEnabled(state, activeTabId);
    });

    const tabName = useSelector((state: RootState) =>
        selectTabName(state, tabId)
    );

    //  Формируем title
    const pageTitle = useMemo(() => {
        if (!isActiveTab) return 'Графики'; // Неактивная вкладка
        return `Графики | ${tabName}`;
    }, [isActiveTab, tabName]);

    //  Регистрируем title ТОЛЬКО если это активная вкладка
    useDocumentTitle(
        pageTitle,
        0, // Приоритет
        isActiveTab // КЛЮЧЕВОЙ ПАРАМЕТР: enabled только для активной вкладки
    );

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
            {/* Фильтр контекстов */}
            <div className={styles.contextFilter}>
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
                            {allContextIds.map((contextId) => (
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

            {/* Липкая обёртка для SyncButton */}
            <div
                className={`${styles.syncButtonContainer} ${syncEnabled ? styles.syncButtonSticky : ''}`}
            >
                <SyncButton />
            </div>

            {/*  КРИТИЧНОЕ ИЗМЕНЕНИЕ: Рендерим ВСЕ контексты, управляем видимостью через CSS */}
            <div className={styles.contextSections}>
                {allContextIds.map((contextId) => {
                    const isVisible = visibleContextIds.includes(contextId);

                    if(isVisible){

                    }

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
                    <p className={styles.hint}>Используйте фильтр выше для выбора шаблонов</p>
                </div>
            )}
        </div>
    );
}


