// src/features/chartsPage/charts/ui/ChartTabBar/ChartTabItem/ChartTabItem.tsx

import { type JSX } from 'react';
import classNames from 'classnames';
import type { Guid } from '@app/lib/types/Guid';
import { useAppSelector } from '@/store/hooks';
import { selectTabInfo} from '@chartsPage/charts/core/store/chartsSlice';
import styles from './ChartTabItem.module.css';
import {useConfirm} from "@ui/components/ConfirmProvider/ConfirmProvider.tsx";

interface Props {
    readonly tabId: Guid;
    readonly isActive: boolean;
    readonly onActivate: () => void;
    readonly onClose: () => void;
}

export function ChartTabItem({ tabId, isActive, onActivate, onClose }: Props): JSX.Element {
    const tabInfo = useAppSelector((state) => selectTabInfo(state, tabId));


    const confirm = useConfirm()

    const handleClose = async () => {
        const ok = await confirm({
            title: 'Закрыть вкладку?',
            description: 'Данные по графику будут очищены из браузера.',
            confirmText: 'Закрыть',
            cancelText: 'Отмена',
            danger: true,
        })
        if (ok) {
            onClose();
        }
    }

    if (!tabInfo) {
        return <></>;
    }

    // Формируем название вкладки
    const tabName = tabInfo.template.entity.name || 'График';
    const fieldsCount = tabInfo.template.selectedFields.length;
    const subtitle = `${fieldsCount} ${fieldsCount === 1 ? 'поле' : fieldsCount < 5 ? 'поля' : 'полей'}`;

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
                aria-label="Закрыть график"
                type="button"
            >
                ×
            </button>
        </div>
    );
}