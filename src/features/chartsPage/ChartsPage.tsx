// src/pages/ChartsBreaksPage.tsx


import styles from "./ChartsPage.module.css"
import {RequestManagerProvider} from "@chartsPage/charts/orchestration/requests/RequestManagerProvider.tsx";
import {ChartContainer} from "@chartsPage/charts/ui/ChartContainer/ChartContainer.tsx";
import ChartTemplatesPanel from "@chartsPage/template/ui/ChartTemplatesPanel.tsx";
import CollapsibleSection from "@chartsPage/components/Collapse/CollapsibleSection.tsx";
import {DataSourcePanel} from "@chartsPage/metaData/ui/DataSourcePanel.tsx";
import {MiraxContainer} from "@chartsPage/charts/mirax/MiraxContainer/MiraxContainer.tsx";

export default function ChartsPage() {


    return (
        <div className={styles.charPageContainer}>

            <MiraxContainer dbId={"77777777-0000-0000-0000-000000000011"}/>

            <ChartTemplatesPanel  />

            <CollapsibleSection>
                  <DataSourcePanel />
            </CollapsibleSection>

            <RequestManagerProvider>
                <ChartContainer />
            </RequestManagerProvider>

        </div>
    )
}
