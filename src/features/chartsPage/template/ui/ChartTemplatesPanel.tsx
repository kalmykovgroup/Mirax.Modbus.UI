// src/features/chartsPage/template/ui/ChartTemplatesPanel.tsx

import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks.ts';
import { useConfirm } from '@ui/components/ConfirmProvider/ConfirmProvider.tsx';
import { useTheme } from '@app/providers/theme/useTheme.ts';
import { Guid } from '@app/lib/types/Guid.ts';
import type { ResolvedCharReqTemplate } from '@chartsPage/template/shared/dtos/ResolvedCharReqTemplate.ts';
import type { ChartReqTemplateDto } from '@chartsPage/template/shared/dtos/ChartReqTemplateDto.ts';
import type { TimeRangeBounds } from '@chartsPage/charts/core/store/types/chart.types.ts';

// Store
import {
    deleteChartReqTemplate,
    fetchChartReqTemplates,
    selectChartReqTemplates,
    selectChartReqTemplatesLoaded, setActiveTemplate,
} from '@chartsPage/template/store/chartsTemplatesSlice.ts';
import {
    fetchDatabases,
    selectChartsMetaLoading,
    selectDatabasesLoaded,
} from '@chartsPage/metaData/store/chartsMetaSlice.ts';
import { createContext } from '@chartsPage/charts/core/store/chartsSlice.ts'; // ← Используем createContext
import {
    addContextToTab,
    createTab,
    selectAllTabIds,
    setActiveTab,
} from '@chartsPage/charts/core/store/tabsSlice.ts';

// UI
import TemplatesList from './TemplatesList/TemplatesList.tsx';
import ExecuteTemplateModal from './ExecuteTemplateModal/ExecuteTemplateModal.tsx';

// Utils
import {
    extractAllKeysFromTemplate,
    resolveTemplateForServer,
    missingRequiredParams,
} from './templateResolve';

import styles from './ChartTemplatesPanel.module.css';
import {SelectTabModal} from "@chartsPage/charts/ui/SelectTabModal/SelectTabModal.tsx";


