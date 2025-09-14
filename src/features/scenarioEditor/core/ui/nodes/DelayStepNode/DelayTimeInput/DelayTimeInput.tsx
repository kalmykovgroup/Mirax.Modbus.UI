import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './DelayTimeInput.module.css';

/** Публичные пропсы.
 * value — строка миллисекунд (такую же кладёте в DelayStepDto.timeSpan)
 * onChange — отдаём обратно миллисекунды строкой (нормализованное значение)
 */
export interface DelayTimeInputProps {
    value: string | undefined;
    onChange: (nextMs: string) => void;
    placeholder?: string;
    minMs?: number;
    maxMs?: number;
    disabled?: boolean;
    id?: string;
    className?: string;
    /** Если true — после blur поле нормализуется в «чистые миллисекунды» */
    normalizeOnBlur?: boolean;
}

/* ───── единицы времени (в мс) ───── */
const MS = 1;
const SEC = 1000 * MS;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
/** Средний год по Григорианскому календарю: 365.2425 суток */
const YEAR = 365.2425 * DAY;
/** 100 лет в мс */
const MS_100_YEARS = Math.floor(100 * YEAR);
/** Месяц берём условно как 30 суток (только для токенов и ISO-месяцев) */
const MONTH = 30 * DAY;

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const isFiniteNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Парсинг строки → миллисекунды (число).
 * Поддерживает:
 *  • чистое число: "1500" → 1500мс
 *  • токены: "1y 2w 3d 4h 5m 6s 7ms", порядок любой, возможны десятичные (кроме y,w,d)
 *  • HH:MM[:SS[.mmm]] → часы/минуты/секунды
 *  • ISO 8601: PnYnMnWnDTnHnMnS (запятая/точка в секундах)
 */
export function parseDurationToMs(input: string): number {
    const s = (input ?? '').trim();
    if (!s) return NaN;

    // 1) Чистое число => миллисекунды
    if (/^[+-]?\d+(\.\d+)?$/.test(s)) {
        const n = Number(s);
        return Number.isFinite(n) ? n : NaN;
    }

    const lower = s.toLowerCase().replace(',', '.');

    // 2) HH:MM[:SS[.mmm]]
    //    01:02 → 1ч 2м; 01:02:03.250 → 1ч 2м 3.250с
    {
        const re = /^\s*(\d+):([0-5]?\d)(?::([0-5]?\d)(?:\.(\d{1,3}))?)?\s*$/;
        const m = lower.match(re);
        if (m) {
            const hh = Number(m[1] ?? 0);
            const mm = Number(m[2] ?? 0);
            const ss = Number(m[3] ?? 0);
            const ms = Number((m[4] ?? '0').padEnd(3, '0'));
            return hh * HOUR + mm * MIN + ss * SEC + ms;
        }
    }

    // 3) Токены: 1y 2w 3d 4h 5m 6s 7ms; допускаем слитно ("1h20m")
    {
        // years (y), weeks (w), days (d), hours (h), minutes (m), seconds (s), milliseconds (ms)
        const tokenRe = /([+-]?\d+(?:\.\d+)?)(y|w|d|h|m|s|ms)\b/g;
        let total = 0;
        let matched = false;
        let m: RegExpExecArray | null;
        while ((m = tokenRe.exec(lower)) !== null) {
            matched = true;
            const val = Number(m[1]);
            const unit = m[2];
            if (!Number.isFinite(val)) return NaN;
            switch (unit) {
                case 'y': total += val * YEAR; break;
                case 'w': total += val * WEEK; break;
                case 'd': total += val * DAY; break;
                case 'h': total += val * HOUR; break;
                case 'm': total += val * MIN; break;      // минуты!
                case 's': total += val * SEC; break;
                case 'ms': total += val; break;
            }
        }
        if (matched) return Math.round(total);
    }

    // 4) ISO 8601: PnYnMnWnDTnHnMnS  (месяцы считаем как 30 дней)
    {
        const re =
            /^p(?:(\d+(?:\.\d+)?)y)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)w)?(?:(\d+(?:\.\d+)?)d)?(?:t(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?)?$/i;
        const m = lower.match(re);
        if (m) {
            const [ , y, mo, w, d, h, mi, sSec ] = m;
            const yy = Number(y ?? 0);
            const mm = Number(mo ?? 0);
            const ww = Number(w ?? 0);
            const dd = Number(d ?? 0);
            const hh = Number(h ?? 0);
            const mmi = Number(mi ?? 0);
            const ss = Number(sSec ?? 0);
            if ([yy, mm, ww, dd, hh, mmi, ss].some((x) => !Number.isFinite(x))) return NaN;
            return Math.round(yy * YEAR + mm * MONTH + ww * WEEK + dd * DAY + hh * HOUR + mmi * MIN + ss * SEC);
        }
    }

    return NaN;
}

