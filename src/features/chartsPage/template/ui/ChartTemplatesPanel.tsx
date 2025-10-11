// src/features/chartsPage/template/ui/ChartTemplatesPanel.tsx

import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks.ts';
import { useConfirm } from '@ui/components/ConfirmProvider/ConfirmProvider.tsx';
import { useTheme } from '@app/providers/theme/useTheme.ts';
import type { ResolvedCharReqTemplate } from '@chartsPage/template/shared/dtos/ResolvedCharReqTemplate.ts';
import {
    applyTemplate,
    deleteChartReqTemplate,
    fetchChartReqTemplates,
    selectChartReqTemplates,
    selectChartReqTemplatesLoaded,
} from '@chartsPage/template/store/chartsTemplatesSlice.ts';
import {
    fetchDatabases,
    selectChartsMetaLoading,
    selectDatabasesLoaded,
} from '@chartsPage/metaData/store/chartsMetaSlice.ts';
import type { ChartReqTemplateDto } from '@chartsPage/template/shared/dtos/ChartReqTemplateDto.ts';
import { setResolvedCharReqTemplate } from '@chartsPage/charts/core/store/chartsSlice.ts';
import type { TimeRangeBounds } from '@chartsPage/charts/core/store/types/chart.types.ts';


import TemplatesList from './TemplatesList/TemplatesList.tsx';
import ExecuteTemplateModal from './ExecuteTemplateModal/ExecuteTemplateModal.tsx';
import {
    extractAllKeysFromTemplate,
    resolveTemplateForServer,
    missingRequiredParams,
} from './templateResolve';

import styles from './ChartTemplatesPanel.module.css';
import {
    addContextToTab, createTab,
    selectActiveTabId,
    selectAllTabIds,
    setActiveContext, setActiveTab
} from "@chartsPage/charts/core/store/tabsSlice.ts";
import {Guid} from "@app/lib/types/Guid.ts";

export default function ChartTemplatesPanel() {
    const dispatch = useAppDispatch();
    const { theme } = useTheme();
    const items = useSelector(selectChartReqTemplates);

    const databasesLoaded = useSelector(selectDatabasesLoaded);
    const databasesLoading = useSelector(selectChartsMetaLoading).databases;
    const chartReqTemplatesLoaded = useSelector(selectChartReqTemplatesLoaded);

    const activeTabId = useSelector(selectActiveTabId);
    const allTabIds = useSelector(selectAllTabIds);

    const confirm = useConfirm();

    // Инициация загрузки баз данных
    useEffect(() => {
        if (!databasesLoaded && !databasesLoading) {
            dispatch(fetchDatabases({ force: false }));
        }
    }, [dispatch, databasesLoaded, databasesLoading]);

    // Инициация загрузки шаблонов
    useEffect(() => {
        if (databasesLoaded && !chartReqTemplatesLoaded) {
            dispatch(fetchChartReqTemplates({ force: false }));
        }
    }, [dispatch, databasesLoaded, chartReqTemplatesLoaded]);

    // Exec modal state
    const [execTpl, setExecTpl] = useState<ChartReqTemplateDto | null>(null);

    const hasParams = useMemo(() => {
        if (!execTpl) return false;
        return (
            extractAllKeysFromTemplate(execTpl).length > 0 ||
            execTpl.originalFromMs === undefined ||
            execTpl.originalToMs === undefined
        );
    }, [execTpl]);

    // Пользователь нажал "Удалить шаблон"
    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: 'Удалить шаблон?',
            description: 'Действие необратимо.',
            confirmText: 'Удалить',
            cancelText: 'Отмена',
            danger: true,
        });
        if (ok) {
            dispatch(deleteChartReqTemplate({ id }));
        }
    };

    // Этот метод вызывается когда пользователь нажал выполнить шаблон
    const handleExecute = (tpl: ChartReqTemplateDto) => {
        // Если ключей нет — сразу выполнить
        if (
            extractAllKeysFromTemplate(tpl).length === 0 &&
            tpl.originalFromMs !== undefined &&
            tpl.originalToMs !== undefined
        ) {
            executeTemplate(tpl as ResolvedCharReqTemplate);
        } else {
            // Требуется заполнить данными
            setExecTpl(tpl);
        }
    };

    // Выполнение шаблона после заполнения параметров
    const handleSubmitExec = (result: { values: Record<string, unknown>; range: TimeRangeBounds }) => {
        if (!execTpl) return;

        const errors = missingRequiredParams(execTpl.params, result.values);
        if (errors.length) {
            alert(errors[0]);
            return;
        }

        const tmpl: ChartReqTemplateDto = resolveTemplateForServer(execTpl, result.values);

        const resolved = {
            ...tmpl,
            resolvedFromMs: result.range.fromMs,
            resolvedToMs: result.range.toMs,
        } as ResolvedCharReqTemplate;

        executeTemplate(resolved);
        setExecTpl(null);
    };

    // НОВАЯ ЛОГИКА: Создание контекста + добавление в вкладку
    const executeTemplate = (resolved: ResolvedCharReqTemplate) => {
        const contextId = resolved.id; // ID шаблона = ID контекста

        // 1. Создать контекст в contextsSlice
        dispatch(setResolvedCharReqTemplate(resolved));

        // 2. Определить целевую вкладку
        let targetTabId = activeTabId;

        if (!targetTabId) {
            // Создать новую вкладку если нет активной
            targetTabId = Guid.NewGuid();
            dispatch(
                createTab({
                    id: targetTabId,
                    name: `Вкладка ${allTabIds.length + 1}`,
                })
            );
            dispatch(setActiveTab(targetTabId));
        }

        // 3. Добавить контекст в вкладку
        dispatch(addContextToTab({ tabId: targetTabId, contextId }));
        dispatch(setActiveContext({ tabId: targetTabId, contextId }));

        console.log('[ChartTemplatesPanel] Template executed:', {
            templateId: resolved.id,
            contextId,
            tabId: targetTabId,
        });
    };

    const onExecuteShow = (template: ChartReqTemplateDto) => {
        alert('show template ' + template.name);
        console.log(template);
    };

    return (
        <div className={styles.chartTemplatePanelContainer} data-theme={theme}>
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
    );
}