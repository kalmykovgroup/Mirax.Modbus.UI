// src/features/mirax/components/CopyButton/CopyButton.tsx
import React, { useCallback, useState, type JSX } from 'react';

import styles from './CopyButton.module.css';
import classNames from "classnames";

interface Props {
    readonly className?: string | undefined;
    readonly text: string;
    readonly label?: string | undefined;
}

export function CopyButton({ text, label, className }: Props): JSX.Element {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();

            try {
                await navigator.clipboard.writeText(text);
                setCopied(true);

                setTimeout(() => {
                    setCopied(false);
                }, 2000);
            } catch (error) {
                console.error('Ошибка копирования:', error);
            }
        },
        [text]
    );


    return (
        <button
            className={classNames(styles.button, className)}
            onClick={handleCopy}
            aria-label={label ?? 'Копировать'}
            title={copied ? 'Скопировано!' : 'Копировать'}
            type="button"
        >
            {copied ? '✓' : '📋'}
        </button>
    );
}