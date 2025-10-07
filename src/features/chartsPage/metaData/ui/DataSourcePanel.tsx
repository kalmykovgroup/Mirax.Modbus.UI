

import {useSelector} from "react-redux";

import {useAppDispatch} from "@/store/hooks.ts";

import styles from "./DataSourcePanel.module.css"
import {
    type NewChartReqTemplate,
    selectActiveTemplate,
    setActiveTemplateFrom,
    setActiveTemplateTo
} from "@chartsPage/template/store/chartsTemplatesSlice.ts";
import {DatabaseSection} from "@chartsPage/metaData/ui/DatabaseSection/DatabaseSection.tsx";
import {EntitySection} from "@chartsPage/metaData/ui/EntitySection/EntitySection.tsx";
import {TimeFieldSection} from "@chartsPage/metaData/ui/TimeFieldSection/TimeFieldSection.tsx";
import FromToFields from "@chartsPage/metaData/ui/FromToFields/FromToFields.tsx";
import {FieldsSection} from "@chartsPage/metaData/ui/FieldsSection/FieldsSection.tsx";
import {FiltersAndSqlPanel} from "@chartsPage/metaData/ui/SqlAndFiltersSection/FiltersAndSqlPanel.tsx";
import {TemplateMetaSection} from "@chartsPage/metaData/ui/TemplateMetaSection/TemplateMetaSection.tsx";
import {FooterActions} from "@chartsPage/metaData/ui/FooterActions/FooterActions.tsx";
import type {ChartReqTemplateDto} from "@chartsPage/template/shared/dtos/ChartReqTemplateDto.ts";
import type {TimeRangeBounds} from "@chartsPage/charts/core/store/types/chart.types.ts";

export function DataSourcePanel({className}: {className? : string | undefined}) {
    const dispatch = useAppDispatch();

    const selectTemp: ChartReqTemplateDto | NewChartReqTemplate = useSelector(selectActiveTemplate);

    return (
        <div className={`${className} ${styles.container}`} >
            <div style={{ fontWeight: 600 }}>Источник данных</div>

            <DatabaseSection />

            <EntitySection />

            <TimeFieldSection />

            <FromToFields
                range={{fromMs: selectTemp.fromMs, toMs: selectTemp.toMs}}
                onChange={(date: Partial<TimeRangeBounds>) => {
                    if ('fromMs' in date) dispatch(setActiveTemplateFrom(date.fromMs));
                    if ('toMs'   in date) dispatch(setActiveTemplateTo(date.toMs));
                }}
            />
            <FieldsSection />

            <FiltersAndSqlPanel />

            <TemplateMetaSection />

            <FooterActions />

        </div>
    )
}
