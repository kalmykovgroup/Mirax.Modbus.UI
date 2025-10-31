// src/features/scenarioEditor/core/ui/edges/shared/EdgeEditButton/EdgeEditButton.tsx

import { Edit } from 'lucide-react';
import { useState } from 'react';
import styles from './EdgeEditButton.module.css';

interface EdgeEditButtonProps {
    /** Показать ли кнопку (обычно при наведении на edge) */
    show: boolean;
    /** Координата X для позиционирования кнопки */
    x: number;
    /** Координата Y для позиционирования кнопки */
    y: number;
    /** Обработчик клика по кнопке */
    onClick: () => void;
}

/**
 * Кнопка редактирования для связей (edges).
 * Появляется по центру связи при наведении.
 */
export function EdgeEditButton({ show, x, y, onClick }: EdgeEditButtonProps) {
    const [isHovered, setIsHovered] = useState(false);

    if (!show) return null;

    return (
        <button
            type="button"
            className={`${styles.edgeEditButton} ${isHovered ? styles.hovered : ''}`}
            style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)', // Центрируем кнопку
            }}
            onClick={(e) => {
                e.stopPropagation(); // Предотвращаем всплытие события
                onClick();
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title="Редактировать связь"
        >
            <Edit size={14} />
        </button>
    );
}
