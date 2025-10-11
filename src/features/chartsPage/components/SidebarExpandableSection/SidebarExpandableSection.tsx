// src/features/chartsPage/components/SidebarExpandableSection/SidebarExpandableSection.tsx
import { useState, useCallback, type JSX, type ReactNode } from 'react';
import styles from './SidebarExpandableSection.module.css';

interface Props {
    readonly title: string;
    readonly children: ReactNode;
    readonly defaultExpanded?: boolean;
}

/**
 * Раскрывающаяся секция для боковой панели.
 * При раскрытии панель накладывается справа от sidebar поверх контента.
 */
export function SidebarExpandableSection({
                                             title,
                                             children,
                                             defaultExpanded = false
                                         }: Props): JSX.Element {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const handleToggle = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    const handleClose = useCallback(() => {
        setIsExpanded(false);
    }, []);

    return (
        <div className={styles.container}>
            {/* Кнопка-триггер */}
            <button
                className={`${styles.trigger} ${isExpanded ? styles.triggerActive : ''}`}
                onClick={handleToggle}
                type="button"
                aria-expanded={isExpanded}
            >
                <span className={styles.triggerTitle}>{title}</span>
                <span className={`${styles.triggerArrow} ${isExpanded ? styles.triggerArrowExpanded : ''}`}>
                    ▶
                </span>
            </button>

            {/* Раскрытая панель - накладывается справа от sidebar */}
            {isExpanded && (
                <div className={styles.expandedPanel}>
                    <div className={styles.expandedHeader}>
                        <h3 className={styles.expandedTitle}>{title}</h3>
                        <button
                            className={styles.closeButton}
                            onClick={handleClose}
                            type="button"
                            aria-label="Закрыть"
                        >
                            ✕
                        </button>
                    </div>
                    <div className={styles.expandedBody}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}