/** Человекочитаемый формат: до лет включительно */
export function formatMsHuman(ms: number): string {
    if (!isFiniteNumber(ms)) return '';
    if (ms === 0) return '0ms';

    const sign = ms < 0 ? '-' : '';
    let rest = Math.abs(ms);

    const y = Math.floor(rest / YEAR);  rest -= y * YEAR;
    const d = Math.floor(rest / DAY);   rest -= d * DAY;
    const h = Math.floor(rest / HOUR);  rest -= h * HOUR;
    const m = Math.floor(rest / MIN);   rest -= m * MIN;
    const s = Math.floor(rest / SEC);   rest -= s * SEC;
    const milli = Math.floor(rest);

    const parts: string[] = [];
    if (y) parts.push(`${y}y`);
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s) parts.push(`${s}s`);
    if (milli && parts.length === 0) parts.push(`${milli}ms`);
    if (milli && parts.length > 0) parts.push(`${milli}ms`);
    return sign + parts.join(' ');
}

/** Упрощённый ISO: Y, D, T… (месяцы не выдаём, чтобы избежать неоднозначностей) */
export function toIsoDuration(ms: number): string {
    if (!isFiniteNumber(ms)) return '';
    const sign = ms < 0 ? '-' : '';
    let rest = Math.abs(ms);

    const y = Math.floor(rest / YEAR);  rest -= y * YEAR;
    const d = Math.floor(rest / DAY);   rest -= d * DAY;
    const h = Math.floor(rest / HOUR);  rest -= h * HOUR;
    const m = Math.floor(rest / MIN);   rest -= m * MIN;
    const sFloat = rest / SEC; // доля секунд

    const out: string[] = ['P'];
    if (y) out.push(`${y}Y`);
    if (d) out.push(`${d}D`);
    if (h || m || sFloat) out.push('T');
    if (h) out.push(`${h}H`);
    if (m) out.push(`${m}M`);
    if (sFloat) {
        const sStr = sFloat % 1 === 0
            ? `${sFloat.toFixed(0)}S`
            : `${sFloat.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}S`;
        out.push(sStr);
    }
    return sign + out.join('');
}

