import React from 'react';
import EdgePathType, { EdgePathTypeMeta } from '@scenario/core/types/EdgePathType';
import styles from './EdgePathTypeSelector.module.css';

interface EdgePathTypeSelectorProps {
    value?: EdgePathType | undefined;
    onChange: (pathType: EdgePathType) => void;
    label?: string | undefined;
    disabled?: boolean | undefined;
}

/**
 * Компонент для выбора типа визуального пути связи
 */
export const EdgePathTypeSelector: React.FC<EdgePathTypeSelectorProps> = ({
    value,
    onChange,
    label = 'Тип линии',
    disabled = false,
}) => {
    const pathTypes = Object.values(EdgePathType);

    return (
        <div className={styles.container}>
            {label && <label className={styles.label}>{label}</label>}

            <div className={styles.optionsGrid}>
                {pathTypes.map((pathType) => {
                    const meta = EdgePathTypeMeta[pathType];
                    if (!meta) {
                        console.warn(`[EdgePathTypeSelector] No metadata for pathType: ${pathType}`);
                        return null;
                    }

                    const isSelected = value === pathType;

                    return (
                        <button
                            key={pathType}
                            type="button"
                            className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                            onClick={() => onChange(pathType)}
                            disabled={disabled}
                            title={meta.description}
                        >
                            <span className={styles.icon}>{meta.icon}</span>
                            <span className={styles.optionLabel}>{meta.label}</span>
                        </button>
                    );
                })}
            </div>

            {value && EdgePathTypeMeta[value] && (
                <div className={styles.description}>
                    {EdgePathTypeMeta[value].description}
                </div>
            )}
        </div>
    );
};