export default function ChartTemplatesPanel() {
    const dispatch = useAppDispatch();
    const { theme } = useTheme();
    const confirm = useConfirm();

    // Селекторы
    const items = useSelector(selectChartReqTemplates);
    const databasesLoaded = useSelector(selectDatabasesLoaded);
    const databasesLoading = useSelector(selectChartsMetaLoading).databases;
    const chartReqTemplatesLoaded = useSelector(selectChartReqTemplatesLoaded);
    const allTabIds = useSelector(selectAllTabIds);

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

    // Состояние модального окна выполнения
    const [execTpl, setExecTpl] = useState<ChartReqTemplateDto | null>(null);

    // Состояние модального окна выбора вкладки
    const [selectTabTpl, setSelectTabTpl] = useState<ResolvedCharReqTemplate | null>(null);

    const hasParams = useMemo(() => {
        if (!execTpl) return false;
        return (
            extractAllKeysFromTemplate(execTpl).length > 0 ||
            execTpl.originalFromMs === undefined ||
            execTpl.originalToMs === undefined
        );
    }, [execTpl]);

    // ========== ОБРАБОТЧИКИ ==========

    /**
     * Удаление шаблона
     */
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

    const onPick = (tpl: ChartReqTemplateDto) => {
        console.log('pick', tpl);
        dispatch(setActiveTemplate(tpl))
    }

    /**
     * Запуск выполнения шаблона
     */
    const handleExecute = (tpl: ChartReqTemplateDto) => {
        // Если параметров нет - выполняем сразу
        if (
            extractAllKeysFromTemplate(tpl).length === 0 &&
            tpl.originalFromMs !== undefined &&
            tpl.originalToMs !== undefined
        ) {
            const resolved = tpl as ResolvedCharReqTemplate;
            handleTemplateResolved(resolved);
        } else {
            // Открываем модалку для заполнения параметров
            setExecTpl(tpl);
        }
    };

    /**
     * Подтверждение выполнения шаблона с параметрами
     */
    const handleSubmitExec = (result: {
        values: Record<string, unknown>;
        range: TimeRangeBounds;
    }) => {
        if (!execTpl) return;

        // Валидация обязательных параметров
        const errors = missingRequiredParams(execTpl.params, result.values);
        if (errors.length > 0) {
            alert(errors[0]);
            return;
        }

        // Резолвинг шаблона с параметрами
        const tmpl: ChartReqTemplateDto = resolveTemplateForServer(execTpl, result.values);

        const resolved: ResolvedCharReqTemplate = {
            ...tmpl,
            resolvedFromMs: result.range.fromMs,
            resolvedToMs: result.range.toMs,
        } as ResolvedCharReqTemplate;

        handleTemplateResolved(resolved);
        setExecTpl(null);
    };

    /**
     * Обработка резолвнутого шаблона:
     * - Если нет открытых вкладок → создать новую
     * - Если есть вкладки → показать выбор
     */
    const handleTemplateResolved = (resolved: ResolvedCharReqTemplate) => {
        if (allTabIds.length === 0) {
            // Нет открытых вкладок - создаём новую сразу
            executeTemplateInNewTab(resolved);
        } else {
            // Есть вкладки - показываем модалку выбора
            setSelectTabTpl(resolved);
        }
    };

    /**
     * Создание новой вкладки и добавление в неё контекста
     */
    const executeTemplateInNewTab = (resolved: ResolvedCharReqTemplate) => {
        // 1. Генерировать уникальный contextId
        const contextId = Guid.NewGuid();

        // 2. Создать контекст в chartsSlice
        dispatch(
            createContext({
                contextId,
                template: resolved,
            })
        );

        // 3. Создать новую вкладку
        const newTabId = Guid.NewGuid();
        dispatch(
            createTab({
                id: newTabId,
                name: `Вкладка ${allTabIds.length + 1}`,
            })
        );
        dispatch(setActiveTab(newTabId));

        // 4. Добавить контекст в вкладку
        dispatch(addContextToTab({ tabId: newTabId, contextId }));

        console.log('[ChartTemplatesPanel] Created new tab:', {
            templateId: resolved.id,
            templateName: resolved.name,
            contextId,
            tabId: newTabId,
        });
    };

    /**
     * Добавление контекста в существующую вкладку
     */
    const executeTemplateInExistingTab = (resolved: ResolvedCharReqTemplate, tabId: Guid) => {
        // 1. Генерировать уникальный contextId
        const contextId = Guid.NewGuid();

        // 2. Создать контекст в chartsSlice
        dispatch(
            createContext({
                contextId,
                template: resolved,
            })
        );

        // 3. Добавить контекст в выбранную вкладку
        dispatch(addContextToTab({ tabId, contextId }));

        // 4. Активировать вкладку
        dispatch(setActiveTab(tabId));

        console.log('[ChartTemplatesPanel] Added to existing tab:', {
            templateId: resolved.id,
            templateName: resolved.name,
            contextId,
            tabId,
        });
    };

    /**
     * Показать детали шаблона (debug)
     */
    const onExecuteShow = (template: ChartReqTemplateDto) => {
        console.group(`📋 Template Details: ${template.name}`);
        console.log(template);
        console.groupEnd();
    };

    return (
        <div className={styles.chartTemplatePanelContainer} data-theme={theme}>
            <div className={styles.header}>
                <div style={{ fontWeight: 600 }}>Шаблоны</div>
            </div>

            <TemplatesList
                items={items}
                onPick={onPick}
                onDelete={handleDelete}
                onExecute={handleExecute}
                onExecuteShow={onExecuteShow}
            />

            {/* Модальное окно для заполнения параметров */}
            {execTpl && hasParams && (
                <ExecuteTemplateModal
                    template={execTpl}
                    onCancel={() => setExecTpl(null)}
                    onSubmit={handleSubmitExec}
                />
            )}

            {/* Модальное окно выбора вкладки */}
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