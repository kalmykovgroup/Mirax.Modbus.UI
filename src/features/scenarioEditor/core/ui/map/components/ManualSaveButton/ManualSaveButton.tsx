// src/features/scenarioEditor/core/ui/map/components/ManualSaveButton/ManualSaveButton.tsx

import { Save } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { Guid } from '@app/lib/types/Guid';
import { useSaveScenario } from '@scenario/core/features/saveSystem/useSaveScenario';
import { selectAutoSave } from '@scenario/core/features/saveSystem/saveSettingsSlice';
import styles from './ManualSaveButton.module.css';

interface ManualSaveButtonProps {
    scenarioId: Guid | null;
}

export function ManualSaveButton({ scenarioId }: ManualSaveButtonProps) {
    const autoSave = useSelector(selectAutoSave);
    const { save, canSave, isSaving } = useSaveScenario(scenarioId);

    // Не показываем кнопку если включено автосохранение
    if (autoSave) {
        return null;
    }

    return (
        <button
            className={styles.button}
            onClick={save}
            disabled={!canSave || isSaving}
            title={
                !canSave
                    ? 'Нет несохранённых изменений'
                    : isSaving
                    ? 'Сохранение...'
                    : 'Сохранить изменения (Ctrl+S)'
            }
        >
            <Save size={18} />
            <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
        </button>
    );
}
