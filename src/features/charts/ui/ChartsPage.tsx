// src/pages/ChartsBreaksPage.tsx


import {DataSourcePanel} from "@charts/ui/DataSourcePanel/DataSourcePanel.tsx";
import ChartTemplatesPanel from "@charts/ui/ChartTemplatesPanel/ChartTemplatesPanel.tsx";
import {useAppDispatch, useAppSelector} from "@/store/hooks.ts";
import {  setResolvedCharReqTemplate} from "@charts/store/chartsSlice.ts";
import type {ResolvedCharReqTemplate} from "@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";
import CollapsibleSection from "@charts/ui/Collapse/CollapsibleSection.tsx";
import styles from "./ChartsPage.module.css"
import {ChartContainer} from "@charts/ui/CharContainer/ChartContainer.tsx";
import {useCallback} from "react";
import {selectTimeSettings, setTimeSettings, type TimeSettings} from "@charts/store/chartsSettingsSlice.ts";
import TimeZonePicker from "@charts/ui/TimeZonePicker/TimeZonePicker.tsx";
export default function ChartsPage() {
    const dispatch = useAppDispatch();
    // Получаем настройки временной зоны из Redux store
    const timeSettings = useAppSelector(selectTimeSettings);

    // Обработчик изменения настроек временной зоны
    const handleTimeSettingsChange = useCallback((newSettings: TimeSettings) => {
        dispatch(setTimeSettings(newSettings));
    }, [dispatch]);

    const onExecuteDone = (completed: ResolvedCharReqTemplate) =>{
         dispatch(setResolvedCharReqTemplate(completed))
    }


    return (
        <div className={styles.container}>

            <TimeZonePicker
                value={timeSettings}
                onChange={handleTimeSettingsChange}
                className={styles.timezonePicker}
                label="Использовать временную зону"
            />

            <ChartTemplatesPanel className={styles.chartTemplatesPanel} onExecuteDone={onExecuteDone}  />

            <CollapsibleSection className={styles.settingsBlock}>
            <DataSourcePanel className={styles.dataSourcePanel}/>
            </CollapsibleSection>

           {<ChartContainer className={styles.chartPanel}/>}

        </div>
    )
}
