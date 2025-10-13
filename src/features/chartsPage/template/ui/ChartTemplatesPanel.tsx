// ========== ChartTemplatesPanel.tsx - ИСПРАВЛЕНИЕ ==========

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { useConfirm } from '@ui/components/ConfirmProvider/ConfirmProvider';
import { useTheme } from '@app/providers/theme/useTheme';
import { Guid } from '@app/lib/types/Guid';
import type { ResolvedCharReqTemplate } from '@chartsPage/template/shared/dtos/ResolvedCharReqTemplate';
import type { ChartReqTemplateDto } from '@chartsPage/template/shared/dtos/ChartReqTemplateDto';
import type { TimeRangeBounds } from '@chartsPage/charts/core/store/types/chart.types';

import {
    deleteChartReqTemplate,
    fetchChartReqTemplates,
    selectChartReqTemplates,
    selectChartReqTemplatesLoaded,
    setActiveTemplate,
} from '@chartsPage/template/store/chartsTemplatesSlice';
import {
    fetchDatabases,
    selectChartsMetaLoading,
    selectDatabasesLoaded,
} from '@chartsPage/metaData/store/chartsMetaSlice';
import { createContext } from '@chartsPage/charts/core/store/chartsSlice';
import {
    addContextToTab,
    createTab,
    selectAllTabIds,
    setActiveTab,
} from '@chartsPage/charts/core/store/tabsSlice';

import TemplatesList from './TemplatesList/TemplatesList';
import ExecuteTemplateModal from './ExecuteTemplateModal/ExecuteTemplateModal';

import {
    extractAllKeysFromTemplate,
    resolveTemplateForServer,
    missingRequiredParams,
} from './templateResolve';

import styles from './ChartTemplatesPanel.module.css';
import { SelectTabModal } from '@chartsPage/charts/ui/SelectTabModal/SelectTabModal';
import {DataSourcePanel} from "@chartsPage/metaData/ui/DataSourcePanel.tsx";

