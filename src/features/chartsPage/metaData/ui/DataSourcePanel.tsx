

import {useSelector} from "react-redux";

import {useAppDispatch} from "@/store/hooks.ts";

import styles from "./DataSourcePanel.module.css"
import {
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
