// src/features/scenarioEditor/core/ui/shared/EditButton/EditButton.tsx

import { Pencil } from 'lucide-react';
import styles from './EditButton.module.css';
import React from "react";

interface EditButtonProps {
    /** Показывать ли кнопку */
    visible: boolean;
    /** Обработчик клика */
    onClick: (e: React.MouseEvent) => void;
    /** Опциональный title для подсказки */
    title?: string;
    /** Позиция кнопки: 'absolute' для нод, 'fixed' для ребер */
    position?: 'absolute' | 'fixed';
    /** Координата X (только для position='fixed') */
    x?: number;
    /** Координата Y (только для position='fixed') */
    y?: number;
    /** CSS класс для дополнительной кастомизации позиционирования */
    className?: string;
}

/**
 * Универсальная круглая кнопка редактирования.
 * Может использоваться как для нод (absolute позиционирование), так и для ребер (fixed позиционирование).
 */
export function EditButton({
    visible,
    onClick,
    title = 'Редактировать',
    position = 'absolute',
    x,
    y,
    className
}: EditButtonProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(e);
    };

    if (!visible) return null;

    const positionStyle = position === 'fixed' && x !== undefined && y !== undefined
        ? {
            position: 'absolute' as const,
            left: `${x}px`,
            top: `${y}px`,
            transform: 'translate(-50%, -50%)',
        }
        : {};

    return (
        <button
            className={`${styles.button} ${className || ''}`}
            onClick={handleClick}
            title={title}
            style={positionStyle}
        >
            <Pencil size={14} />
        </button>
    );
}