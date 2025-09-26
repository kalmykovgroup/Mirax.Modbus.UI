// src/components/ChartCollection/ChartItem/ChartItem.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption, SeriesOption } from 'echarts';
import { useSelector } from 'react-redux';

import type { FieldDto } from '@charts/shared/contracts/metadata/Dtos/FieldDto.ts';
import { type TimeRange } from '@charts/store/chartsSlice.ts';
import type { SeriesBinDto } from '@charts/shared/contracts/chart/Dtos/SeriesBinDto.ts';

import styles from './ChartItem.module.css';
import { getPreset, type StylePreset } from '@charts/ui/CharContainer/ChartCollection/ChartItem/lib/theme.ts';

import {
    buildBaseOption,
    buildSeriesFromBins,
} from '@charts/ui/CharContainer/ChartCollection/ChartItem/lib/seriesBuilders.ts';
import { buildTooltipFormatter } from '@charts/ui/CharContainer/ChartCollection/ChartItem/ChartTooltip/Tooltip.tsx';
import {
    formatMsForUI,
    prepareBinnedSeriesData,
    type TimeSettings,
} from '@charts/ui/CharContainer/ChartCollection/ChartItem/lib/dataAdapters.ts';
import { RangeChangeAction } from '@charts/ui/CharContainer/types/RangeChangeAction.ts';
import type { ExtendedRangeChangeMeta } from '@charts/ui/CharContainer/types/RangeChangeMeta.ts';
import { selectBins, selectFieldUi, selectFieldView } from '@charts/store/selectors.ts';

const DEFAULT_HEIGHT = 300;

// ---------- helpers ----------

/** Прочитать текущее окно строго из dataZoom (startValue/endValue) */
function getCurrentWindow(inst: ECharts): { fromMs: number; toMs: number } | null {
    try {
        const opt = inst.getOption() as any;
        const dzs: any[] = Array.isArray(opt?.dataZoom) ? opt.dataZoom : [];
        const dz = dzs.find((z) => z?.type === 'slider') ?? dzs.find((z) => z?.type === 'inside') ?? dzs[0];
        if (!dz) return null;
        if (Number.isFinite(dz?.startValue) && Number.isFinite(dz?.endValue)) {
            const a = dz.startValue as number;
            const b = dz.endValue as number;
            return a <= b ? { fromMs: a, toMs: b } : { fromMs: b, toMs: a };
        }
    } catch { /* ignore */ }
    return null;
}

/** Инициализационное окно: dataZoom → view.range → домен данных */
function calcInitWindow(
    inst: ECharts | null,
    viewMinMs?: number,
    viewMaxMs?: number,
    binsPrepared?: { avg?: Array<{ value: [number, number | null] }> }
): { fromMs: number; toMs: number } | null {
    if (inst) {
        const dz = getCurrentWindow(inst);
        if (dz) return dz;
    }
    if (Number.isFinite(viewMinMs!) && Number.isFinite(viewMaxMs!) && (viewMinMs! < viewMaxMs!)) {
        return { fromMs: viewMinMs!, toMs: viewMaxMs! };
    }
    // fallback по данным
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    const scan = (arr?: Array<{ value: [number, number | null] }>) => {
        if (!arr) return;
        for (const p of arr) {
            const t = p.value?.[0];
            if (Number.isFinite(t)) {
                if (t! < min) min = t!;
                if (t! > max) max = t!;
            }
        }
    };
    scan(binsPrepared?.avg);
    return (Number.isFinite(min) && Number.isFinite(max) && min < max) ? { fromMs: min, toMs: max } : null;
}

// ---------- component ----------

