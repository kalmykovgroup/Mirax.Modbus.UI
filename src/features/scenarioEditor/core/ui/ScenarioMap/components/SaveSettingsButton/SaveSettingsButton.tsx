// src/features/scenarioEditor/core/ui/map/components/SaveSettingsButton/SaveSettingsButton.tsx

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { SaveSettingsModal } from './SaveSettingsModal.tsx';
import styles from './SaveSettingsButton.module.css';

export function SaveSettingsButton() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                className={styles.button}
                onClick={() => setIsModalOpen(true)}
                title="Настройки сохранения"
            >
                <Settings size={18} />
            </button>

            {isModalOpen && (
                <SaveSettingsModal onClose={() => setIsModalOpen(false)} />
            )}
        </>
    );
}
