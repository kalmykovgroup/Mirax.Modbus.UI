import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '@/store/types'
import {
    fetchChartReqTemplates,
    deleteChartReqTemplate,
    selectChartReqTemplates,
} from '@charts/store/chartsTemplatesSlice'

import type { ChartReqTemplateDto } from '@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto'
import TemplatesList from './TemplatesList/TemplatesList.tsx'
import ExecuteTemplateModal from './ExecuteTemplateModal/ExecuteTemplateModal.tsx'
import { resolveTemplate, extractAllKeysFromTemplate } from './templateResolve'

export default function ChartTemplatesPanel({
                                                onPick,
                                                onExecuteDone, // (optional) callback: (resolvedTpl: ChartReqTemplateDto) => void
                                            }: {
    onPick?: (cfg: ChartReqTemplateDto) => void
    onExecuteDone?: (resolvedTpl: ChartReqTemplateDto) => void
}) {
    const dispatch = useDispatch<AppDispatch>()
    const items = useSelector(selectChartReqTemplates)

    useEffect(() => {
        dispatch(fetchChartReqTemplates({ force: false }))
    }, [dispatch])

    // ---- Exec modal state ----
    const [execTpl, setExecTpl] = useState<ChartReqTemplateDto | null>(null)
    const hasParams = useMemo(() => {
        if (!execTpl) return false
        return extractAllKeysFromTemplate(execTpl).length > 0
    }, [execTpl])

    const handleDelete = (id: string, name?: string) => {
        if (!window.confirm(`Удалить шаблон${name ? ` «${name}»` : ''}? Это действие необратимо.`)) return
        dispatch(deleteChartReqTemplate({ id }))
    }

    const handleExecute = (tpl: ChartReqTemplateDto) => {
        // Если ключей нет — сразу вернуть «разрешённый» шаблон (без изменений)
        const keys = extractAllKeysFromTemplate(tpl)
        if (keys.length === 0) {
            onExecuteDone?.(tpl)
        } else {
            setExecTpl(tpl)
        }
    }

    const handleSubmitExec = (values: Record<string, unknown>) => {
        if (!execTpl) return
        const resolved = resolveTemplate(execTpl, values)
        onExecuteDone?.(resolved)

        // по умолчанию — просто для отладки
        if (!onExecuteDone) {
            console.group(`✅ Resolved template: ${(resolved as any).name ?? (resolved as any).id}`)
            console.log(resolved)
            console.groupEnd()
        }

        setExecTpl(null)
    }

    return (
        <>
            <TemplatesList
                items={items}
                onPick={onPick}
                onDelete={handleDelete}
                onExecute={handleExecute}
            />

            {execTpl && hasParams && (
                <ExecuteTemplateModal
                    template={execTpl}
                    onCancel={() => setExecTpl(null)}
                    onSubmit={handleSubmitExec}
                />
            )}
        </>
    )
}
