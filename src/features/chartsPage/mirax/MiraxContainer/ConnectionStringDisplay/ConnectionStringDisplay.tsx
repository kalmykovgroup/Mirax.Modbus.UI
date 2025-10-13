// src/features/mirax/components/ConnectionStringDisplay/ConnectionStringDisplay.tsx
import { useMemo, useState, type JSX } from 'react';
import { Eye, EyeOff, Database } from 'lucide-react';
import classNames from 'classnames';

import styles from './ConnectionStringDisplay.module.css';
import { parseConnectionString, type ConnectionParam } from './connectionStringTypes';

interface Props {
    readonly connectionString: string;
    readonly showDbTypeIcon?: boolean;
}

/**
 * Иконка типа БД
 */
function DbTypeIcon({ dbType }: { readonly dbType: string }): JSX.Element | null {
    const iconProps = { size: 16, className: styles.dbIcon };

    switch (dbType) {
        case 'postgresql':
            return <Database {...iconProps} />;
        case 'sqlserver':
            return <Database {...iconProps} />;
        case 'mysql':
            return <Database {...iconProps} />;
        case 'oracle':
            return <Database {...iconProps} />;
        default:
            return null;
    }
}

/**
 * Отображение одного параметра
 */
function ConnectionParamItem({
                                 param,
                                 showSensitive,
                                 onToggleSensitive,
                             }: {
    readonly param: ConnectionParam;
    readonly showSensitive: boolean;
    readonly onToggleSensitive: () => void;
}): JSX.Element {
    const isSensitive = param.category === 'sensitive';
    const shouldHide = isSensitive && !showSensitive;

    // Маскировка значения звездочками
    const displayValue = shouldHide ? '•'.repeat(Math.min(param.value.length, 12)) : param.value;


    return (
        <div
            className={classNames(
                styles.param,
                param.category === 'primary' ? styles.paramPrimary : '',
                param.category === 'secondary' ? styles.paramSecondary : '',
                param.category === 'sensitive' ? styles.paramSensitive : '',
                param.category === 'other' ? styles.paramOther : '',
                )}
        >
            <span className={styles.paramKey}>{param.displayKey}:</span>
            <span className={styles.paramValue}>{displayValue}</span>

            {isSensitive && (
                <button
                    type="button"
                    className={styles.toggleButton}
                    onClick={onToggleSensitive}
                    aria-label={showSensitive ? 'Скрыть пароль' : 'Показать пароль'}
                >
                    {showSensitive ? (
                        <EyeOff size={14} className={styles.eyeIcon} />
                    ) : (
                        <Eye size={14} className={styles.eyeIcon} />
                    )}
                </button>
            )}
        </div>
    );
}

/**
 * Компонент для красивого отображения строки подключения
 */
export function ConnectionStringDisplay({
                                            connectionString,
                                            showDbTypeIcon = true,
                                        }: Props): JSX.Element {
    const [showSensitive, setShowSensitive] = useState<boolean>(false);

    const parsed = useMemo(() => parseConnectionString(connectionString), [connectionString]);

    // Группируем параметры: сначала primary, потом secondary, потом sensitive, потом other
    const sortedParams = useMemo(() => {
        const categoryOrder: Record<string, number> = {
            primary: 0,
            secondary: 1,
            sensitive: 2,
            other: 3,
        };

        return [...parsed.params].sort((a, b) => {
            const orderA = categoryOrder[a.category] ?? 999;
            const orderB = categoryOrder[b.category] ?? 999;
            return orderA - orderB;
        });
    }, [parsed.params]);

    const toggleShowSensitive = (): void => {
        setShowSensitive((prev) => !prev);
    };

    return (
        <div className={styles.container}>
            {showDbTypeIcon && parsed.dbType !== 'unknown' && (
                <div className={styles.dbTypeIndicator}>
                    <DbTypeIcon dbType={parsed.dbType} />
                    <span className={styles.dbTypeText}>{parsed.dbType.toUpperCase()}</span>
                </div>
            )}

            <div className={styles.paramsContainer}>
                {sortedParams.map((param, index) => (
                    <ConnectionParamItem
                        key={`${param.key}-${index}`}
                        param={param}
                        showSensitive={showSensitive}
                        onToggleSensitive={toggleShowSensitive}
                    />
                ))}
            </div>
        </div>
    );
}