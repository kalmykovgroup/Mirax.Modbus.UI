// src/components/ChartItem.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import debounce from 'lodash/debounce';
import type { FieldDto } from '@charts/shared/contracts/metadata/Dtos/FieldDto.ts';
import {
    fetchMultiSeriesSimple,
    fetchRawSimple,
    selectBins,
    selectFieldUi,
    selectFieldView,
    selectRawPoints,
    setFieldRange,
    type TimeRange, toggleField
} from '@charts/store/chartsSlice.ts'; // Адаптируйте path
import type { GetMultiSeriesRequest } from '@charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest.ts';
import type {ResolvedCharReqTemplate} from "@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";
import type { RawPointDto } from '@charts/shared/contracts/chart/Dtos/RawPointDto.ts';
import type { SeriesBinDto } from '@charts/shared/contracts/chart/Dtos/SeriesBinDto.ts';
import {useAppDispatch} from "@/store/hooks.ts";

interface ChartItemProps {
    template: ResolvedCharReqTemplate;
    field: FieldDto;
    width: number;
    syncZoom: boolean;
    sharedRange: TimeRange;
    onRangeChange: (newRange: TimeRange) => void;
}

const ChartItem: React.FC<ChartItemProps> = ({
                                                 template,
                                                 field,
                                                 width,
                                                 syncZoom,
                                                 sharedRange,
                                                 onRangeChange
                                             }) => {
    const dispatch = useAppDispatch();
    const chartRef = useRef<HTMLDivElement>(null);
    const echartsInstance = useRef<ECharts | null>(null);

    const fieldName = field.name;

    // Memoize selector factories to prevent new selector creation on every render
    const selectView = useMemo(() => selectFieldView(fieldName), [fieldName]);
    const selectUi = useMemo(() => selectFieldUi(fieldName), [fieldName]);
    const selectRaw = useMemo(() => selectRawPoints(fieldName), [fieldName]);
    const selectBinsSel = useMemo(() => selectBins(fieldName), [fieldName]);

    // View и UI для этого поля
    const view = useSelector(selectView);
    const ui = useSelector(selectUi);

    // Данные для серии (prefer raw, если есть)
    const raw: RawPointDto[] = useSelector(selectRaw);
    const bins: SeriesBinDto[] = useSelector(selectBinsSel);

    // Данные для серии (prefer raw, если есть)
    const series = useMemo(() => {
        const data = raw.length > 0
            ? raw.map(p => [p.time.getTime(), p.value ?? null] as [number, number | null])
            : bins.map(b => [new Date(b.t).getTime(), b.avg ?? null] as [number, number | null]);
        return [{
            name: field.name,
            type: 'line' as const,
            data,
        }];
    }, [raw, bins, field.name]); // Deps на данные и field.name

    // Init ECharts и events — deps только на стабильные значения
    useEffect(() => {
        if (chartRef.current && !echartsInstance.current) {
            echartsInstance.current = echarts.init(chartRef.current);

            // Zoom event: Обработка datazoom для refetch
            const debouncedZoomHandler = debounce((params: any) => {
                const { startValue, endValue } = params.batch?.[0] || {};
                if (startValue != null && endValue != null) {
                    const newRange: TimeRange = {
                        from: new Date(startValue),
                        to: new Date(endValue)
                    };

                    // Обновление range
                    if (syncZoom) {
                        onRangeChange(newRange);
                    } else {
                        dispatch(setFieldRange({ field: field.name, range: newRange }));
                    }

                    const diffMs = endValue - startValue;
                    if (diffMs < 86400000) { // 24h threshold — raw (single для этого поля)
                        dispatch(fetchRawSimple({
                            template: template,
                            field,
                            from: newRange.from,
                            to: newRange.to,
                            maxPoints: 5000,
                        }));
                    } else { // binned — multi для всех
                        const request: GetMultiSeriesRequest = {
                            template: template,
                            from: newRange.from,
                            to: newRange.to,
                            px: width,
                        };
                        dispatch(fetchMultiSeriesSimple(request));
                    }
                }
            }, 500);

            echartsInstance.current.on('datazoom', debouncedZoomHandler);


            debouncedZoomHandler.cancel();

            if (echartsInstance.current) {
                echartsInstance.current.off('datazoom', debouncedZoomHandler);
                echartsInstance.current.dispose();
                echartsInstance.current = null;
            }
        }
    }, [dispatch, fieldName, template, width, syncZoom, onRangeChange]); // Стабильные deps: id для template, name для field

    // Update chart option on series/width change
    useEffect(() => {
        if (echartsInstance.current) {
            const option = {
                title: { text: field.name },
                tooltip: { trigger: 'axis' as const },
                xAxis: { type: 'time' as const },
                yAxis: { type: 'value' as const },
                dataZoom: [{ type: 'inside' as const }, { type: 'slider' as const }],
                series,
            };
            echartsInstance.current.setOption(option, true);
        }
    }, [series, field.name, width]);

    // Sync sharedRange if syncZoom (update dataZoom min/max)
    useEffect(() => {
        if (syncZoom && echartsInstance.current && sharedRange.from && sharedRange.to) {
            echartsInstance.current.setOption({
                dataZoom: [{
                    min: sharedRange.from.getTime(),
                    max: sharedRange.to.getTime(),
                }],
            }, { replaceMerge: ['dataZoom'] });
        }
    }, [syncZoom, sharedRange, field.name]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (echartsInstance.current) {
                echartsInstance.current.dispose();
                echartsInstance.current = null;
            }
        };
    }, []);

    if (!view.visible) {
        return null;
    }

    return (
        <div style={{ marginBottom: '20px' }}>
            <button onClick={() => dispatch(toggleField(field.name))}>
                {field.name}: {view.visible ? 'Visible' : 'Hidden'}
                {ui.loading ? ' Loading...' : ui.error ? ` Error: ${ui.error}` : ''}
            </button>
            <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
        </div>
    );
};

export default ChartItem;