// src/pages/ChartsBreaksPage.tsx


import styles from "./ChartsPage.module.css"
import {useCallback} from "react";
import {selectTimeSettings, setTimeSettings, type TimeSettings} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import {setResolvedCharReqTemplate} from "@chartsPage/charts/core/store/chartsSlice.ts";
import type {ResolvedCharReqTemplate} from "@chartsPage/template/shared//dtos/ResolvedCharReqTemplate.ts";
import {RequestManagerProvider} from "@chartsPage/charts/orchestration/requests/RequestManagerProvider.tsx";
import {ChartContainer} from "@chartsPage/charts/ui/ChartContainer/ChartContainer.tsx";
import TimeZonePicker from "@chartsPage/charts/ui/TimeZonePicker/TimeZonePicker.tsx";
import {useAppDispatch, useAppSelector} from "@/store/hooks.ts";
import ChartTemplatesPanel from "@chartsPage/template/ui/ChartTemplatesPanel.tsx";
import CollapsibleSection from "@chartsPage/components/Collapse/CollapsibleSection.tsx";
import {DataSourcePanel} from "@chartsPage/metaData/ui/DataSourcePanel.tsx";

export default function ChartsPage() {
    const dispatch = useAppDispatch();
    // Получаем настройки временной зоны из Redux store
    const timeSettings = useAppSelector(selectTimeSettings);

    // Обработчик изменения настроек временной зоны
    const handleTimeSettingsChange = useCallback((newSettings: TimeSettings) => {
        dispatch(setTimeSettings(newSettings));
    }, [dispatch]);

    const onExecuteDone = (completed: ResolvedCharReqTemplate) =>{
         dispatch(setResolvedCharReqTemplate({template: completed}))
    }


    return (
        <div className={styles.charPageContainer}>

            <TimeZonePicker
                value={timeSettings}
                onChange={handleTimeSettingsChange}
                label="Использовать временную зону"
            />

            <ChartTemplatesPanel onExecuteDone={onExecuteDone}  />

            <CollapsibleSection>
                  <DataSourcePanel />
            </CollapsibleSection>

            <RequestManagerProvider>
                <ChartContainer />
            </RequestManagerProvider>

        </div>
    )
}
