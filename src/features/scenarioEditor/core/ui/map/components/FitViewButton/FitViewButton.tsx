// src/features/scenarioEditor/core/ui/map/components/FitViewButton/FitViewButton.tsx

import { useReactFlow } from '@xyflow/react';
import { Maximize2 } from 'lucide-react';
import styles from './FitViewButton.module.css';

/**
 * Кнопка для центрирования и масштабирования видимой области
 * для отображения всех узлов на экране
 */
export function FitViewButton() {
    const { fitView } = useReactFlow();

    const handleFitView = () => {
        fitView({
            padding: 0.2, // 20% отступ от краёв
            duration: 300, // Плавная анимация 300мс
            minZoom: 0.1,
            maxZoom: 2,
        });
    };

    return (
        <button
            className={styles.fitViewButton}
            onClick={handleFitView}
            title="Показать все элементы"
            aria-label="Показать все элементы на карте"
        >
            <Maximize2 size={18} />
        </button>
    );
}
