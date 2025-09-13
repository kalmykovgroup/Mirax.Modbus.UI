// src/components/ChartTemplatesPanel.tsx
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '@/store/types'
import styles from './ChartTemplatesPanel.module.css'

import {
    fetchChartReqTemplates,
    deleteChartReqTemplate,
    selectChartReqTemplates,
    selectChartReqTemplatesLoading,
} from '@charts/store/chartsTemplatesSlice'

import type { ChartReqTemplateDto } from '@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto'



export default function ChartTemplatesPanel({onPick}: { onPick?: (cfg: ChartReqTemplateDto) => void }) {
    const dispatch = useDispatch<AppDispatch>()

    const items = useSelector(selectChartReqTemplates)
    const loading = useSelector(selectChartReqTemplatesLoading)

    useEffect(() => {
        dispatch(fetchChartReqTemplates({ force: false }))
    }, [dispatch])

    const onPickLocal = (t: ChartReqTemplateDto) => {
        onPick?.(t)
    }

    const onDelete = (id: string) => {
        dispatch(deleteChartReqTemplate({ id }))
    }

    return (
        <div className={styles.container}>

            <div className={styles.header}>
                <div style={{ fontWeight: 600 }}>Шаблоны</div>
                {loading.list && <span style={{ fontSize: 12, opacity: .6 }}>загрузка…</span>}
            </div>

            {items.length === 0 && !loading.list && (
                <div style={{ fontSize: 12, opacity: .7 }}>Шаблонов пока нет</div>
            )}

            <div style={{ display: 'grid', gap: 6 }}>
                {items.map((t : ChartReqTemplateDto) => {
                    const id = (t as any).id as string
                    const name = (t as any).name as string
                    const description = (t as any).description as string | undefined

                    return (
                        <div key={id} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            alignItems: 'center',
                            padding: '8px',
                            border: '1px solid #333',
                            borderRadius: 8,
                            background: '#1a1a1a'
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                                {description && <div style={{ fontSize: 12, opacity: .7 }}>{description}</div>}
                            </div>

                            <div style={{
                                display: 'flex',
                                gap: 8,
                                alignItems: 'center',
                                padding: '8px',
                                border: '1px solid #333',
                                borderRadius: 8,
                                background: '#1a1a1a'
                            }}>
                                <button
                                    onClick={() => onPickLocal(t)}
                                    title="Выбрать"
                                    style={{ padding: '6px 10px' }}
                                >
                                    Выбрать
                                </button>
                                <button
                                    onClick={() => onDelete(id)}
                                    title="Удалить"
                                    disabled={loading.delete}
                                    style={{ padding: '6px 10px' }}
                                >
                                    {loading.delete ? 'Удаление…' : 'Удалить'}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
