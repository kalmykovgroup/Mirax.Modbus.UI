// src/pages/ChartsBreaksPage.tsx


import {DataSourcePanel} from "@charts/ui/DataSourcePanel/DataSourcePanel.tsx";
import ChartTemplatesPanel from "@charts/ui/ChartTemplatesPanel/ChartTemplatesPanel.tsx";
import {useAppDispatch, useAppSelector} from "@/store/hooks.ts";
import CollapsibleSection from "@charts/ui/Collapse/CollapsibleSection.tsx";
import styles from "./ChartsPage.module.css"
import {useCallback} from "react";
import TimeZonePicker from "@charts/ui/TimeZonePicker/TimeZonePicker.tsx";
import {selectTimeSettings, setTimeSettings, type TimeSettings} from "@charts/charts/core/store/chartsSettingsSlice.ts";
import {setResolvedCharReqTemplate} from "@charts/charts/core/store/chartsSlice.ts";
import {ChartContainer} from "@charts/charts/ui/ChartContainer.tsx";
import type {ResolvedCharReqTemplate} from "@charts/template/shared/dtos/ResolvedCharReqTemplate.ts";
import {RequestManagerProvider} from "@charts/charts/orchestration/requests/RequestManagerProvider.tsx";
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
