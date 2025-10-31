// src/features/scenarioEditor/core/ui/nodes/shared/NodeEditButton/NodeEditButton.tsx

import { Pencil } from 'lucide-react';
import styles from './NodeEditButton.module.css';
import React from "react";

interface NodeEditButtonProps {
    /** Показывать ли кнопку (обычно isHovered || isSelected) */
    visible: boolean;
    /** Обработчик клика */
    onClick: (e: React.MouseEvent) => void;
    /** Опциональный title для подсказки */
    title?: string;
}

/**
 * Универсальная кнопка редактирования для нод.
 * Автоматически позиционируется в правом верхнем углу.
 * Управляет своей видимостью через opacity.
 */
export function NodeEditButton({ visible, onClick, title = 'Редактировать' }: NodeEditButtonProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(e);
    };

    return (
        <button
            className={styles.button}
            onClick={handleClick}
            title={title}
            style={{ opacity: visible ? 1 : 0 }}
        >
            <Pencil size={14} />
        </button>
    );
}
