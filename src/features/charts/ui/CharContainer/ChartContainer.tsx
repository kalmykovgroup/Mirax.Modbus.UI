import React from "react";
import type {ResolvedCharReqTemplate} from "@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";
import styles from "./ChartContainer.module.css"
import {useSelector} from "react-redux";
import {useTheme} from "@app/providers/theme/useTheme.ts";
import {selectResolvedTemplate} from "@charts/store/selectors.ts";
import classNames from "classnames";
import {ChartCollection} from "@charts/ui/CharContainer/ChartCollection/ChartCollection.tsx";

interface ChartContainerProps {
    className? : string | undefined;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({className}) => {

    const template: ResolvedCharReqTemplate | undefined = useSelector(selectResolvedTemplate);

    const { theme } = useTheme();

    // Проверки на наличие данных
    if (!template) {
        return (
            <div className={classNames(styles.chartContainerComponent, className)} data-theme={theme}>
                <div className={styles.emptyState}>
                    <span>Нет активного шаблона</span>
                </div>
            </div>
        );
    }

    if (!template.selectedFields || template.selectedFields.length === 0) {
        return (
            <div className={classNames(styles.chartContainerComponent, className)}  data-theme={theme}>
                <div className={styles.emptyState}>
                    <span>Не выбраны поля для отображения</span>
                </div>
            </div>
        );
    }

    return (
        <div className={classNames(styles.chartContainerComponent, className)}  data-theme={theme}>
             <ChartCollection template={template}/>
        </div>
    );


}