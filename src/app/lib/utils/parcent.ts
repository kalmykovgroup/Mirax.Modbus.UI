

const _nfCache: Record<number, Intl.NumberFormat> = {};
export function fmtMaxFrac(
    v: number | null | undefined,
    maxFrac: number = 2,
    locale: string = 'ru-RU'
): string {
    if (v == null || !isFinite(v)) return '—';
    _nfCache[maxFrac] ??= new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxFrac,
    });
    return _nfCache[maxFrac].format(v);
}