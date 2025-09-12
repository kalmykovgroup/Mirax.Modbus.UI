// src/pages/ChartsBreaksPage.tsx

import {DataSourcePanel} from "@/charts/ui/ChartsPage/DataSourcePanel.tsx";
import ChartTemplatesPanel from "@/charts/ui/ChartTemplatesPanel/ChartTemplatesPanel.tsx";




export default function ChartsPage() {

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 12 }}>
            <ChartTemplatesPanel  />

            <DataSourcePanel
                onApply={(args) => {
                    // здесь вы потом нажмёте "Построить графики"
                    console.log('apply from DS panel', args)
                }}
            />
        </div>
    )
}