export default function ChartTemplatesPanel() {
    const dispatch = useAppDispatch();
    const { theme } = useTheme();
    const confirm = useConfirm();

    const items = useSelector(selectChartReqTemplates);
    const databasesLoaded = useSelector(selectDatabasesLoaded);
    const databasesLoading = useSelector(selectChartsMetaLoading).databases;
    const chartReqTemplatesLoaded = useSelector(selectChartReqTemplatesLoaded);
    const allTabIds = useSelector(selectAllTabIds);

    const [execTpl, setExecTpl] = useState<ChartReqTemplateDto | null>(null);
    const [selectTabTpl, setSelectTabTpl] = useState<ResolvedCharReqTemplate | null>(null);

    //  КРИТИЧНО: Защита от двойных кликов
    const isProcessingRef = useRef(false);

    const hasParams = useMemo(() => {
        if (!execTpl) return false;
        return extractAllKeysFromTemplate(execTpl).length > 0;
    }, [execTpl]);

    useEffect(() => {
        if (!databasesLoaded && !databasesLoading) {
            dispatch(fetchDatabases());
        }
    }, [dispatch, databasesLoaded, databasesLoading]);

    useEffect(() => {
        if (!chartReqTemplatesLoaded) {
            dispatch(fetchChartReqTemplates({ force: false }));
        }
    }, [dispatch, chartReqTemplatesLoaded]);

    const handleDelete = async (id: string): Promise<void> => {
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

    const onPick = (tpl: ChartReqTemplateDto) => {
        console.log('pick', tpl);
        dispatch(setActiveTemplate(tpl));
    };

    const handleExecute = (tpl: ChartReqTemplateDto) => {
        if (
            extractAllKeysFromTemplate(tpl).length === 0 &&
            tpl.originalFromMs !== undefined &&
            tpl.originalToMs !== undefined
        ) {
            const resolved = tpl as ResolvedCharReqTemplate;
            handleTemplateResolved(resolved);
        } else {
            setExecTpl(tpl);
        }
    };

    const handleSubmitExec = (result: {
        values: Record<string, unknown>;
        range: TimeRangeBounds;
    }) => {
        if (!execTpl) return;

        const errors = missingRequiredParams(execTpl.params, result.values);
        if (errors.length > 0) {
            alert(errors[0]);
            return;
        }

        const tmpl: ChartReqTemplateDto = resolveTemplateForServer(execTpl, result.values);

        const resolved: ResolvedCharReqTemplate = {
            ...tmpl,
            resolvedFromMs: result.range.fromMs,
            resolvedToMs: result.range.toMs,
        } as ResolvedCharReqTemplate;

        handleTemplateResolved(resolved);
        setExecTpl(null);
    };

    const handleTemplateResolved = (resolved: ResolvedCharReqTemplate) => {
        if (allTabIds.length === 0) {
            executeTemplateInNewTab(resolved);
        } else {
            setSelectTabTpl(resolved);
        }
    };

    /**
     *  ИСПРАВЛЕНИЕ: Добавлена защита от повторного вызова
     */
    const executeTemplateInNewTab = (resolved: ResolvedCharReqTemplate) => {
        //  Проверка: уже обрабатывается
        if (isProcessingRef.current) {
            console.warn('[ChartTemplatesPanel] Already processing, skipping');
            return;
        }

        isProcessingRef.current = true;

        try {
            const contextId = Guid.NewGuid();

            console.log('[ChartTemplatesPanel] Creating context:', contextId);

            dispatch(
                createContext({
                    contextId,
                    template: resolved,
                })
            );

            const newTabId = Guid.NewGuid();
            dispatch(
                createTab({
                    id: newTabId,
                    name: `Вкладка ${allTabIds.length + 1}`,
                })
            );
            dispatch(setActiveTab(newTabId));

            dispatch(addContextToTab({ tabId: newTabId, contextId }));

            console.log('[ChartTemplatesPanel] Created new tab:', {
                templateId: resolved.id,
                templateName: resolved.name,
                contextId,
                tabId: newTabId,
            });
        } finally {
            //  Сбрасываем флаг через небольшой таймаут
            setTimeout(() => {
                isProcessingRef.current = false;
            }, 300);
        }
    };

    /**
     *  ИСПРАВЛЕНИЕ: Добавлена защита от повторного вызова
     */
    const executeTemplateInExistingTab = (resolved: ResolvedCharReqTemplate, tabId: Guid) => {
        //  Проверка: уже обрабатывается
        if (isProcessingRef.current) {
            console.warn('[ChartTemplatesPanel] Already processing, skipping');
            return;
        }

        isProcessingRef.current = true;

        try {
            const contextId = Guid.NewGuid();

            console.log('[ChartTemplatesPanel] Creating context:', contextId);

            dispatch(
                createContext({
                    contextId,
                    template: resolved,
                })
            );

            dispatch(addContextToTab({ tabId, contextId }));
            dispatch(setActiveTab(tabId));

            console.log('[ChartTemplatesPanel] Added to existing tab:', {
                templateId: resolved.id,
                templateName: resolved.name,
                contextId,
                tabId,
            });
        } finally {
            setTimeout(() => {
                isProcessingRef.current = false;
            }, 300);
        }
    };

    const onExecuteShow = (template: ChartReqTemplateDto) => {
        console.group(`📋 Template Details: ${template.name}`);
        console.log(template);
        console.groupEnd();
    };

    return (
        <div className={styles.chartTemplatePanelContainer} data-theme={theme}>

            <div className={styles.templates}>
                <TemplatesList
                    items={items}
                    onPick={onPick}
                    onDelete={handleDelete}
                    onExecute={handleExecute}
                    onExecuteShow={onExecuteShow}
                />
            </div>
            <div className={styles.dataSourcePanel}>
                <DataSourcePanel />
            </div>




            {execTpl && hasParams && (
                <ExecuteTemplateModal
                    template={execTpl}
                    onCancel={() => setExecTpl(null)}
                    onSubmit={handleSubmitExec}
                />
            )}

            {selectTabTpl && (
                <SelectTabModal
                    onSelectExisting={(tabId) => {
                        executeTemplateInExistingTab(selectTabTpl, tabId);
                        setSelectTabTpl(null);
                    }}
                    onCreateNew={() => {
                        executeTemplateInNewTab(selectTabTpl);
                        setSelectTabTpl(null);
                    }}
                    onCancel={() => setSelectTabTpl(null)}
                />
            )}
        </div>
    );
}