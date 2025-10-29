// src/features/scenarioEditor/core/features/fieldLockSystem/Block.tsx

import React, { type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useFieldGroup } from './useFieldGroup';
import styles from './Block.module.css';

interface BlockProps {
    /** Уникальный идентификатор группы */
    group: string;
    /** Отображаемое название группы */
    label: string;
    /** Описание группы (опционально) */
    description?: string;
    /** Дочерние элементы (input, select и т.д.) */
    children: ReactNode;
    /** Дополнительный CSS класс */
    className?: string;
    /** Режим отображения: 'wrap' (обертка с рамкой) или 'inline' (без рамки) */
    mode?: 'wrap' | 'inline';
    /** Показывать иконку замка при блокировке */
    showLockIcon?: boolean;
}

/**
 * Компонент для управления блокировкой и видимостью полей редактирования
 *
 * @example
 * ```tsx
 * <Block group="nodeBasicInfo" label="Основная информация">
 *   <input type="text" />
 * </Block>
 * ```
 */
export function Block({
    group,
    label,
    description,
    children,
    className = '',
    mode = 'wrap',
    showLockIcon = true,
}: BlockProps) {
    const { isLocked, isHidden } = useFieldGroup({ groupId: group, label, description });

    // Если группа скрыта, ничего не рендерим
    if (isHidden) {
        return null;
    }

    const content = (
        <div
            className={`${styles.blockContent} ${isLocked ? styles.locked : ''}`}
            data-locked={isLocked}
            data-group={group}
        >
            {children}
            {isLocked && showLockIcon && (
                <div className={styles.lockOverlay}>
                    <Lock size={16} className={styles.lockIcon} />
                </div>
            )}
        </div>
    );

    if (mode === 'inline') {
        return (
            <div className={`${styles.blockInline} ${className}`}>
                {content}
            </div>
        );
    }

    return (
        <div className={`${styles.blockWrap} ${className}`}>
            {label && (
                <div className={styles.blockHeader}>
                    <span className={styles.blockLabel}>{label}</span>
                    {isLocked && showLockIcon && <Lock size={14} className={styles.headerLockIcon} />}
                </div>
            )}
            {description && <div className={styles.blockDescription}>{description}</div>}
            {content}
        </div>
    );
}
