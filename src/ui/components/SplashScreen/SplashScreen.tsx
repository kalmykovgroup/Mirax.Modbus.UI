
import { Loader2 } from 'lucide-react'
import React from "react";
import styles from "./SplashScreen.module.css";

/**
 * Компонент сплэш-загрузки.
 * Используется при инициализации приложения (например, во время восстановления состояния Redux).
 */
type Props = {
    label?: string | undefined;
    /** Сделать полноэкранным перекрытием (fixed inset-0) */
    fullScreen?: boolean | undefined;
    /** Доп. класс, если нужно */
    className?: string | undefined;
    threePointOffset?: boolean | undefined;
};

const SplashScreen: React.FC<Props> = ({ label, fullScreen, className, threePointOffset }) => {
    return (
        <div
            className={[
                styles.wrap,
                fullScreen ? styles.full : '',
                className ?? '',
            ].join(' ')}
            role="status"
            aria-live="polite"
        >
            {/* иконка с локальной анимацией */}
            <Loader2 className={`${styles.icon} ${styles.spin}`} aria-hidden />
            <span className={styles.label} style={{marginLeft: threePointOffset || threePointOffset == undefined && label == undefined ? 6 : 0}} >{label ?? 'Загрузка…'}</span>
        </div>
    );
};

export default SplashScreen;