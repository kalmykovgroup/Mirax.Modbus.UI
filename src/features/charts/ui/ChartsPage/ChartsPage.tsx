// src/pages/ChartsBreaksPage.tsx

import {DataSourcePanel} from "@charts/ui/ChartsPage/DataSourcePanel.tsx";
import ChartTemplatesPanel from "@charts/ui/ChartTemplatesPanel/ChartTemplatesPanel.tsx";
import type {ChartReqTemplateDto} from "@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto.ts";
import {useAppDispatch} from "@/store/hooks.ts";
import {setApplyTemplate} from "@charts/store/chartsMetaSlice.ts";




export default function ChartsPage() {
        const dispatch = useAppDispatch();
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12 }}>
            <ChartTemplatesPanel onPick={
                (template: ChartReqTemplateDto) => {
                    dispatch(setApplyTemplate(template))
                }
            }  />

            <DataSourcePanel
                onApply={(args) => {
                    // здесь вы потом нажмёте "Построить графики"
                    console.log('apply from DS panel', args)
                }}
            />
        </div>
    )
}
