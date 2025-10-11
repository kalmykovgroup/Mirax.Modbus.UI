// src/features/chartsPage/ChartsPage.tsx

import {type JSX, useCallback, useState} from 'react';
import styles from './ChartsPage.module.css';
import { RequestManagerProvider } from '@chartsPage/charts/orchestration/requests/RequestManagerProvider.tsx';
import { ChartContainer } from '@chartsPage/charts/ui/ChartContainer/ChartContainer.tsx';
import ChartTemplatesPanel from '@chartsPage/template/ui/ChartTemplatesPanel.tsx';
import CollapsibleSection from '@chartsPage/components/Collapse/CollapsibleSection.tsx';
import { DataSourcePanel } from '@chartsPage/metaData/ui/DataSourcePanel.tsx';
import { MiraxContainer } from '@chartsPage/mirax/MiraxContainer/MiraxContainer.tsx';
import { useAppSelector } from '@/store/hooks.ts';
import { selectAllTabIds } from '@chartsPage/charts/core/store/chartsSlice.ts';
import { ChartTabBar } from '@chartsPage/charts/ui/ChartTabBar/ChartTabBar.tsx';
import { selectActiveTabId } from '@chartsPage/charts/core/store/selectors/base.selectors.ts';

type TopTabId = 'mirax' | 'templates' | 'charts';

export default function ChartsPage(): JSX.Element {
    const activeTabId = useAppSelector(selectActiveTabId);
    const allTabIds = useAppSelector(selectAllTabIds);

    const [activeTopTab, setActiveTopTab] = useState<TopTabId>('mirax');

    const handleTabChange = useCallback((tabId: TopTabId): void => {
        setActiveTopTab(tabId);
    }, []);

    return (
        <div className={styles.chartPageContainer}>
            {/* Вкладки верхнего уровня */}
            <div className={styles.topTabsContainer}>
                <button
                    type="button"
                    className={activeTopTab === 'mirax' ? styles.topTabActive : styles.topTab}
                    onClick={() => handleTabChange('mirax')}
                >
                    Mirax
                </button>
                <button
                    type="button"
                    className={activeTopTab === 'templates' ? styles.topTabActive : styles.topTab}
                    onClick={() => handleTabChange('templates')}
                >
                    Шаблоны и источники
                </button>

                {/* Третья вкладка с ChartTabBar вместо текста */}
                <div
                    role="button"
                    tabIndex={0}
                    className={activeTopTab === 'charts' ? styles.topTabActiveWrapper : styles.topTabWrapper}
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

            {/* Контент вкладок верхнего уровня - все рендерятся, неактивные скрыты */}
            <div className={styles.topTabContent}>

                {/* Вкладка Mirax */}
                <div className={activeTopTab === 'mirax' ? styles.tabVisible : styles.tabHidden}>
                    <MiraxContainer dbId={'77777777-0000-0000-0000-000000000011'} />
                </div>
                {/* Вкладка Шаблоны и источники */}
                <div
                    className={activeTopTab === 'templates' ? styles.tabVisible : styles.tabHidden}
                >
                    <ChartTemplatesPanel />
                    <CollapsibleSection>
                        <DataSourcePanel />
                    </CollapsibleSection>
                </div>

                {/* Вкладка Графики - контейнер для отображения сообщения */}
                <div className={activeTopTab === 'charts' ? styles.tabVisible : styles.tabHidden}>
                    {allTabIds.length === 0 && (
                        <div className={styles.emptyState}>
                            <p>Выберите шаблон из списка слева для создания графика</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Контейнеры для ВСЕХ графиков - рендерятся всегда, но скрыты если не на вкладке charts */}
            <div
                className={activeTopTab === 'charts' ? styles.chartsContainerVisible : styles.chartsContainerHidden}
            >
                {allTabIds.map((tabId) => (
                    <div
                        key={tabId}
                        className={tabId === activeTabId ? styles.chartTabVisible : styles.chartTabHidden}
                    >
                        <RequestManagerProvider tabId={tabId}>
                            <ChartContainer />
                        </RequestManagerProvider>
                    </div>
                ))}
            </div>
        </div>
    );
}