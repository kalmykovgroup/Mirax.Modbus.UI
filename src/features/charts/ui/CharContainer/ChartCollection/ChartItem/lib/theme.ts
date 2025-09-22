// src/components/ChartCollection/ChartItem/theme.ts
import type { EChartsOption } from 'echarts';

export type LineDash = 'solid' | 'dashed' | 'dotted';



export type StylePreset = {
    id: string;
    name: string;
    color: {
        line: { avg: string; raw: string; min: string; max: string };
        point: { avg: string; raw: string; min: string; max: string };
        glow: { avg: string; raw: string; min: string; max: string };
        palette: string[];

        // ⬇⬇⬇ было: axis?: { label: string; line: string; split: string; name?: string };
        axis?: {
            label?: string; // делаем все опциональными
            line?: string;
            split?: string;
            name?: string;
        };

        // ⬇⬇⬇ было: tooltip?: { bg: string; border: string; text: string };
        tooltip?: {
            bg?: string;
            border?: string;
            text?: string;
        };
    };

    size: { symbol: { small: number; avg: number; raw: number; min: number; max: number } };
    width: { line: { raw: number; avg: number; minmax: number; bandBase: number }; bar: { countWidth: string } };
    dash: { raw: LineDash; avg: LineDash; min: LineDash; max: LineDash };
    opacity: { line: number; point: number; bandBase: number; bandDelta: number; minmax: number };
    z: { band: number; minmax: number; line: number; points: number };
    grid?: EChartsOption['grid'];
    backgroundColor?: string;

    axisYLeft?: {
        labelColor?: string;
        fontSize?: number;
        fontFamily?: string;
        formatter?: (val: number) => string;
        lineColor?: string;
        lineWidth?: number;
        tickShow?: boolean;
        tickLength?: number;
        tickInside?: boolean;
        splitLineColor?: string;
        splitLineType?: 'solid' | 'dashed' | 'dotted';
        splitArea?: boolean;
    };
};


// ----- Пресеты -----

// VS Dark — сплошные линии
export const VS_DARK_SOLID: StylePreset = {
    id: 'vs-dark-solid',
    name: 'VS Dark · Solid',
    color: {
        line: { avg: '#cc5c00', raw: '#4EC9B0', min: '#DCDCAA', max: '#C586C0' },
        point:{ avg: '#ff4400', raw: '#4EC9B0', min: '#DCDCAA', max: '#C586C0' },
        glow: { avg: 'rgba(0,122,204,0.45)', raw: 'rgba(78,201,176,0.45)', min: 'rgba(220,220,170,0.45)', max: 'rgba(197,134,192,0.45)' },
        palette: ['#007ACC','#4EC9B0','#CE9178','#C586C0','#DCDCAA','#569CD6'],
        axis: {
            label: '#cccccc',
            line: '#3a3a3a',
            split: 'rgba(255,255,255,0.06)',
            name: '#9aa0a6' },
        tooltip: { bg: '#252526',
            border: '#3a3a3a',
            text: '#e5e5e5' },

    },
    size: { symbol: { small: 3, avg: 5, raw: 5, min: 5, max: 5 } },
    width:{ line:{ raw: 2, avg: 2, minmax: 1.2, bandBase: 0 }, bar:{ countWidth: '60%' } },
    dash: { raw: 'solid', avg: 'solid', min: 'solid', max: 'solid' },
    opacity:{ line:1, point:0.95, bandBase:0.06, bandDelta:0.18, minmax:0.75 },
    z:{ band:1, minmax:2, line:3, points:5 },
    grid:{ left:40, right:48, top:32, bottom:40 },
    backgroundColor: '#1e1e1e',
    axisYLeft: {
        labelColor: '#cccccc',
        fontSize: 12,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        formatter: (v) => {
            const val = Number(v);
            if (!Number.isFinite(val)) return String(v);
            if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(1) + ' млрд';
            if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + ' млн';
            if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(1) + ' тыс';
            return String(val);
        },
        lineColor: '#3a3a3a',
        lineWidth: 1,
        tickShow: true,
        tickLength: 4,
        tickInside: false,
        splitLineColor: 'rgba(255,255,255,0.06)',
        splitLineType: 'dashed',
        splitArea: false,
    }
};

// VS Dark — пунктирная средняя
export const VS_DARK_DASHED: StylePreset = {
    ...VS_DARK_SOLID,
    id: 'vs-dark-dashed',
    name: 'VS Dark · Dashed AVG',
    dash: { raw:'solid', avg:'dashed', min:'solid', max:'solid' },
};

// Светлая минималистичная
export const LIGHT_MINIMAL: StylePreset = {
    id: 'light-minimal',
    name: 'Light · Minimal',
    color: {
        line: { avg:'#2563eb', raw:'#14b8a6', min:'#22c55e', max:'#a855f7' },
        point:{ avg:'#2563eb', raw:'#14b8a6', min:'#22c55e', max:'#a855f7' },
        glow: { avg:'rgba(37,99,235,0.25)', raw:'rgba(20,184,166,0.25)', min:'rgba(34,197,94,0.25)', max:'rgba(168,85,247,0.25)' },
        palette: ['#2563eb','#14b8a6','#f59e0b','#a855f7','#22c55e','#ef4444'],
        axis: { label:'#374151', line:'#d1d5db', split:'rgba(31,41,55,0.08)', name:'#6b7280' },
        tooltip: { bg:'#ffffff', border:'#e5e7eb', text:'#111827' },
    },
    size: { symbol: { small: 3, avg: 5, raw: 5, min: 5, max: 5 } },
    width:{ line:{ raw:1.6, avg:1.8, minmax:1, bandBase:0 }, bar:{ countWidth:'60%' } },
    dash: { raw:'solid', avg:'solid', min:'dotted', max:'dotted' },
    opacity:{ line:1, point:0.95, bandBase:0.04, bandDelta:0.12, minmax:0.7 },
    z:{ band:1, minmax:2, line:3, points:5 },
    grid:{ left:40, right:48, top:32, bottom:40 },
    backgroundColor: 'White',
};

export const STYLE_PRESETS: StylePreset[] = [VS_DARK_SOLID, VS_DARK_DASHED, LIGHT_MINIMAL];

export const DEFAULT_PRESET: StylePreset = STYLE_PRESETS[0]!;

export function getPreset(styleId?: string): StylePreset {
    const found = STYLE_PRESETS.find(p => p.id === styleId);
    return found ?? VS_DARK_SOLID;
}
