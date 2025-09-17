import styles from './TemplatesList.module.css'
import type { ChartReqTemplateDto } from '@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto'
import {useSelector} from "react-redux";
import {selectChartReqTemplatesLoading} from "@charts/store/chartsTemplatesSlice.ts";

export default function TemplatesList({
                                          items,
                                          onPick,
                                          onDelete,
                                          onExecute,
                                      }: {
    items: ChartReqTemplateDto[]
    onPick?: ((cfg: ChartReqTemplateDto) => void) | undefined
    onDelete: (id: string, name?: string) => void
    onExecute: (t: ChartReqTemplateDto) => void
}) {

    const loading = useSelector(selectChartReqTemplatesLoading)

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div style={{ fontWeight: 600 }}>Шаблоны</div>
                {loading.list && <span className={styles.loadingText}>загрузка…</span>}
            </div>

            {items.length === 0 && !loading.list && (
                <div className={styles.emptyText}>Шаблонов пока нет</div>
            )}

            <div className={styles.list}>
                {items.map((t) => {
                    const id = (t as any).id as string
                    const name = (t as any).name as string
                    const description = (t as any).description as string | undefined

                    return (
                        <div key={id} className={styles.card}
                             onClick={() => onPick?.(t)}
                        >
                            <div>
                                <div className={styles.cardTitle}>{name}</div>
                                {description && <div className={styles.cardDescr}>{description}</div>}
                            </div>


                                <button
                                    className={`${styles.btnExec} ${styles.btnExecDelete}`}
                                    onClick={() => onDelete(id, name)}
                                    title="Удалить"
                                    disabled={loading.delete}
                                >
                                    {loading.delete ? '…' : (
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M3 6H21M8 6V4C8 3.45 8.45 3 9 3H15C15.55 3 16 3.45 16 4V6M10 11V17M14 11V17M4 6H20V20C20 21.10 19.10 22 18 22H6C4.90 22 4 21.10 4 20V6Z"
                                                  fill="none" stroke="currentColor" strokeWidth="2"
                                                  strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>

                                <button
                                    className={`${styles.btnExec} ${styles.btnExecRun}`}
                                    onClick={() => onExecute(t)}
                                    title="Выполнить"
                                >
                                    Run
                                </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
