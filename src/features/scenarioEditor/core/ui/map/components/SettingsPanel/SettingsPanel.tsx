// src/features/scenarioEditor/core/ui/map/components/SettingsPanel/SettingsPanel.tsx

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { History, X } from 'lucide-react';
import { setAutoSave, selectAutoSave } from '@scenario/core/features/saveSystem/saveSettingsSlice';
import { HistoryPanel } from '@scenario/core/ui/map/components/HistoryPanel/HistoryPanel';
import styles from './SettingsPanel.module.css';

export function SettingsPanel() {
    const dispatch = useDispatch();
    const autoSave = useSelector(selectAutoSave);
    const [historyOpen, setHistoryOpen] = useState(false);

    const handleToggle = () => {
        dispatch(setAutoSave(!autoSave));
    };

    return (
        <div className={styles.settingsPanelWrapper}>
            {/* Панель истории - выезжает слева */}
            <div className={`${styles.historyPanelSlide} ${historyOpen ? styles.historyPanelOpen : ''}`}>
                <div className={styles.historyPanelHeader}>
                    <h3>История</h3>
                    <button className={styles.historyCloseButton} onClick={() => setHistoryOpen(false)}>
                        <X size={20} />
                    </button>
                </div>
                <div className={styles.historyPanelContent}>
                    <HistoryPanel />
                </div>
            </div>

            {/* Основная панель настроек */}
            <div className={styles.settingsPanel}>
                <div className={styles.header}>
                    <h3>Настройки</h3>
                </div>

                <div className={styles.content}>
                {/* Настройки сохранения */}
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>Сохранение</h4>

                    <label className={styles.option}>
                        <input
                            type="checkbox"
                            checked={autoSave}
                            onChange={handleToggle}
                            className={styles.checkbox}
                        />
                        <div className={styles.optionText}>
                            <div className={styles.optionTitle}>Автосохранение</div>
                            <div className={styles.optionDescription}>
                                Изменения будут автоматически сохраняться через 3 секунды после последнего действия
                            </div>
                        </div>
                    </label>

                    <label className={styles.option}>
                        <input
                            type="checkbox"
                            checked={!autoSave}
                            onChange={handleToggle}
                            className={styles.checkbox}
                        />
                        <div className={styles.optionText}>
                            <div className={styles.optionTitle}>Ручное сохранение</div>
                            <div className={styles.optionDescription}>
                                Вы будете сохранять изменения вручную через кнопку "Сохранить"
                            </div>
                        </div>
                    </label>
                </div>

                {/* Кнопка истории */}
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>Дополнительно</h4>

                    <button
                        className={styles.historyButton}
                        onClick={() => setHistoryOpen(!historyOpen)}
                    >
                        <History size={18} />
                        <div className={styles.historyButtonText}>
                            <div className={styles.historyButtonTitle}>История изменений</div>
                            <div className={styles.historyButtonDescription}>
                                Просмотр и управление историей операций
                            </div>
                        </div>
                    </button>
                </div>
                </div>
            </div>
        </div>
    );
}