const ChartItem: React.FC<{
    field: FieldDto,
    height?: number | undefined,
    styleId?: string | undefined,
    timeSettings: TimeSettings,
    onZoomIn?: (range: TimeRange, meta: ExtendedRangeChangeMeta) => void,
    onZoomOut?: (range: TimeRange, meta: ExtendedRangeChangeMeta) => void,
    onPanLeft?: (range: TimeRange, meta: ExtendedRangeChangeMeta) => void,
    onPanRight?: (range: TimeRange, meta: ExtendedRangeChangeMeta) => void,
}> = ({
          field,
          height = DEFAULT_HEIGHT,
          styleId,
          timeSettings,
          onZoomIn,
          onZoomOut,
          onPanLeft,
          onPanRight
      }) => {
    const elRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ECharts | null>(null);

    // предыдущее окно для классификации действий
    const prevWindowRef = useRef<{ from: number; to: number } | null>(null);

    const fieldName = field.name;
    const preset: StylePreset = useMemo(() => getPreset(styleId), [styleId]);

    const selectUi = useMemo(() => selectFieldUi(fieldName), [fieldName]);
    const selectBinsSel = useMemo(() => selectBins(fieldName), [fieldName]);
    const selectViewSel = useMemo(() => selectFieldView(fieldName), [fieldName]);

    const ui = useSelector(selectUi);
    const bins = useSelector(selectBinsSel) as SeriesBinDto[];
    const view = useSelector(selectViewSel);

    const binsPrepared = useMemo(() => prepareBinnedSeriesData(bins ?? []), [bins]);

    // эталонный диапазон из стора
    const viewMinMs = view?.domain?.from ? view.domain.from.getTime() : undefined;
    const viewMaxMs = view?.domain?.to ? view.domain.to.getTime() : undefined;

    // init: eCharts + dataZoom/resize listeners
    useEffect(() => {
        if (!elRef.current || chartRef.current) return;

        const inst = echarts.init(elRef.current, undefined, { useDirtyRect: true });
        chartRef.current = inst;

        // Плавный нативный pan/zoom. Мы лишь читаем точное окно и сообщаем наружу.
        const onDataZoom = () => {
            if (!chartRef.current) return;

            const win = getCurrentWindow(inst);
            if (!win) return;

            const fromMs = win.fromMs;
            const toMs = win.toMs;
            const span = Math.max(1, toMs - fromMs);
            const center = fromMs + span / 2;

            const prev = prevWindowRef.current;
            const prevSpan = prev ? (prev.to - prev.from) : undefined;
            const prevCenter = prev ? (prev.from + (prev.to - prev.from) / 2) : undefined;

            // Классификация: строго по миллисекундам
            let action: RangeChangeAction | null = null;
            if (typeof prevSpan === 'number' && prevSpan !== span) {
                action = (span < prevSpan) ? RangeChangeAction.ZoomIn : RangeChangeAction.ZoomOut;
            } else if (typeof prevCenter === 'number' && prevCenter !== center) {
                action = center < prevCenter ? RangeChangeAction.PanLeft : RangeChangeAction.PanRight;
            } else {
                // нет изменения — игнор
                return;
            }

            const range: TimeRange = { from: new Date(fromMs), to: new Date(toMs) };
            const meta: ExtendedRangeChangeMeta = {
                action,
                fromMs,
                toMs,
                px: view.px,
                field: fieldName,
                // Уровень не считаем здесь — это будет делать ChartCollection по span/px
                zoomLevel: view.zoom.level,
            };

            if (action === RangeChangeAction.ZoomIn) onZoomIn?.(range, meta);
            else if (action === RangeChangeAction.ZoomOut) onZoomOut?.(range, meta);
            else if (action === RangeChangeAction.PanLeft) onPanLeft?.(range, meta);
            else if (action === RangeChangeAction.PanRight) onPanRight?.(range, meta);

            prevWindowRef.current = { from: fromMs, to: toMs };
        };

        inst.on('dataZoom', onDataZoom);
        inst.on('datazoom', onDataZoom);

        const ro = new ResizeObserver(() => inst.resize());
        ro.observe(elRef.current);

        return () => {
            inst.off('dataZoom', onDataZoom);
            inst.off('datazoom', onDataZoom);
            try { inst.dispatchAction({ type: 'hideTip' }); } catch {}
            ro.disconnect();
            inst.dispose();
            chartRef.current = null;
            prevWindowRef.current = null;
        };
    }, [fieldName, onZoomIn, onZoomOut, onPanLeft, onPanRight, view.px]);

    const timeFmt = React.useCallback((ms: number) => formatMsForUI(ms, timeSettings), [timeSettings]);
    const tooltipFormatter = React.useMemo(() => buildTooltipFormatter(timeFmt), [timeFmt]);

    // apply options при смене данных/стиля/настроек времени/диапазона
    useEffect(() => {
        if (!chartRef.current) return;

        const hasBins = (binsPrepared?.avg?.length ?? 0) > 0;

        let series: SeriesOption[] = [];
        if (hasBins) series = buildSeriesFromBins(fieldName, binsPrepared, preset);

        const base = buildBaseOption(fieldName, preset, /* hasCountAxis */ false);

        // Диапазон оси X: эталон из стора (не обрезать крайние пустоты)
        const xAxisDomain =
            (Number.isFinite(viewMinMs!) && Number.isFinite(viewMaxMs!) && (viewMinMs! < viewMaxMs!))
                ? { minMs: viewMinMs as number, maxMs: viewMaxMs as number }
                : undefined;

        const xAxis: any = {
            ...(base as any).xAxis,
            type: 'time',
            ...(xAxisDomain ? { min: xAxisDomain.minMs, max: xAxisDomain.maxMs } : {}),
            axisLabel: {
                ...(base as any)?.xAxis?.axisLabel,
                formatter: (value: number) => formatMsForUI(value, timeSettings),
                hideOverlap: true,
            },
            axisPointer: {
                ...(base as any)?.xAxis?.axisPointer,
                animation: false,
                label: {
                    ...(base as any)?.xAxis?.axisPointer?.label,
                    formatter: (params: { value: number }) => formatMsForUI(params.value, timeSettings),
                },
            },
        };

        // Нативный inside-zoom/pan (плавный). Мы только читаем окно в onDataZoom.
        const dzBase = (base as any)?.dataZoom ?? [];
        const dataZoom = Array.isArray(dzBase)
            ? dzBase.map((z: any) => {
                if (z?.type === 'slider') {
                    return {
                        ...z,
                        labelFormatter: (value: unknown) => {
                            const ms = typeof value === 'number' ? value : Number(value);
                            return Number.isFinite(ms) ? formatMsForUI(ms as number, timeSettings) : String(value ?? '');
                        },
                        realtime: true,
                        throttle: 16, // ~60 FPS
                    };
                }
                if (z?.type === 'inside') {
                    return {
                        ...z,
                        zoomOnMouseWheel: true,   // колесо — zoom
                        moveOnMouseWheel: false,  // колесом пан не делаем (по желанию)
                        moveOnMouseMove: true,    // drag — pan
                        preventDefaultMouseWheel: true,
                        realtime: true,
                        throttle: 16,             // ~60 FPS
                        zoomLock: false,
                    };
                }
                return z;
            })
            : dzBase;

        const option: EChartsOption = {
            ...base,
            useUTC: true,
            animation: false,
            animationDurationUpdate: 0,
            xAxis,
            tooltip: {
                ...base.tooltip,
                transitionDuration: 0,
                enterable: false,
                confine: true,
                formatter: tooltipFormatter,
            },
            dataZoom,
            series: series.map(s => ({
                ...s,
                progressive: 4000,
                progressiveThreshold: 20000,
                animation: false,
                universalTransition: false,
            })),
        };

        try { chartRef.current.dispatchAction({ type: 'hideTip' }); } catch {}
        chartRef.current.setOption(option, true);

        // Инициализация prev окна (один раз)
        if (!prevWindowRef.current) {
            const init = calcInitWindow(chartRef.current, viewMinMs, viewMaxMs, binsPrepared);
            if (init) prevWindowRef.current = { from: init.fromMs, to: init.toMs };
        }
    }, [fieldName, binsPrepared, preset, timeSettings, viewMinMs, viewMaxMs]);

    return (
        <div className={styles.container}>
            {ui.loading && <div className={styles.status}>Loading…</div>}
            {ui.error && <div className={styles.statusError}>Error: {ui.error}</div>}
            <div ref={elRef} className={styles.chart} style={{ height: `${height}px` }} />
        </div>
    );
};

export default ChartItem;
