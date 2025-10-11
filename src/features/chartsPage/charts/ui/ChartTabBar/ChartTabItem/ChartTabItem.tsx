// src/features/chartsPage/charts/ui/ChartTabBar/ChartTabItem/ChartTabItem.tsx

import { type JSX } from 'react';
import classNames from 'classnames';
import type { Guid } from '@app/lib/types/Guid';
import { useAppSelector } from '@/store/hooks';
import { useConfirm } from '@ui/components/ConfirmProvider/ConfirmProvider.tsx';
import styles from './ChartTabItem.module.css';
import {selectTabContextIds, selectTabInfo} from "@chartsPage/charts/core/store/tabsSlice.ts";

interface Props {
    readonly tabId: Guid;
    readonly isActive: boolean;
    readonly onActivate: () => void;
    readonly onClose: () => void;
}

export function ChartTabItem({ tabId, isActive, onActivate, onClose }: Props): JSX.Element {
    const tabInfo = useAppSelector((state) => selectTabInfo(state, tabId));
    const contextIds = useAppSelector((state) => selectTabContextIds(state, tabId));
    const confirm = useConfirm();

    const handleClose = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Предотвращаем активацию вкладки при клике на кнопку закрытия

        const ok = await confirm({
            title: 'Закрыть вкладку?',
            description: 'Данные по графику будут очищены из браузера.',
            confirmText: 'Закрыть',
            cancelText: 'Отмена',
            danger: true,
        });
        if (ok) {
            onClose();
        }
    };

    if (!tabInfo) {
        return <></>;
    }

    // Формируем название вкладки
    const tabName = tabInfo.name;
    const contextsCount = contextIds.length;
    const subtitle =
        contextsCount === 0
            ? 'Пусто'
            : `${contextsCount} ${contextsCount === 1 ? 'контекст' : contextsCount < 5 ? 'контекста' : 'контекстов'}`;

    return (
        <div
            className={classNames(styles.tab, isActive && styles.active)}
            onClick={onActivate}
            role="tab"
            aria-selected={isActive}
            title={`${tabName} (${subtitle})`}
        >
            <div className={styles.content}>
                <span className={styles.title}>{tabName}</span>
                <span className={styles.subtitle}>{subtitle}</span>
            </div>
            <button
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="Закрыть вкладку"
                type="button"
            >
                ×
            </button>
        </div>
    );
}