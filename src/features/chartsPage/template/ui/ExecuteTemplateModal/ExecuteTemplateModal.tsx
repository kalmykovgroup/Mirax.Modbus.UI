import { useEffect, useMemo, useState } from 'react'
import styles from './ExecuteTemplateModal.module.css'
 import {
    extractAllKeysFromTemplate,
    getParamMeta,
    isMissingRequired,
} from '../templateResolve'
import type {SqlParam} from "@chartsPage/template/shared/dtos/SqlParam.ts";
import type {ChartReqTemplateDto} from "@chartsPage/template/shared/dtos/ChartReqTemplateDto.ts";
import type {TimeRange, TimeRangeBounds} from "@chartsPage/charts/core/store/types/chart.types.ts";
import FromToFields from "@chartsPage/metaData/ui/FromToFields/FromToFields.tsx";



export default function ExecuteTemplateModal({
                                                 template,
                                                 onCancel,
                                                 onSubmit, // returns typed values -> parent resolves to final template
                                             }: {
    template: ChartReqTemplateDto
    onCancel: () => void
    onSubmit: (result: {
        values: Record<string, unknown>,
        range: TimeRange
    }) => void
}) {
    // --- ключи/параметры шаблона
    const keys = useMemo(() => extractAllKeysFromTemplate(template), [template])
    const params = useMemo<SqlParam[]>(
        () => ((template as any)?.params ?? []) as SqlParam[],
        [template]
    )

    // --- локальные значения для {{keys}}
    const [values, setValues] = useState<Record<string, string>>({})

    useEffect(() => {
        const initial: Record<string, string> = {}
        keys.forEach(k => {
            const meta = getParamMeta(params, k)
            const def = meta?.value ?? meta?.defaultValue
            initial[k] = def !== undefined && def !== null ? String(def) : ''
        })
        setValues(initial)
    }, [keys, params])

    // --- ЛОКАЛЬНЫЙ ДИАПАЗОН from/to (НЕ мутируем template)
    const [range, setRange] = useState<TimeRangeBounds>({
        fromMs: template.fromMs,
        toMs: template.toMs,
    })

    // при смене шаблона — переинициализируем диапазон
    useEffect(() => {

        setRange({
            fromMs: template.fromMs,
            toMs: template.toMs
        })
    }, [template])

    const hasMissing = isMissingRequired(keys, params, values)

    const submit = () => {
        if (hasMissing) return
        // Передаём «сырые» строки для params,
        // + дополнительно возвращаем диапазон в служебных полях.
        const obj: Record<string, unknown> = {}
        for (const k of keys) obj[k] = values[k]


        onSubmit({values: obj, range: range as TimeRange})
    }

    // закрытие по ESC + блокировка скролла
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
        document.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
    }, [onCancel])



    return (
        <div className={styles.backdrop} onClick={onCancel} role="dialog" aria-modal="true">
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                        {(template as any).name || 'Выполнить шаблон'}
                    </div>
                    <button className={styles.btnClose} onClick={onCancel} aria-label="Закрыть">✕</button>
                </div>

                <div className={styles.modalBody}>
                    <FromToFields
                        range={range}
                        onChange={(date) => setRange(prev => ({ ...prev, ...date }))}
                    />

                    {keys.map(k => {
                        const meta = getParamMeta(params, k)
                        const required = !!meta?.required
                        const empty = String(values[k] ?? '').trim() === ''
                        return (
                            <div key={k} className={styles.fieldRow}>
                                <div className={styles.fieldLabel}>
                                    <code>{`{{${k}}}`}</code>
                                    {required && <span className={styles.badge}>required</span>}
                                    {meta?.type && <div className={styles.metaText}>type: {meta.type}</div>}
                                    {meta?.description && <div className={styles.metaText}>{meta.description}</div>}
                                </div>
                                <input
                                    className={`${styles.input} ${required && empty ? styles.inputError : ''}`}
                                    value={values[k] ?? ''}
                                    onChange={e => setValues(prev => ({ ...prev, [k]: e.target.value }))}
                                    placeholder={meta?.description || k}
                                />
                            </div>
                        )
                    })}
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.btnSecondary} onClick={onCancel}>Отмена</button>
                    <button
                        className={styles.btnPrimary}
                        disabled={hasMissing}
                        onClick={submit}
                        title={hasMissing ? 'Заполните обязательные поля' : 'OK'}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    )
}
