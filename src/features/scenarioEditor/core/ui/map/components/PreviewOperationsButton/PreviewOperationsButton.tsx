// src/features/scenarioEditor/core/ui/map/components/PreviewOperationsButton/PreviewOperationsButton.tsx

import { useState } from 'react';
import { Eye } from 'lucide-react';
import type { Guid } from '@app/lib/types/Guid';
import { useSaveScenario } from '@scenario/core/features/saveSystem/useSaveScenario';
import { OperationsPreviewModal } from './OperationsPreviewModal';
import styles from './PreviewOperationsButton.module.css';

interface PreviewOperationsButtonProps {
    scenarioId: Guid | null;
}

export function PreviewOperationsButton({ scenarioId }: PreviewOperationsButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { operations } = useSaveScenario(scenarioId);

    const hasOperations = operations.length > 0;

    return (
        <>
            <button
                className={styles.button}
                onClick={() => setIsModalOpen(true)}
                disabled={!hasOperations}
                title={hasOperations ? 'Предпросмотр изменений' : 'Нет изменений для просмотра'}
            >
                <Eye size={18} />
                <span>Предпросмотр</span>
                {hasOperations && <span className={styles.badge}>{operations.length}</span>}
            </button>

            {isModalOpen && (
                <OperationsPreviewModal
                    operations={operations}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </>
    );
}
