// src/pages/ChartsBreaksPage.tsx


import styles from "./ChartsPage.module.css"
import {RequestManagerProvider} from "@chartsPage/charts/orchestration/requests/RequestManagerProvider.tsx";
import {ChartContainer} from "@chartsPage/charts/ui/ChartContainer/ChartContainer.tsx";
import ChartTemplatesPanel from "@chartsPage/template/ui/ChartTemplatesPanel.tsx";
import CollapsibleSection from "@chartsPage/components/Collapse/CollapsibleSection.tsx";
import {DataSourcePanel} from "@chartsPage/metaData/ui/DataSourcePanel.tsx";
import {MiraxContainer} from "@chartsPage/charts/mirax/MiraxContainer/MiraxContainer.tsx";
import {useAppSelector} from "@/store/hooks.ts";
import {selectActiveTabId} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import {ChartTabBar} from "@chartsPage/charts/ui/ChartTabBar/ChartTabBar.tsx";

export default function ChartsPage() {
    const activeTabId = useAppSelector(selectActiveTabId);

    return (
        <div className={styles.chartPageContainer}>
            <MiraxContainer dbId={'77777777-0000-0000-0000-000000000011'} />

            <ChartTemplatesPanel />

            <CollapsibleSection>
                <DataSourcePanel />
            </CollapsibleSection>

            {/* Полоса вкладок графиков */}
            <ChartTabBar />

            {/* Контейнер графиков с RequestManager для активной вкладки */}
            {activeTabId && (
                <RequestManagerProvider tabId={activeTabId}>
                    <ChartContainer />
                </RequestManagerProvider>
            )}
        </div>
    );
}