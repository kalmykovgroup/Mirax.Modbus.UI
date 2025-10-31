// src/features/scenarioEditor/core/ui/map/components/SaveSettingsButton/SaveSettingsModal.tsx

import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { setAutoSave, selectAutoSave } from '@scenario/core/features/saveSystem/saveSettingsSlice.ts';
import styles from './SaveSettingsModal.module.css';

interface SaveSettingsModalProps {
    onClose: () => void;
}

export function SaveSettingsModal({ onClose }: SaveSettingsModalProps) {
    const dispatch = useDispatch();
    const autoSave = useSelector(selectAutoSave);

    const handleToggle = () => {
        dispatch(setAutoSave(!autoSave));
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>Настройки сохранения</h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
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

                <div className={styles.footer}>
                    <button className={styles.doneButton} onClick={onClose}>
                        Готово
                    </button>
                </div>
            </div>
        </div>
    );
}
