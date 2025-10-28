// src/features/scenarioEditor/core/ui/map/components/ManualSaveButton/ManualSaveButton.tsx

import { useEffect, useState, useRef } from 'react';
import { Save, Eye } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useReactFlow } from '@xyflow/react';
import type { Guid } from '@app/lib/types/Guid';
import { useSaveScenario } from '@scenario/core/features/saveSystem/useSaveScenario';
import { selectAutoSave } from '@scenario/core/features/saveSystem/saveSettingsSlice';
import { focusOnInvalidNode } from '@scenario/core/features/validation/focusInvalidNode';
import { OperationsPreviewModal } from '@scenario/core/ui/map/components/PreviewOperationsButton/OperationsPreviewModal';
import styles from './ManualSaveButton.module.css';

interface ManualSaveButtonProps {
    scenarioId: Guid | null;
}

export function ManualSaveButton({ scenarioId }: ManualSaveButtonProps) {
    const autoSave = useSelector(selectAutoSave);
    const rf = useReactFlow();
    const { save, canSave, isSaving, setFocusHandler, operations } = useSaveScenario(scenarioId);

    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Устанавливаем функцию фокусировки при монтировании
    useEffect(() => {
        setFocusHandler((nodeId: Guid) => {
            focusOnInvalidNode(rf, nodeId);
        });

        return () => {
            setFocusHandler(null);
        };
    }, [rf, setFocusHandler]);

    // Закрытие контекстного меню при клике вне его
    useEffect(() => {
        if (!isContextMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            setIsContextMenuOpen(false);
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isContextMenuOpen]);

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        setContextMenuPosition({
            x: event.clientX,
            y: event.clientY
        });
        setIsContextMenuOpen(true);
    };

    const handlePreviewClick = () => {
        setIsContextMenuOpen(false);
        setIsPreviewModalOpen(true);
    };

    // Не показываем кнопку если включено автосохранение
    if (autoSave) {
        return null;
    }

    const hasOperations = operations.length > 0;

    return (
        <>
            <button
                ref={buttonRef}
                className={styles.button}
                onClick={save}
                onContextMenu={handleContextMenu}
                disabled={!canSave || isSaving}
                title={
                    !canSave
                        ? 'Нет несохранённых изменений'
                        : isSaving
                        ? 'Сохранение...'
                        : 'Сохранить изменения (Ctrl+S)\nПКМ - дополнительные опции'
                }
            >
                <Save size={18} />
                <span>{isSaving ? 'Сохранение...' : ''}</span>
            </button>

            {isContextMenuOpen && (
                <div
                    className={styles.contextMenu}
                    style={{
                        position: 'fixed',
                        top: `${contextMenuPosition.y}px`,
                        left: `${contextMenuPosition.x}px`,
                        zIndex: 10000
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className={styles.contextMenuItem}
                        onClick={handlePreviewClick}
                        disabled={!hasOperations}
                    >
                        <Eye size={16} />
                        <span>Предпросмотр изменений</span>
                        {hasOperations && (
                            <span className={styles.operationsCount}>({operations.length})</span>
                        )}
                    </button>
                </div>
            )}

            {isPreviewModalOpen && (
                <OperationsPreviewModal
                    operations={operations}
                    scenarioId={scenarioId}
                    onClose={() => setIsPreviewModalOpen(false)}
                />
            )}
        </>
    );
}
