// src/features/chartsPage/ChartsPage.tsx

import styles from './ChartsPage.module.css';
import { RequestManagerProvider } from '@chartsPage/charts/orchestration/requests/RequestManagerProvider.tsx';
import { ChartContainer } from '@chartsPage/charts/ui/ChartContainer/ChartContainer.tsx';
import ChartTemplatesPanel from '@chartsPage/template/ui/ChartTemplatesPanel.tsx';
import CollapsibleSection from '@chartsPage/components/Collapse/CollapsibleSection.tsx';
import { DataSourcePanel } from '@chartsPage/metaData/ui/DataSourcePanel.tsx';
import { MiraxContainer } from '@chartsPage/charts/mirax/MiraxContainer/MiraxContainer.tsx';
import { useAppSelector } from '@/store/hooks.ts';
import { selectAllTabIds } from '@chartsPage/charts/core/store/chartsSlice.ts';
import { ChartTabBar } from '@chartsPage/charts/ui/ChartTabBar/ChartTabBar.tsx';
import {selectActiveTabId} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";

export default function ChartsPage() {
    const activeTabId = useAppSelector(selectActiveTabId);
    const allTabIds = useAppSelector(selectAllTabIds);

    return (
        <div className={styles.chartPageContainer}>
            <MiraxContainer dbId={'77777777-0000-0000-0000-000000000011'} />

            <ChartTemplatesPanel />

            <CollapsibleSection>
                <DataSourcePanel />
            </CollapsibleSection>

            {/* Полоса вкладок графиков */}
            <ChartTabBar />

            {/* Контейнеры для ВСЕХ вкладок - скрываем неактивные через CSS */}
            <div className={styles.chartsContainer}>
                {allTabIds.map((tabId) => (
                    <div
                        key={tabId}
                        className={styles.chartTabContent}
                        style={{ display: tabId === activeTabId ? 'block' : 'none' }}
                    >
                        <RequestManagerProvider tabId={tabId}>
                            <ChartContainer />
                        </RequestManagerProvider>
                    </div>
                ))}
            </div>

            {allTabIds.length === 0 && (
                <div className={styles.emptyState}>
                    <p>Выберите шаблон из списка слева для создания графика</p>
                </div>
            )}
        </div>
    );
}