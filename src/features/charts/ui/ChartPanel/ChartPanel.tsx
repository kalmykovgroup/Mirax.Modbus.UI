// src/components/ChartPanel.tsx
import React, { useEffect, useState} from 'react';
import debounce from 'lodash/debounce';
import {
    ensureFieldView,
    fetchMultiRawSimple,
    fetchMultiSeriesSimple,
    type TimeRange
} from '@charts/store/chartsSlice.ts';
import type { GetMultiSeriesRequest } from "@charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest.ts";
import type { GetMultiRawRequest } from "@charts/shared/contracts/chart/Dtos/Requests/GetMultiRawRequest.ts";
import type {ResolvedCharReqTemplate} from "@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";
import ChartItem from "@charts/ui/ChartItem.tsx";
import {useAppDispatch} from "@/store/hooks.ts";

interface ChartPanelProps {
    resolvedCharReqTemplate: ResolvedCharReqTemplate
}

const ChartPanel : React.FC<ChartPanelProps> = ({resolvedCharReqTemplate}) => {
    const dispatch = useAppDispatch();

    const [width, setWidth] = useState<number>(1200);
    const [syncZoom, setSyncZoom] = useState<boolean>(true);

    const [sharedRange, setSharedRange] = useState<TimeRange>({
        from: resolvedCharReqTemplate.from,
        to: resolvedCharReqTemplate.to
    });

    // Handle resize: Обновляем width, но не refetch (если нужно — добавьте dispatch с новым px)
    useEffect(() => {
        const resizeHandler = debounce(() => {
            setWidth(window.innerWidth * 0.9 || 1200);
        }, 300);
        window.addEventListener('resize', resizeHandler);
        return () => window.removeEventListener('resize', resizeHandler);
    }, []);

    // Initial setup: Fetch и ensureView при mount или смене template/width
    useEffect(() => {
        const initialRange: TimeRange = {
            from: resolvedCharReqTemplate.from,
            to: resolvedCharReqTemplate.to
        };
        setSharedRange(initialRange);

        const request: GetMultiSeriesRequest = {
            template: resolvedCharReqTemplate,
            from: initialRange.from,
            to: initialRange.to,
            px: width,
        };

        dispatch(fetchMultiSeriesSimple(request));

        resolvedCharReqTemplate.selectedFields.forEach(f => dispatch(ensureFieldView({
            field: f.name,
            px: width,
            range: initialRange,
            visible: true
        })));
    }, [dispatch, resolvedCharReqTemplate, width]); // Deps: refetch при смене template или width

    // Callback для range change (sync mode): Refetch в зависимости от diff
    const handleRangeChange = (newRange: TimeRange) => {
        if (!newRange.from || !newRange.to) {
            console.error(`Ошибка в диапазоне: from:${newRange.from} to:${newRange.to}`);
            return;
        }

        setSharedRange(newRange);

        const diffMs = newRange.to.getTime() - newRange.from.getTime();

        if (diffMs < 86400000) { // < 24h — raw
            const rawRequest: GetMultiRawRequest = {
                template: resolvedCharReqTemplate,
                from: newRange.from,
                to: newRange.to,
                maxPointsPerField: 5000
            };
            dispatch(fetchMultiRawSimple(rawRequest))
        } else { // binned с новым range/px
            const seriesRequest: GetMultiSeriesRequest = {
                template: resolvedCharReqTemplate,
                from: newRange.from,
                to: newRange.to,
                px: width
            };
            dispatch(fetchMultiSeriesSimple(seriesRequest))
        }
    };


    return (
        <div>
            <div style={{ marginBottom: '10px' }}>
                <label>
                    <input
                        type="checkbox"
                        checked={syncZoom}
                        onChange={(e) => setSyncZoom(e.target.checked)}
                    />
                    Sync Zoom across all charts
                </label>
            </div>
            {resolvedCharReqTemplate.selectedFields.map(field =>
                <ChartItem
                    key={field.name}
                    template={resolvedCharReqTemplate}
                    field={field}
                    width={width}
                    syncZoom={syncZoom}
                    sharedRange={sharedRange}
                    onRangeChange={handleRangeChange}
                />
            )}
        </div>
    );
};

export default ChartPanel;