import styles from './TemplatesList.module.css'
import type { ChartReqTemplateDto } from '@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto'
import {useSelector} from "react-redux";
import {
    type NewChartReqTemplate,
    selectChartReqTemplatesLoading,
    selectTemplate
} from "@charts/store/chartsTemplatesSlice.ts";
import {useTheme} from "@app/providers/theme/useTheme.ts";
import SplashScreen from "@ui/components/SplashScreen/SplashScreen.tsx";

export default function TemplatesList({
                                          items,
                                          onPick,
                                          onDelete,
                                          onExecute,
                                          onExecuteShow
                                      }: {
    items: ChartReqTemplateDto[]
    onPick: ((cfg: ChartReqTemplateDto) => void)
    onDelete: (id: string, name?: string) => void
    onExecute: (t: ChartReqTemplateDto) => void
    onExecuteShow: (t: ChartReqTemplateDto) => void
}) {
    const loading = useSelector(selectChartReqTemplatesLoading)

    const template: ChartReqTemplateDto | NewChartReqTemplate = useSelector(selectTemplate)
    const {theme} = useTheme()


    return (
        <div className={styles.container} data-theme={theme}>

            {loading.list && <SplashScreen/>}

            {items.length === 0 && !loading.list && (
                <div className={styles.emptyText}>Шаблонов пока нет</div>
            )}

            <div className={styles.list}>
                {items.map((t) => {
                    const id = (t as any).id as string
                    const name = (t as any).name as string
                    const description = (t as any).description as string | undefined

                    return (
                        <div data-theme={theme} key={id} className={styles.card} onClick={() => onPick(t)} data-active={template.id === id} >
                            <div className={styles.card_center}>
                                <div className={styles.actions}>
                                    <button
                                        className={`${styles.btnExec} ${styles.btnDelete}`}
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
                                        className={`${styles.btnExec} ${styles.btnExecEdit}`}
                                        onClick={() => { onExecuteShow(t) }} title="Редактировать" >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 20h9"></path>
                                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                        </svg>
                                    </button>
                                </div>

                                <div className={styles.cardTitle}>{name}</div>
                                {description && <div className={styles.cardDescr}>{description}</div>}
                            </div>





                            <button
                                    className={`${styles.btnExec} ${styles.btnExecRun}`}
                                    onClick={() => { onExecute(t) }} title="Выполнить" >
                                    Выполнить
                                </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
