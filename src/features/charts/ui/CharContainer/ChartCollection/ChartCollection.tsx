import React, { useEffect, useState } from 'react';
import debounce from 'lodash/debounce';
import {
    ensureFieldView,
    fetchMultiSeriesSimple,
    type TimeRange,
} from '@charts/store/chartsSlice.ts';
import type { GetMultiSeriesRequest } from '@charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest.ts';
import type { ResolvedCharReqTemplate } from '@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts';
import ChartItem from '@charts/ui/CharContainer/ChartItem/ChartItem.tsx';
import { useAppDispatch } from '@/store/hooks.ts';
import CollapsibleSection from '@charts/ui/Collapse/CollapsibleSection.tsx';
import ChartHeader from "@charts/ui/CharContainer/ChartItem/ChartHeader/ChartHeader.tsx";
import {DEFAULT_PRESET, STYLE_PRESETS} from "@charts/ui/CharContainer/ChartItem/lib/theme.ts";
import SelectStylePicker from "@charts/ui/CharContainer/ChartItem/SelectStylePicker/SelectStylePicker.tsx";
import styles from "./ChartCollection.module.css"
interface ChartPanelProps {
    resolvedCharReqTemplate: ResolvedCharReqTemplate;
}

const ChartCollection: React.FC<ChartPanelProps> = ({ resolvedCharReqTemplate }) => {
    const dispatch = useAppDispatch();
    const [width, setWidth] = useState<number>(1200);
    const [styleId, setStyleId] = useState<string>(DEFAULT_PRESET.name);
    useEffect(() => {
        const compute = () => Math.max(640, Math.round(window.innerWidth * 0.9));
        setWidth(compute());
        const onResize = debounce(() => setWidth(compute()), 300);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        const initialRange: TimeRange = {
            from: resolvedCharReqTemplate.from,
            to: resolvedCharReqTemplate.to,
        };

        const request: GetMultiSeriesRequest = {
            template: {
                id: resolvedCharReqTemplate.id,
                databaseId: resolvedCharReqTemplate.databaseId,
                from: resolvedCharReqTemplate.from,
                to: resolvedCharReqTemplate.to,
                entity: resolvedCharReqTemplate.entity,
                timeField: resolvedCharReqTemplate.timeField,
                selectedFields: resolvedCharReqTemplate.selectedFields,
                where: resolvedCharReqTemplate.where,
                params: resolvedCharReqTemplate.params,
                sql: resolvedCharReqTemplate.sql,
            } as ResolvedCharReqTemplate,
            from: initialRange.from,
            to: initialRange.to,
            px: Math.round(width),
        };
        dispatch(fetchMultiSeriesSimple(request));

        resolvedCharReqTemplate.selectedFields.forEach((f) =>
            dispatch(
                ensureFieldView({
                    field: f.name,
                    px: Math.round(width),
                    range: initialRange,
                })
            )
        );
    }, [dispatch, resolvedCharReqTemplate, width]);


    return (
        <div className={styles.container}>

            <SelectStylePicker
                value={styleId}
                onChange={setStyleId}
                options={STYLE_PRESETS}
                label="Стиль графика"
                className={styles.selectStylePicker}
            />

            {resolvedCharReqTemplate.selectedFields.map((field) => (


                <CollapsibleSection
                    key={field.name}
                    label={field.name}
                    defaultState={true}
                >
                    {/* Новый header-компонент над каждым графиком */}
                    <ChartHeader field={field} />
                    <ChartItem  field={field} height={600} styleId={styleId} />
                </CollapsibleSection>
            ))}
        </div>
    );
};

export default ChartCollection;
