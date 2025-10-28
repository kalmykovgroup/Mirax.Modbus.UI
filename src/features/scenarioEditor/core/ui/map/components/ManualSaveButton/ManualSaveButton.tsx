// src/features/scenarioEditor/core/ui/map/components/ManualSaveButton/ManualSaveButton.tsx

import { useEffect } from 'react';
import { Save } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useReactFlow } from '@xyflow/react';
import type { Guid } from '@app/lib/types/Guid';
import { useSaveScenario } from '@scenario/core/features/saveSystem/useSaveScenario';
import { selectAutoSave } from '@scenario/core/features/saveSystem/saveSettingsSlice';
import { focusOnInvalidNode } from '@scenario/core/features/validation/focusInvalidNode';
import styles from './ManualSaveButton.module.css';

interface ManualSaveButtonProps {
    scenarioId: Guid | null;
}

export function ManualSaveButton({ scenarioId }: ManualSaveButtonProps) {
    const autoSave = useSelector(selectAutoSave);
    const rf = useReactFlow();
    const { save, canSave, isSaving, setFocusHandler } = useSaveScenario(scenarioId);

    // Устанавливаем функцию фокусировки при монтировании
    useEffect(() => {
        setFocusHandler((nodeId: Guid) => {
            focusOnInvalidNode(rf, nodeId);
        });

        return () => {
            setFocusHandler(null);
        };
    }, [rf, setFocusHandler]);

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
