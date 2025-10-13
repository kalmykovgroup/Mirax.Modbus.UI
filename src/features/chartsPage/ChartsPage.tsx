// src/features/chartsPage/ChartsPage.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { MiraxContainer } from '@chartsPage/mirax/MiraxContainer/MiraxContainer.tsx';
import ChartTemplatesPanel from '@chartsPage/template/ui/ChartTemplatesPanel.tsx';
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
import classNames from "classnames";

type TopTab = 'mirax' | 'templates';

export function ChartsPage() {
    const dispatch = useAppDispatch();
    const confirm = useConfirm();

    const [activeTopTab, setActiveTopTab] = useState<TopTab | Guid>('mirax');
    const [topBarHeight, setTopBarHeight] = useState(49);

    const topBarRef = useRef<HTMLDivElement>(null);
    const allTabIds = useSelector(selectAllTabIds);

    // ============================================
    // ОТСЛЕЖИВАНИЕ ВЫСОТЫ topTabBar
    // ============================================
    useEffect(() => {
        const topBar = topBarRef.current;
        if (!topBar) return;

        const updateHeight = (): void => {
            const height = topBar.getBoundingClientRect().height;
            setTopBarHeight(height);
        };

        updateHeight();

        const resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(topBar);

        window.addEventListener('resize', updateHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateHeight);
        };
    }, []);



    // Обработка переключения вкладок
    const handleTabChange = (tab: TopTab | Guid) => {
        setActiveTopTab(tab);

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
        <div
            className={styles.chartsPage}
            style={{
                '--topbar-height': `${topBarHeight}px`
            } as React.CSSProperties}
        >
            {/* ВЕРХНЯЯ ПАНЕЛЬ - все вкладки на одном уровне */}
            <div className={styles.topTabBar} ref={topBarRef}>
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

            {/* 🔥 КРИТИЧНО: КОНТЕНТ - ВСЕ вкладки рендерятся одновременно */}
            <div className={styles.contentArea}>
                {/* Mirax - рендерится всегда, скрывается через display */}
                <div
                    style={{ display: activeTopTab === 'mirax' ? 'block' : 'none' }}
                    className={styles.pageContent}
                >
                    <MiraxContainer />
                </div>

                {/* Шаблоны - рендерится всегда, скрывается через display */}
                <div
                    style={{ display: activeTopTab === 'templates' ? 'block' : 'none' }}
                    className={classNames(styles.pageContent)}
                >
                    <ChartTemplatesPanel />

                </div>

                {/* Вкладки графиков - рендерятся всегда, скрываются через display */}
                {allTabIds.map(tabId => (
                    <div
                        key={tabId}
                        style={{ display: activeTopTab === tabId ? 'block' : 'none' }}
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