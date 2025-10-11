// src/features/chartsPage/ChartsPage.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { MiraxContainer } from '@chartsPage/mirax/MiraxContainer/MiraxContainer.tsx';
import ChartTemplatesPanel from '@chartsPage/template/ui/ChartTemplatesPanel.tsx';
import CollapsibleSection from '@chartsPage/components/Collapse/CollapsibleSection.tsx';
import { DataSourcePanel } from '@chartsPage/metaData/ui/DataSourcePanel.tsx';
import { TabContent } from '@chartsPage/charts/ui/TabContent/TabContent.tsx';
import {
    selectAllTabIds,
    setActiveTab,
    closeTab,
    createTab,
    selectTabName,
} from '@chartsPage/charts/core/store/tabsSlice.ts';
import { clearAll } from '@chartsPage/charts/core/store/chartsSlice';
import { useConfirm } from '@ui/components/ConfirmProvider/ConfirmProvider';
import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/store/store';
import styles from './ChartsPage.module.css';

type TopTab = 'mirax' | 'templates';

export function ChartsPage() {
    const dispatch = useAppDispatch();
    const confirm = useConfirm();

    const [activeTopTab, setActiveTopTab] = useState<TopTab | Guid>('templates');

    const allTabIds = useSelector(selectAllTabIds);

    // Запоминаем предыдущее количество вкладок
    const prevTabsCountRef = useRef(allTabIds.length);

    // Автопереключение на первую вкладку графиков при создании (0 → 1)
    useEffect(() => {
        const prevCount = prevTabsCountRef.current;
        const currentCount = allTabIds.length;

        if (prevCount === 0 && currentCount > 0) {
            const firstTabId = allTabIds[0];
            if (firstTabId) {
                setActiveTopTab(firstTabId);
                dispatch(setActiveTab(firstTabId));
            }
        }

        prevTabsCountRef.current = currentCount;
    }, [allTabIds.length, allTabIds, dispatch]);

    // Обработка переключения вкладок
    const handleTabChange = (tab: TopTab | Guid) => {
        setActiveTopTab(tab);

        // Если это вкладка графика, обновляем activeTabId в store
        if (tab !== 'mirax' && tab !== 'templates') {
            dispatch(setActiveTab(tab as Guid));
        }
    };

    // Закрытие вкладки графика
    const handleCloseTab = async (e: React.MouseEvent, tabId: Guid) => {
        e.stopPropagation();

        const ok = await confirm({
            title: 'Закрыть вкладку?',
            description: 'Данные графиков будут удалены.',
            confirmText: 'Закрыть',
            cancelText: 'Отмена',
            danger: true,
        });

        if (!ok) return;

        dispatch(closeTab(tabId));

        // Если закрыли активную вкладку, переключаемся на другую
        if (activeTopTab === tabId) {
            const remaining = allTabIds.filter(id => id !== tabId);
            if (remaining.length > 0) {
                setActiveTopTab(remaining[0]!);
                dispatch(setActiveTab(remaining[0]!));
            } else {
                setActiveTopTab('templates');
            }
        }
    };

    // Создание новой вкладки
    const handleCreateNewTab = () => {
        const newTabId = crypto.randomUUID() as Guid;
        dispatch(
            createTab({
                id: newTabId,
                name: `Вкладка ${allTabIds.length + 1}`,
            })
        );
        setActiveTopTab(newTabId);
        dispatch(setActiveTab(newTabId));
    };

    // Закрыть все вкладки
    const handleCloseAll = async () => {
        const ok = await confirm({
            title: 'Закрыть все вкладки?',
            description: 'Все данные графиков будут удалены.',
            confirmText: 'Закрыть все',
            cancelText: 'Отмена',
            danger: true,
        });

        if (!ok) return;

        allTabIds.forEach(tabId => {
            dispatch(closeTab(tabId));
        });
        dispatch(clearAll());
        setActiveTopTab('templates');
    };

    return (
        <div className={styles.chartsPage}>
            {/* ВЕРХНЯЯ ПАНЕЛЬ - все вкладки на одном уровне */}
            <div className={styles.topTabBar}>
                {/* Системные вкладки */}
                <button
                    className={activeTopTab === 'mirax' ? styles.topTabActive : styles.topTab}
                    onClick={() => handleTabChange('mirax')}
                    type="button"
                >
                    Mirax
                </button>

                <button
                    className={activeTopTab === 'templates' ? styles.topTabActive : styles.topTab}
                    onClick={() => handleTabChange('templates')}
                    type="button"
                >
                    Шаблоны и источники
                </button>

                {/* Разделитель */}
                {allTabIds.length > 0 && <div className={styles.divider} />}

                {/* Вкладки графиков */}
                {allTabIds.map(tabId => (
                    <ChartTab
                        key={tabId}
                        tabId={tabId}
                        isActive={activeTopTab === tabId}
                        onActivate={() => handleTabChange(tabId)}
                        onClose={(e) => handleCloseTab(e, tabId)}
                    />
                ))}

                {/* Кнопка создания новой вкладки */}
                {allTabIds.length > 0 && (
                    <>
                        <button
                            className={styles.addTabButton}
                            onClick={handleCreateNewTab}
                            title="Создать новую вкладку"
                            type="button"
                        >
                            +
                        </button>

                        {/* Кнопка закрыть все */}
                        {allTabIds.length > 1 && (
                            <button
                                className={styles.closeAllButton}
                                onClick={handleCloseAll}
                                title="Закрыть все вкладки"
                                type="button"
                            >
                                ✕ Все
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* КОНТЕНТ */}
            <div className={styles.contentArea}>
                {/* Mirax */}
                {activeTopTab === 'mirax' && (
                    <div className={styles.pageContent}>
                        <MiraxContainer dbId={'77777777-0000-0000-0000-000000000011'} />
                    </div>
                )}

                {/* Шаблоны */}
                {activeTopTab === 'templates' && (
                    <div className={styles.pageContent}>
                        <ChartTemplatesPanel />
                        <CollapsibleSection>
                            <DataSourcePanel />
                        </CollapsibleSection>
                    </div>
                )}

                {/* Вкладки графиков */}
                {allTabIds.map(tabId => (
                    <div
                        key={tabId}
                        style={{
                            display: activeTopTab === tabId ? 'block' : 'none',
                        }}
                        className={styles.pageContent}
                    >
                        <TabContent tabId={tabId} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ========== КОМПОНЕНТ ВКЛАДКИ ГРАФИКА ==========

interface ChartTabProps {
    readonly tabId: Guid;
    readonly isActive: boolean;
    readonly onActivate: () => void;
    readonly onClose: (e: React.MouseEvent) => void;
}

function ChartTab({ tabId, isActive, onActivate, onClose }: ChartTabProps) {
    const tabName = useSelector((state: RootState) => selectTabName(state, tabId));

    return (
        <div
            className={isActive ? styles.chartTabActive : styles.chartTab}
            onClick={onActivate}
        >
            <span className={styles.tabLabel}>{tabName ?? 'Вкладка'}</span>
            <button
                className={styles.tabCloseButton}
                onClick={onClose}
                title="Закрыть вкладку"
                type="button"
            >
                ×
            </button>
        </div>
    );
}