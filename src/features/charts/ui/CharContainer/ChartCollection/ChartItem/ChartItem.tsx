// src/components/ChartCollection/ChartItem/ChartItem.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption, SeriesOption } from 'echarts';
import { useSelector } from 'react-redux';

import type { FieldDto } from '@charts/shared/contracts/metadata/Dtos/FieldDto.ts';
import { selectBins, selectFieldUi, selectRawPoints, type TimeRange } from '@charts/store/chartsSlice.ts';
import type { RawPointDto } from '@charts/shared/contracts/chart/Dtos/RawPointDto.ts';
import type { SeriesBinDto } from '@charts/shared/contracts/chart/Dtos/SeriesBinDto.ts';

import styles from './ChartItem.module.css';
import {getPreset, type StylePreset} from "@charts/ui/CharContainer/ChartItem/lib/theme.ts";
import {prepareBinnedSeriesData, prepareRawSeriesData} from "@charts/ui/CharContainer/ChartItem/lib/dataAdapters.ts";
import {
    buildBaseOption,
    buildSeriesFromBins,
    buildSeriesFromRaw
} from "@charts/ui/CharContainer/ChartItem/lib/seriesBuilders.ts";
import {buildTooltipFormatter} from "@charts/ui/CharContainer/ChartItem/ChartTooltip/Tooltip.tsx";

type Props = {
    field: FieldDto;
    height?: number;
    styleId?: string; // ← переключение пресета
};

const DEFAULT_HEIGHT = 300;

const ChartItem: React.FC<Props> = ({ field, height = DEFAULT_HEIGHT, styleId }) => {
    const elRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ECharts | null>(null);

    const fieldName = field.name;
    const preset: StylePreset = useMemo(() => getPreset(styleId), [styleId]);

    const selectUi = useMemo(() => selectFieldUi(fieldName), [fieldName]);
    const selectRaw = useMemo(() => selectRawPoints(fieldName), [fieldName]);
    const selectBinsSel = useMemo(() => selectBins(fieldName), [fieldName]);

    const ui = useSelector(selectUi);
    const raw: RawPointDto[] = useSelector(selectRaw);
    const bins: SeriesBinDto[] = useSelector(selectBinsSel);

    const rawPrepared = useMemo(() => prepareRawSeriesData(raw ?? []), [raw]);
    const binsPrepared = useMemo(() => prepareBinnedSeriesData(bins ?? []), [bins]);

    // init
    useEffect(() => {
        if (!elRef.current || chartRef.current) return;
        chartRef.current = echarts.init(elRef.current, undefined, { useDirtyRect: true });

        // простое логирование zoom
        const onZoom = (ev: any) => {
            const payload = Array.isArray(ev?.batch) ? ev.batch[0] : ev;
            const startValue = payload?.startValue ?? payload?.start;
            const endValue = payload?.endValue ?? payload?.end;
            if (startValue != null && endValue != null) {
                const range: TimeRange = { from: new Date(startValue), to: new Date(endValue) };
                // eslint-disable-next-line no-console
                console.log('[Chart zoom]', fieldName, range);
            }
        };
        chartRef.current.on('datazoom', onZoom);

        const ro = new ResizeObserver(() => chartRef.current?.resize());
        ro.observe(elRef.current);

        return () => {
            chartRef.current?.off('datazoom', onZoom);
            ro.disconnect();
            chartRef.current?.dispose();
            chartRef.current = null;
        };
    }, [fieldName]);

    // apply options on data/style change
    useEffect(() => {
        if (!chartRef.current) return;

        const hasRaw = (rawPrepared?.length ?? 0) > 0;
        const hasBins = (binsPrepared?.avg?.length ?? 0) > 0;

        let series: SeriesOption[] = [];
        let hasCountAxis = false;

        if (hasRaw) {
            series = buildSeriesFromRaw(fieldName, rawPrepared, preset);
        } else if (hasBins) {
            series = buildSeriesFromBins(fieldName, binsPrepared, preset);
            // hasCountAxis = ... // включишь при необходимости
        }

        const option: EChartsOption = {
            ...buildBaseOption(fieldName, preset, hasCountAxis),
            tooltip: { ...buildBaseOption(fieldName, preset, hasCountAxis).tooltip, formatter: buildTooltipFormatter() },
            series,
        };

        chartRef.current.setOption(option, true);
    }, [fieldName, rawPrepared, binsPrepared, preset]);

    return (
        <div className={styles.container}>
            {ui.loading && <div className={styles.status}>Loading…</div>}
            {ui.error && <div className={styles.statusError}>Error: {ui.error}</div>}
            <div ref={elRef} className={styles.chart} style={{ height: `${height}px` }} />
        </div>
    );
};

export default ChartItem;
