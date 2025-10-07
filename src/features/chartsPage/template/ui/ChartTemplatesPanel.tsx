import { useEffect, useState, useMemo } from 'react'
import {  useSelector } from 'react-redux'


import styles from "./ChartTemplatesPanel.module.css"

import TemplatesList from './TemplatesList/TemplatesList.tsx'
import ExecuteTemplateModal from './ExecuteTemplateModal/ExecuteTemplateModal.tsx'
import {
    extractAllKeysFromTemplate,
    resolveTemplateForServer,
    missingRequiredParams
} from './templateResolve'
import {useAppDispatch} from "@/store/hooks.ts";
import {useConfirm} from "@ui/components/ConfirmProvider/ConfirmProvider.tsx";
import {useTheme} from "@app/providers/theme/useTheme.ts";
import type {ResolvedCharReqTemplate} from "@chartsPage/template/shared//dtos/ResolvedCharReqTemplate.ts";
import {
    applyTemplate,
    deleteChartReqTemplate,
    fetchChartReqTemplates,
    selectChartReqTemplates,
    selectChartReqTemplatesLoaded
} from "@chartsPage/template/store/chartsTemplatesSlice.ts";
import {selectDatabasesLoaded} from "@chartsPage/metaData/store/chartsMetaSlice.ts";
import type {ChartReqTemplateDto} from "@chartsPage/template/shared//dtos/ChartReqTemplateDto.ts";

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
