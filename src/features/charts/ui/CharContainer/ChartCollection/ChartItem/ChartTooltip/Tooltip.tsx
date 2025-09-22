// src/components/ChartCollection/ChartItem/tooltip.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import ChartTooltip from '@charts/ui/CharContainer/ChartItem/ChartTooltip/ChartTooltip.tsx';
import type { SeriesBinDto } from '@charts/shared/contracts/chart/Dtos/SeriesBinDto.ts';
import type { RawPointDto } from '@charts/shared/contracts/chart/Dtos/RawPointDto.ts';
import { formatRuDateTime } from '@app/lib/utils/formatDate.ts';
import { fmtMaxFrac } from '@app/lib/utils/parcent.ts';

export function buildTooltipFormatter() {
    return (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        const data = p?.data;
        const bin: SeriesBinDto | undefined = data?.bin;
        const isRaw = !!data?.raw;

        let tsMs: number | undefined;
        if (bin?.t) {
            tsMs = bin.t instanceof Date ? bin.t.getTime() : Date.parse(bin.t as any);
        } else if (Array.isArray(data?.value) && data.value[0] != null) {
            tsMs = Number(data.value[0]);
        }
        const dateText = tsMs != null && !Number.isNaN(tsMs) ? formatRuDateTime(new Date(tsMs)) : '—';

        if (isRaw) {
            const raw: RawPointDto = data.raw;
            return renderToStaticMarkup(
                <ChartTooltip title={dateText} isRaw value={fmtMaxFrac(raw.value ?? null, 2)} />
            );
        }

        return renderToStaticMarkup(
            <ChartTooltip
                title={dateText}
                count={bin?.count ?? '—'}
                avg={fmtMaxFrac(bin?.avg ?? null, 2)}
                min={fmtMaxFrac(bin?.min ?? null, 2)}
                max={fmtMaxFrac(bin?.max ?? null, 2)}
            />
        );
    };
}
