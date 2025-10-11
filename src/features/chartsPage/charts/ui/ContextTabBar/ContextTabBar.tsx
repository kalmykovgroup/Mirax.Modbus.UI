// src/features/chartsPage/tabs/ui/ContextTabBar.tsx

import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { selectTemplate } from '@chartsPage/charts/core/store/selectors/base.selectors';
import { useConfirm } from '@ui/components/ConfirmProvider/ConfirmProvider';
import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/store/store';
import styles from './ContextTabBar.module.css';
import React from "react";
import {removeContextFromTab, setActiveContext} from "@chartsPage/charts/core/store/tabsSlice.ts";

interface ContextTabBarProps {
    readonly tabId: Guid;
    readonly contextIds: readonly Guid[];
    readonly activeContextId: Guid | undefined;
}

/**
 * Панель переключения контекстов внутри вкладки
 */
export function ContextTabBar({ tabId, contextIds, activeContextId }: ContextTabBarProps) {
    const dispatch = useAppDispatch();
    const confirm = useConfirm();

    const handleContextClick = (contextId: Guid) => {
        if (contextId !== activeContextId) {
            dispatch(setActiveContext({ tabId, contextId }));
        }
    };

    const handleRemoveContext = async (
        e: React.MouseEvent,
        contextId: Guid,
        templateName: string | undefined
    ) => {
        e.stopPropagation();

        const ok = await confirm({
            title: 'Закрыть контекст?',
            description: `Контекст "${templateName ?? contextId}" будет удалён из этой вкладки.`,
            confirmText: 'Закрыть',
            cancelText: 'Отмена',
            danger: true,
        });

        if (ok) {
            // Удаляем из вкладки
            dispatch(removeContextFromTab({ tabId, contextId }));

            // Опционально: удалить контекст полностью из store
            // dispatch(deleteContext(contextId));
        }
    };

    if (contextIds.length === 0) {
        return null;
    }

    return (
        <div className={styles.contextBar}>
            <div className={styles.contextList}>
                {contextIds.map((contextId) => (
                    <ContextTabButton
                        key={contextId}
                        contextId={contextId}
                        tabId={tabId}
                        isActive={contextId === activeContextId}
                        onClick={() => handleContextClick(contextId)}
                        onRemove={(e, name) => handleRemoveContext(e, contextId, name)}
                    />
                ))}
            </div>

            {/* Кнопка добавления нового шаблона */}
            <button
                className={styles.addButton}
                onClick={() => {
                    // TODO: Открыть модальное окно выбора шаблона
                    console.log('TODO: Add template to tab', tabId);
                }}
                title="Добавить шаблон"
            >
                <AddIcon />
                <span>Добавить шаблон</span>
            </button>
        </div>
    );
}

// ============= Вспомогательный компонент кнопки контекста =============

interface ContextTabButtonProps {
    readonly contextId: Guid;
    readonly tabId: Guid;
    readonly isActive: boolean;
    readonly onClick: () => void;
    readonly onRemove: (e: React.MouseEvent, templateName: string | undefined) => void;
}

function ContextTabButton({
                              contextId,
                              isActive,
                              onClick,
                              onRemove,
                          }: ContextTabButtonProps) {
    const template = useSelector((state: RootState) => selectTemplate(state, contextId));

    const templateName = template?.name ?? 'Без названия';

    return (
        <div
            className={isActive ? styles.contextButtonActive : styles.contextButton}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            title={templateName}
        >
            <span className={styles.contextName}>{templateName}</span>
            <button
                className={styles.closeButton}
                onClick={(e) => onRemove(e, templateName)}
                title="Закрыть контекст"
                aria-label={`Закрыть контекст ${templateName}`}
            >
                <CloseIcon />
            </button>
        </div>
    );
}

// ============= Иконки =============

function CloseIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
                d="M1 1L13 13M1 13L13 1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function AddIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
                d="M8 1V15M1 8H15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}