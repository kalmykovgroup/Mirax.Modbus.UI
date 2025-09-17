// src/pages/ChartsBreaksPage.tsx

import type {ChartReqTemplateDto} from "@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto.ts";
import {DataSourcePanel} from "@charts/ui/DataSourcePanel/DataSourcePanel.tsx";
import React from "react";
import {applyTemplateNoThunk} from "@charts/store/chartsMeta.commands.ts";
import ChartTemplatesPanel from "@charts/ui/ChartTemplatesPanel/ChartTemplatesPanel.tsx";




export default function ChartsPage() {

    const [busy, setBusy] = React.useState(false);
    const handlePick = async (tpl: ChartReqTemplateDto) => {
        if (busy) return;
        setBusy(true);
        try {
            // Если сигнатуры совпадают — передаём tpl как есть.
            // Если у тебя EditChartReqTemplate отличается — см. функцию toEdit ниже.
            await applyTemplateNoThunk(tpl);
            // здесь tpl.database будет дозагружена внутри инициатора
        } catch (e: any) {
            console.error(e);
            alert(e?.message ?? 'Не удалось применить шаблон');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12 }}>
            <ChartTemplatesPanel  onPick={handlePick}  />

           {<DataSourcePanel />}
        </div>
    )
}
