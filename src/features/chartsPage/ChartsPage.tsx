// src/features/chartsPage/ChartsPage.tsx

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import styles from './ChartsPage.module.css';
import {selectActiveTabId, selectAllTabIds} from "@chartsPage/charts/core/store/tabsSlice.ts";
import {ChartTabBar} from "@chartsPage/charts/ui/ChartTabBar/ChartTabBar.tsx";
import {MiraxContainer} from "@chartsPage/mirax/MiraxContainer/MiraxContainer.tsx";
import ChartTemplatesPanel from "@chartsPage/template/ui/ChartTemplatesPanel.tsx";
import CollapsibleSection from "@chartsPage/components/Collapse/CollapsibleSection.tsx";
import {DataSourcePanel} from "@chartsPage/metaData/ui/DataSourcePanel.tsx";
import {TabContent} from "@chartsPage/charts/ui/TabContent/TabContent.tsx";

type TopTab = 'mirax' | 'templates' | 'charts';

export function ChartsPage() {
    const [activeTopTab, setActiveTopTab] = useState<TopTab>('templates');

    const allTabIds = useSelector(selectAllTabIds);
    const activeTabId = useSelector(selectActiveTabId);

    // Автопереключение на charts при создании первой вкладки
    useEffect(() => {
        if (allTabIds.length > 0 && activeTopTab !== 'charts') {
            setActiveTopTab('charts');
        }
    }, [allTabIds.length, activeTopTab]);

    const handleTabChange = (tab: TopTab) => {
        setActiveTopTab(tab);
    };

    return (
        <div className={styles.chartsPage}>
            {/* Верхняя навигация (3 вкладки) */}
            <div className={styles.topTabBar}>
                <button
                    className={activeTopTab === 'mirax' ? styles.topTabActive : styles.topTab}
                    onClick={() => handleTabChange('mirax')}
                >
                    Mirax
                </button>

                <button
                    className={activeTopTab === 'templates' ? styles.topTabActive : styles.topTab}
                    onClick={() => handleTabChange('templates')}
                >
                    Шаблоны и источники
                </button>

                {/* Третья вкладка с ChartTabBar */}
                <div
                    role="button"
                    tabIndex={0}
                    className={
                        activeTopTab === 'charts' ? styles.topTabActiveWrapper : styles.topTabWrapper
                    }
                    onClick={() => handleTabChange('charts')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleTabChange('charts');
                        }
                    }}
                >
                    <ChartTabBar />
                </div>
            </div>

            {/* Контент вкладок верхнего уровня */}
            <div className={styles.topTabContent}>
                {/* Вкладка Mirax */}
                <div className={activeTopTab === 'mirax' ? styles.tabVisible : styles.tabHidden}>
                    <MiraxContainer dbId={'77777777-0000-0000-0000-000000000011'} />
                </div>

                {/* Вкладка Шаблоны и источники */}
                <div className={activeTopTab === 'templates' ? styles.tabVisible : styles.tabHidden}>
                    <ChartTemplatesPanel />
                    <CollapsibleSection>
                        <DataSourcePanel />
                    </CollapsibleSection>
                </div>

                {/* Вкладка Графики - показываем сообщение если нет вкладок */}
                <div className={activeTopTab === 'charts' ? styles.tabVisible : styles.tabHidden}>
                    {allTabIds.length === 0 && (
                        <div className={styles.emptyState}>
                            <p>Выберите шаблон из списка слева для создания графика</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Контейнер для ВСЕХ вкладок - рендерятся всегда */}
            <div
                className={
                    activeTopTab === 'charts'
                        ? styles.chartsContainerVisible
                        : styles.chartsContainerHidden
                }
            >
                {allTabIds.map((tabId) => (
                    <div
                        key={tabId}
                        className={tabId === activeTabId ? styles.tabVisible : styles.tabHidden}
                    >
                        <TabContent tabId={tabId} />
                    </div>
                ))}
            </div>
        </div>
    );
}