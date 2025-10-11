// src/features/chartsPage/template/ui/SelectTabModal/SelectTabModal.tsx

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectAllTabs } from '@chartsPage/charts/core/store/tabsSlice';
import type { Guid } from '@app/lib/types/Guid';
import styles from './SelectTabModal.module.css';

interface SelectTabModalProps {
    readonly onSelectExisting: (tabId: Guid) => void;
    readonly onCreateNew: () => void;
    readonly onCancel: () => void;
}

export function SelectTabModal({ onSelectExisting, onCreateNew, onCancel }: SelectTabModalProps) {
    const tabs = useSelector(selectAllTabs);

    // Закрытие по ESC + блокировка скролла
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onCancel]);

    return (
        <div className={styles.backdrop} onClick={onCancel} role="dialog" aria-modal="true">
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>Куда добавить шаблон?</div>
                    <button
                        className={styles.btnClose}
                        onClick={onCancel}
                        aria-label="Закрыть"
                        type="button"
                    >
                        ✕
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {/* Кнопка создания новой вкладки */}
                    <button
                        className={styles.optionNew}
                        onClick={onCreateNew}
                        type="button"
                    >
                        <span className={styles.optionIcon}>+</span>
                        <div className={styles.optionContent}>
                            <div className={styles.optionTitle}>Создать новую вкладку</div>
                            <div className={styles.optionDescription}>
                                Открыть шаблон в новой пустой вкладке
                            </div>
                        </div>
                    </button>

                    {/* Разделитель */}
                    {tabs.length > 0 && (
                        <>
                            <div className={styles.divider}>
                                <span className={styles.dividerText}>или добавить в существующую</span>
                            </div>

                            {/* Список существующих вкладок */}
                            <div className={styles.tabsList}>
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        className={styles.optionTab}
                                        onClick={() => onSelectExisting(tab.id)}
                                        type="button"
                                    >
                                        <span className={styles.optionIcon}>📊</span>
                                        <div className={styles.optionContent}>
                                            <div className={styles.optionTitle}>{tab.name}</div>
                                            <div className={styles.optionDescription}>
                                                {tab.contextIds.length === 0
                                                    ? 'Пустая вкладка'
                                                    : `${tab.contextIds.length} ${
                                                        tab.contextIds.length === 1
                                                            ? 'шаблон'
                                                            : 'шаблона'
                                                    }`}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.btnCancel} onClick={onCancel} type="button">
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
}