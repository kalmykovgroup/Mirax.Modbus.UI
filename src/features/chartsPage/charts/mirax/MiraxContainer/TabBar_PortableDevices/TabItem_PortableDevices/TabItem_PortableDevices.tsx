// src/features/mirax/components/TabBar/TabItem/TabItem.tsx
import React, { useCallback, type JSX } from 'react';
import classNames from 'classnames';

import styles from './TabItem_PortableDevices.module.css';
import type { TechnicalRunTab } from '@chartsPage/charts/mirax/miraxSlice.ts';

interface Props {
    readonly tab: TechnicalRunTab;
    readonly isActive: boolean;
    readonly onActivate: () => void;
    readonly onClose: () => void;
}

//Вкладки с устройствами
export function TabItem_PortableDevices({ tab, isActive, onActivate, onClose }: Props): JSX.Element {
    const handleClose = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onClose();
        },
        [onClose]
    );

    return (
        <div
            className={classNames(styles.tab, isActive && styles.active)}
            onClick={onActivate}
            role="tab"
            aria-selected={isActive}
        >
      <span className={styles.title} title={tab.name ?? 'Без названия'}>
        {tab.name ?? 'Без названия'}
      </span>
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