export function DelayTimeInput({
                                   value,
                                   onChange,
                                   placeholder = 'Напр.: 1y 2w 3d 4h 5m 6s 7ms · 01:02:03.250 · PT1H2M · 1500',
                                   minMs = 0,
                                   maxMs = MS_100_YEARS,   // ← по умолчанию 100 лет
                                   disabled,
                                   id,
                                   className,
                                   normalizeOnBlur = true,
                               }: DelayTimeInputProps) {

    const [text, setText] = useState<string>(() => {
        const raw = (value ?? '').toString();
        const ms = parseDurationToMs(raw);
        return Number.isFinite(ms) ? String(clamp(ms, minMs, maxMs)) : raw;
    });

    const [error, setError] = useState<string | null>(null);
    const lastCommitted = useRef<number | null>(null);

    // Синхронизация внешнего значения
    useEffect(() => {
        if (typeof value !== 'string') return;
        const ms = parseDurationToMs(value);
        if (Number.isFinite(ms)) {
            const normalized = String(clamp(ms, minMs, maxMs));
            lastCommitted.current = ms;
            setText(normalized);   // ← сразу показываем миллисекунды
            setError(null);
        } else {
            // если не распарсилось — показываем как есть
            setText(value);
        }
    }, [value, minMs, maxMs]);

    const parsed = useMemo(() => {
        const ms = parseDurationToMs(text);
        const valid = Number.isFinite(ms);
        const clamped = valid ? clamp(ms, minMs, maxMs) : NaN;
        return { ms, valid, clamped };
    }, [text, minMs, maxMs]);

    const human = useMemo(() => (Number.isFinite(parsed.ms) ? formatMsHuman(parsed.ms) : ''), [parsed.ms]);

    const inputId = id ?? 'delay-time-input';

    const commitIfValid = () => {
        if (!parsed.valid) {
            setError('Неверный формат. Примеры: 1y 2w 3d, 4h 5m, 6s, 7ms, 01:02:03.250, PT1H2M, 1500');
            if (lastCommitted.current !== null) setText(String(lastCommitted.current));
            return;
        }
        if (parsed.ms < minMs || parsed.ms > maxMs) {
            setError(`Диапазон: ${minMs}…${maxMs} мс`);
            return;
        }
        setError(null);
        lastCommitted.current = parsed.ms;
        const next = String(parsed.ms);
        onChange(next);
        if (normalizeOnBlur) setText(next);
    };

    const onChangeInput: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const next = e.target.value;
        setText(next);
        const ms = parseDurationToMs(next);
        if (Number.isFinite(ms) && ms >= minMs && ms <= maxMs) setError(null);
    };

    const onBlur: React.FocusEventHandler<HTMLInputElement> = () => {
        commitIfValid();
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
            setText(value ?? '');
            setError(null);
            (e.target as HTMLInputElement).blur();
        }
    };

    // Прокрутка колёсиком — «умный» шаг
    const onWheel: React.WheelEventHandler<HTMLInputElement> = (e) => {
        if (disabled) return;
        if (!Number.isFinite(parsed.ms)) return;
        const dir = e.deltaY > 0 ? -1 : 1;

        // шаг = 1/100 от текущей величины, ограничим 1мс..1день
        const magnitude = Math.max(MS, Math.min(DAY, Math.pow(10, Math.floor(Math.log10(Math.max(parsed.ms, 1))) - 2)));
        const next = clamp(parsed.ms + dir * magnitude, minMs, maxMs);

        setText(String(next));
        setError(null);
        lastCommitted.current = next;
        onChange(String(next));
    };

    return (
        <div className={`${styles.wrap} ${className ?? ''}`}>
            <label className={styles.label} htmlFor={inputId}>Время ожидания</label>

            <div className={styles.hints}>
                {error ? (
                    <div id={`${inputId}-err`} className={styles.error}>{error}</div>
                ) : (
                    <>

                        {Number.isFinite(parsed.ms) && (
                            <div className={styles.hintRow}>
                                <span className={styles.hintKey}>≈</span>
                                <span className={styles.hintVal}>{human}</span>
                            </div>
                        )}

                        {!Number.isFinite(parsed.ms) && (
                            <div className={styles.dim}>
                                Примеры: <code>1y 2w 3d</code>, <code>4h 5m</code>, <code>6s</code>, <code>7ms</code>, <code>01:02:03.250</code>, <code>PT1H2M</code>, <code>1500</code>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className={styles.inputRow}>
                <input
                    id={inputId}
                    type="text"
                    inputMode="text"
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    disabled={disabled}
                    placeholder={placeholder}
                    value={text}
                    onChange={onChangeInput}
                    onBlur={onBlur}
                    onKeyDown={onKeyDown}
                    onWheel={onWheel}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-err` : undefined}
                />
                <span className={styles.msSuffix}>ms</span>
            </div>


        </div>
    );
}

export default DelayTimeInput;
