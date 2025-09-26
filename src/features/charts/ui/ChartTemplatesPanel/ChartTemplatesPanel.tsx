import { useEffect, useState, useMemo } from 'react'
import {  useSelector } from 'react-redux'
import {
    fetchChartReqTemplates,
    deleteChartReqTemplate,
    selectChartReqTemplates, applyTemplate, selectChartReqTemplatesLoaded,
} from '@charts/store/chartsTemplatesSlice'

import styles from "./ChartTemplatesPanel.module.css"

import type { ChartReqTemplateDto } from '@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto'
import TemplatesList from './TemplatesList/TemplatesList.tsx'
import ExecuteTemplateModal from './ExecuteTemplateModal/ExecuteTemplateModal.tsx'
import {
    extractAllKeysFromTemplate,
    resolveTemplateForServer,
    missingRequiredParams
} from './templateResolve'
import type {ResolvedCharReqTemplate} from "@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";
import {selectDatabasesLoaded} from "@charts/store/chartsMetaSlice.ts";
import {useAppDispatch} from "@/store/hooks.ts";
import {useConfirm} from "@ui/components/ConfirmProvider/ConfirmProvider.tsx";
import {useTheme} from "@app/providers/theme/useTheme.ts";

export default function ChartTemplatesPanel({ onExecuteDone, className }: {
    onExecuteDone: (resolvedTpl: ResolvedCharReqTemplate) => void
    className?: string | undefined
}) {


    const dispatch = useAppDispatch();
    const {theme} = useTheme()
    const items = useSelector(selectChartReqTemplates)

    const databasesLoaded = useSelector(selectDatabasesLoaded)
    const chartReqTemplatesLoaded = useSelector(selectChartReqTemplatesLoaded)

    const confirm = useConfirm();

    useEffect(() => {
       if(databasesLoaded && !chartReqTemplatesLoaded){
            console.log("fetchChartReqTemplates")
            dispatch(fetchChartReqTemplates({ force: false }))
        }

    }, [dispatch, databasesLoaded])

    // ---- Exec modal state ----
    const [execTpl, setExecTpl] = useState<ChartReqTemplateDto | null>(null)

    const hasParams = useMemo(() => {
        if (!execTpl) return false
        return extractAllKeysFromTemplate(execTpl).length > 0 || execTpl.from == undefined || execTpl.to == undefined
    }, [execTpl])


    const handleDelete = async (id: string) => {

        const ok = await confirm({
            title: 'Удалить шаблон?',
            description: 'Действие необратимо.',
            confirmText: 'Удалить',
            cancelText: 'Отмена',
            danger: true,
        });
        if (ok) {
            dispatch(deleteChartReqTemplate({ id }))
        }


    }

    const handleExecute = (tpl: ChartReqTemplateDto) => {

        // Если ключей нет — сразу вернуть «разрешённый» шаблон (без изменений)v
        if (extractAllKeysFromTemplate(tpl).length == 0 && tpl.from != undefined && tpl.to != undefined) {
            onExecuteDone({...tpl} as ResolvedCharReqTemplate)
        } else {
            setExecTpl(tpl)
        }
    }


    const handleSubmitExec = (
        result: {
            values: Record<string, unknown>,
            from: Date | undefined,
            to: Date | undefined,
        }) => {

        if (!execTpl) return

        const errors = missingRequiredParams(execTpl.params, result.values)
        if (errors.length) {
            alert(errors[0])
        }

        const resolved = resolveTemplateForServer(execTpl, result.values)

        resolved.from = result.from
        resolved.to = result.to

        onExecuteDone({...resolved} as ResolvedCharReqTemplate)
        setExecTpl(null)
    }

    const onExecuteShow = (template: ChartReqTemplateDto) => {
        alert("show template " + template.name)
        console.log(template)
    }

    return (
        <div className={`${styles.chartTemplatePanelContainer} ${className ?? ''}`} data-theme={theme}>

            <div className={styles.header}>
                <div style={{ fontWeight: 600 }}>Шаблоны</div>

            </div>

            <TemplatesList
                items={items}
                onPick={(tpl) => dispatch(applyTemplate(tpl))}
                onDelete={handleDelete}
                onExecute={handleExecute}
                onExecuteShow={onExecuteShow}
            />

            {execTpl && hasParams && (
                <ExecuteTemplateModal
                    template={execTpl}
                    onCancel={() => setExecTpl(null)}
                    onSubmit={handleSubmitExec}
                />
            )}
        </div>
    )
}
