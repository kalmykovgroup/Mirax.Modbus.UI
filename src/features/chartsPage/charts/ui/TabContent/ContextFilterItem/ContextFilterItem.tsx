// src/features/chartsPage/charts/ui/TabContent/ContextFilterItem/ContextFilterItem.tsx

import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/baseStore/hooks.ts';
import type { Guid } from '@app/lib/types/Guid';
import { selectTemplateById, updateChartReqTemplate } from '@chartsPage/template/store/chartsTemplatesSlice';
import type { UpdateChartReqTemplateRequest } from '@chartsPage/template/shared/dtos/requests/UpdateChartReqTemplateRequest';
import type { FieldDto } from '@chartsPage/metaData/shared/dtos/FieldDto';
import styles from './ContextFilterItem.module.css';
import { FieldsOrderEditor } from './FieldsOrderEditor/FieldsOrderEditor';
import type {ResolvedCharReqTemplate} from "@chartsPage/template/shared/dtos/ResolvedCharReqTemplate.ts";
import type {ChartReqTemplateDto} from "@chartsPage/template/shared/dtos/ChartReqTemplateDto.ts";
import {useSelector} from "react-redux";
import {selectTemplate} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import type {RootState} from "@/baseStore/store.ts";

interface ContextFilterItemProps {
    readonly tabId: Guid;
    readonly contextId: Guid;
    readonly isVisible: boolean;
    readonly onToggle: () => void;
    readonly onRemove: () => void;
}

export function ContextFilterItem({
                                      contextId,
                                      isVisible,
                                      onToggle,
                                      onRemove,
                                  }: ContextFilterItemProps) {
    const dispatch = useAppDispatch();

    const resolvedTemplate: ResolvedCharReqTemplate | undefined = useSelector((state: RootState) =>
        selectTemplate(state, contextId)
    );

    const templateById = useAppSelector(selectTemplateById);
    const template: ChartReqTemplateDto | undefined = resolvedTemplate?.id != undefined ? templateById[resolvedTemplate.id] : undefined;

    const [fieldsExpanded, setFieldsExpanded] = useState(false);

    const templateName = template?.name ?? `Контекст ${contextId.slice(0, 8)}`;
    const hasFields = template?.selectedFields && template.selectedFields.length > 0;

    // Обработчик изменения порядка полей
    const handleFieldsReorder = useCallback(
        (reorderedFields: readonly FieldDto[]) => {
            if (!template) return;

            const updateRequest: UpdateChartReqTemplateRequest = {
                id: template.id,
                name: template.name,
                description: template.description,
                databaseId: template.databaseId,
                entity: template.entity,
                timeField: template.timeField,
                selectedFields: [...reorderedFields],
                where: template.where,
                params: template.params,
                sql: template.sql,
                originalFromMs: template.originalFromMs,
                originalToMs: template.originalToMs,
                visualOrder: template.visualOrder ?? 0,
            };

            void dispatch(updateChartReqTemplate(updateRequest));
        },
        [dispatch, template]
    );

    return (
        <div className={styles.contextFilterItem}>
            <div className={styles.itemHeader}>
                {/* Чекбокс видимости */}
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={onToggle}
                        className={styles.checkbox}
                    />
                    <span className={styles.templateName}>{templateName}</span>
                </label>

                <div className={styles.actions}>
                    {/* Кнопка управления полями */}
                    {hasFields && (
                        <button
                            className={`${styles.fieldsToggle} ${
                                fieldsExpanded ? styles.fieldsToggleActive : ''
                            }`}
                            onClick={() => setFieldsExpanded(!fieldsExpanded)}
                            title={
                                fieldsExpanded
                                    ? 'Скрыть порядок полей'
                                    : 'Настроить порядок полей'
                            }
                            type="button"
                        >
                            ⚙
                        </button>
                    )}

                    {/* Кнопка удаления */}
                    <button
                        className={styles.removeButton}
                        onClick={onRemove}
                        title="Удалить из вкладки"
                        type="button"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Редактор порядка полей */}
            {fieldsExpanded && hasFields && template && (
                <FieldsOrderEditor
                    fields={template.selectedFields}
                    onReorder={handleFieldsReorder}
                />
            )}
        </div>
    );
}