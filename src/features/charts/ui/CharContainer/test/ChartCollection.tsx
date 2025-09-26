/*
// src/components/ChartCollection/ChartCollection.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import debounce from 'lodash/debounce';

import type { GetMultiSeriesRequest } from '@charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest.ts';
import type { ResolvedCharReqTemplate } from '@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts';

import ChartHeader from '@charts/ui/CharContainer/ChartCollection/ChartItem/ChartHeader/ChartHeader.tsx';
import CollapsibleSection from '@charts/ui/Collapse/CollapsibleSection.tsx';
import SelectStylePicker from '@charts/ui/CharContainer/ChartCollection/ChartItem/SelectStylePicker/SelectStylePicker.tsx';
import { DEFAULT_PRESET, STYLE_PRESETS } from '@charts/ui/CharContainer/ChartCollection/ChartItem/lib/theme.ts';

import { useAppDispatch, useAppSelector } from '@/store/hooks.ts';
import styles from './ChartCollection.module.css';
import {
    type TimeSettings,
    toMs as toMsUtc,
} from '@charts/ui/CharContainer/ChartCollection/ChartItem/lib/dataAdapters.ts';
import ChartItem from '@charts/ui/CharContainer/ChartCollection/ChartItem/ChartItem.tsx';
import type { ExtendedRangeChangeMeta } from '@charts/ui/CharContainer/ChartCollection/ChartItem/types/RangeChangeMeta.ts';

import {
    ensureFieldView,
    setFieldRange,
    setResolvedCharReqTemplate,
    setLevelAbsolute,
    type TimeRange,
    BUCKETS_MS, // fallback
    nearestBucketIdx, // fallback
} from '@charts/store/chartsSlice.ts';

// первичная загрузка (только при инициализации/смене шаблона)
import { fetchMultiSeriesSimple } from '@charts/store/thunks.ts';

// расчёт желаемого bucket по span/px (без привязки к сетке)
import { explainPickLevelBySpan } from '@charts/store/lodUtils.ts';

interface ChartPanelProps {
    resolvedCharReqTemplate: ResolvedCharReqTemplate;
}

const ChartCollection: React.FC<ChartPanelProps> = ({ resolvedCharReqTemplate }) => {
    const dispatch = useAppDispatch();

    // весь план уровней по всем полям (используем по ключу поля)
    const levelPlans = useAppSelector((s) => s.charts.levelPlan);

    const [width, setWidth] = useState<number>(1200);
    const [styleId, setStyleId] = useState<string>(DEFAULT_PRESET.name);

    const timeSettings: TimeSettings = useMemo(
        () => ({
            useTimeZone: true,
            timeZone: 'Europe/Moscow',
            locale: navigator.language || 'ru-RU',
        }),
        []
    );

    // НЕИЗМЕНЯЕМЫЙ domain — исходные границы шаблона (UTC)
    const xMinMs = toMsUtc(resolvedCharReqTemplate.from);
    const xMaxMs = toMsUtc(resolvedCharReqTemplate.to);

    // ширина контейнера (на resize не подгружаем данные повторно)
    useEffect(() => {
        const compute = () => Math.max(640, Math.round(window.innerWidth * 0.9));
        setWidth(compute());
        const onResize = debounce(() => setWidth(compute()), 200);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // -------- Инициализация: одна первичная загрузка + фиксация domain --------
    useEffect(() => {
        dispatch(setResolvedCharReqTemplate(resolvedCharReqTemplate));

        const initialRange: TimeRange = { from: new Date(xMinMs), to: new Date(xMaxMs) };
        const px = Math.round(width);

        // Инициализация view только один раз здесь
        resolvedCharReqTemplate.selectedFields.forEach((f) => {
            dispatch(ensureFieldView({ field: f.name, px, range: initialRange }));
        });

        const req: GetMultiSeriesRequest = {
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
            px,
        };

        dispatch(fetchMultiSeriesSimple(req));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, resolvedCharReqTemplate]); // width намеренно не включаем — без дозагрузок на resize

    // ---- helper: ближайший уровень В ПЛАНЕ к желаемому bucket ----
    const findClosestLevelInPlan = useCallback((planBuckets: number[], desiredBucketMs: number) => {
        if (!planBuckets?.length) return -1;
        let bestIdx = 0;
        let bestDiff = Math.abs(planBuckets[0] - desiredBucketMs);
        for (let i = 1; i < planBuckets.length; i++) {
            const d = Math.abs(planBuckets[i] - desiredBucketMs);
            if (d < bestDiff) { bestDiff = d; bestIdx = i; }
        }
        return bestIdx;
    }, []);

    // ----- ОДНО место пересчёта уровня по span/px + привязка к ПЛАНУ -----
    const recalcUiLevel = useCallback(
        (fieldName: string, fromMs: number, toMs: number, px: number, tag: string) => {
            const clampedFrom = Math.max(fromMs, xMinMs);
            const clampedTo = Math.min(toMs, xMaxMs);
            const spanMs = Math.max(1, clampedTo - clampedFrom);
            const pxSafe = Math.max(1, Math.round(px));

            // 1) считаем желаемый bucket по экрану (ещё без привязки к сетке)
            const d = explainPickLevelBySpan(spanMs, pxSafe, /!*targetPxPerBin=*!/3, /!*minBins=*!/60);
            const desiredBucketMs = d.desiredBucketMs;

            // 2) если есть ПЛАН уровней для поля — привязываемся к нему
            const plan = levelPlans?.[fieldName];
            if (plan?.bucketsMs?.length) {
                const lvl = findClosestLevelInPlan(plan.bucketsMs, desiredBucketMs);
                if (lvl >= 0) {
                    dispatch(setLevelAbsolute({ field: fieldName, level: lvl }));
                    console.log(`${tag} [LOD decision: PLAN]`, {
                        field: fieldName,
                        range: {
                            fromISO: new Date(clampedFrom).toISOString(),
                            toISO: new Date(clampedTo).toISOString(),
                        },
                        spanMs: d.spanMs,
                        px: d.px,
                        desiredBucketMs,
                        picked: { level: lvl, bucketMs: plan.bucketsMs[lvl] },
                    });
                    return;
                }
            }

            // 3) fallback: привязка к дефолтной сетке BUCKETS_MS
            const fallbackLevel = nearestBucketIdx(desiredBucketMs);
            dispatch(setLevelAbsolute({ field: fieldName, level: fallbackLevel }));
            console.log(`${tag} [LOD decision: FALLBACK]`, {
                field: fieldName,
                range: {
                    fromISO: new Date(clampedFrom).toISOString(),
                    toISO: new Date(clampedTo).toISOString(),
                },
                spanMs: d.spanMs,
                px: d.px,
                desiredBucketMs,
                picked: { level: fallbackLevel, bucketMs: BUCKETS_MS[fallbackLevel] },
            });
        },
        [dispatch, xMinMs, xMaxMs, levelPlans, findClosestLevelInPlan]
    );

    // ---- Обработчик окна (zoom/pan): range → recalc level ----
    const applyWindow = useCallback(
        (meta: ExtendedRangeChangeMeta, tag: string) => {
            const fieldName = meta.field;

            const clampedFrom = Math.max(meta.fromMs, xMinMs);
            const clampedTo = Math.min(meta.toMs, xMaxMs);
            const range: TimeRange = { from: new Date(clampedFrom), to: new Date(clampedTo) };

            // 1) фиксируем окно (для dataZoom init/рендера)
            dispatch(setFieldRange({ field: fieldName, range }));

            // 2) пересчёт уровня (строго по ПЛАНУ, если он есть)
            recalcUiLevel(fieldName, clampedFrom, clampedTo, meta.px, tag);
        },
        [dispatch, recalcUiLevel, xMinMs, xMaxMs]
    );

    const handleZoomIn = useCallback(
        (_: TimeRange, meta: ExtendedRangeChangeMeta) => applyWindow(meta, '[ZOOM IN]'),
        [applyWindow]
    );
    const handleZoomOut = useCallback(
        (_: TimeRange, meta: ExtendedRangeChangeMeta) => applyWindow(meta, '[ZOOM OUT]'),
        [applyWindow]
    );
    const handlePanLeft = useCallback(
        (_: TimeRange, meta: ExtendedRangeChangeMeta) => applyWindow(meta, '[PAN LEFT]'),
        [applyWindow]
    );
    const handlePanRight = useCallback(
        (_: TimeRange, meta: ExtendedRangeChangeMeta) => applyWindow(meta, '[PAN RIGHT]'),
        [applyWindow]
    );

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
                <CollapsibleSection key={field.name} label={field.name} defaultState={true}>
                    <ChartHeader field={field} timeSettings={timeSettings} />
                    <ChartItem
                        field={field}
                        height={600}
                        styleId={styleId}
                        timeSettings={timeSettings}
                        onZoomIn={handleZoomIn}
                        onZoomOut={handleZoomOut}
                        onPanLeft={handlePanLeft}
                        onPanRight={handlePanRight}
                    />
                </CollapsibleSection>
            ))}
        </div>
    );
};

export default ChartCollection;
*/
