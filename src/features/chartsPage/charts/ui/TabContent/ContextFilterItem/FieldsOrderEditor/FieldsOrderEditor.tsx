// src/features/chartsPage/charts/ui/TabContent/ContextFilterItem/FieldsOrderEditor/FieldsOrderEditor.tsx

import { useMemo } from 'react';
import type { FieldDto } from '@chartsPage/metaData/shared/dtos/FieldDto.ts';
import styles from './FieldsOrderEditor.module.css';

interface FieldsOrderEditorProps {
    readonly fields: readonly FieldDto[];
    readonly onReorder: (reorderedFields: readonly FieldDto[]) => void;
}

export function FieldsOrderEditor({ fields }: FieldsOrderEditorProps) {
    // Сортируем по visualOrder
    const sortedFields = useMemo(() => {
        return [...fields]
            .map((field, index) => ({
                ...field,
                visualOrder: field.visualOrder ?? index,
            }))
            .sort((a, b) => a.visualOrder - b.visualOrder);
    }, [fields]);

    if (sortedFields.length === 0) {
        return <div className={styles.empty}>Нет полей</div>;
    }

    return (
        <div className={styles.fieldsOrderEditor}>
            <div className={styles.header}>
                <span className={styles.title}>Порядок отображения полей:</span>
            </div>

            <div className={styles.fieldList}>
                {sortedFields.map((field) => (
                    <div key={field.name} className={styles.fieldItem}>
                        <span className={styles.fieldName} title={field.name}>
                            {field.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}