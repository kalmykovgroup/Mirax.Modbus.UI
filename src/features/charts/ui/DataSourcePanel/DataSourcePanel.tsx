

import {DatabaseSection} from "@charts/ui/DataSourcePanel/DatabaseSection/DatabaseSection.tsx";
import {EntitySection} from "@charts/ui/DataSourcePanel/EntitySection/EntitySection.tsx";
import {TimeFieldSection} from "@charts/ui/DataSourcePanel/TimeFieldSection/TimeFieldSection.tsx";
import {FieldsSection} from "@charts/ui/DataSourcePanel/FieldsSection/FieldsSection.tsx";
import {TemplateMetaSection} from "@charts/ui/DataSourcePanel/TemplateMetaSection/TemplateMetaSection.tsx";
import {FooterActions} from "@charts/ui/DataSourcePanel/FooterActions/FooterActions.tsx";
import {FiltersAndSqlPanel} from "@charts/ui/DataSourcePanel/SqlAndFiltersSection/FiltersAndSqlPanel.tsx";
import {FromToFields} from "@charts/ui/DataSourcePanel/FromToFields/FromToFields.tsx";
import {useSelector} from "react-redux";

import {useAppDispatch} from "@/store/hooks.ts";

import styles from "./DataSourcePanel.module.css"
import {
    selectActiveTemplate,
    setActiveTemplateFrom,
    setActiveTemplateTo
} from "@charts/template/store/chartsTemplatesSlice.ts";

export function DataSourcePanel({className}: {className? : string | undefined}) {
    const dispatch = useAppDispatch();

    const selectTemp = useSelector(selectActiveTemplate);

    return (
        <div className={`${className} ${styles.container}`} >
            <div style={{ fontWeight: 600 }}>Источник данных</div>

            <DatabaseSection />

            <EntitySection />

            <TimeFieldSection />

            <FromToFields
                range={{from: selectTemp.from, to: selectTemp.to}}
                onChange={(date) => {
                    if ('from' in date) dispatch(setActiveTemplateFrom(date.from));
                    if ('to'   in date) dispatch(setActiveTemplateTo(date.to));
                }}
            />
            <FieldsSection />

            <FiltersAndSqlPanel />

            <TemplateMetaSection />

            <FooterActions />

        </div>
    )
}
