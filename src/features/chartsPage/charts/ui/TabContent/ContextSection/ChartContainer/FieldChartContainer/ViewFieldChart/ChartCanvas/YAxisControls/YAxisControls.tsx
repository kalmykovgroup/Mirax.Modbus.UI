// components/YAxisControls/YAxisControls.tsx

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import styles from './YAxisControls.module.css';
import type {
    YAxisRangeControl
} from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/YAxisControls/useYAxisRange.ts";

interface YAxisControlsProps {
    readonly control: YAxisRangeControl;
    readonly className?: string | undefined;
}

type PresetFactor = 0.5 | 0.75 | 0.9 | 1.1 | 1.5 | 2 | 3;

interface Preset {
    readonly factor: PresetFactor;
    readonly label: string;
    readonly className?: string | undefined;
}

const MIN_PRESETS: readonly Preset[] = [
    { factor: 3, label: '×3', className: styles.increase },
    { factor: 2, label: '×2', className: styles.increase },
    { factor: 1.5, label: '×1.5', className: styles.increase },
    { factor: 1.1, label: '+10%', className: styles.mild },
    { factor: 0.9, label: '-10%', className: styles.mild },
    { factor: 0.75, label: '×0.75', className: styles.decrease },
    { factor: 0.5, label: '×0.5', className: styles.decrease }
] as const;

const MAX_PRESETS: readonly Preset[] = [
    { factor: 0.5, label: '×0.5', className: styles.decrease },
    { factor: 0.75, label: '×0.75', className: styles.decrease },
    { factor: 0.9, label: '-10%', className: styles.mild },
    { factor: 1.1, label: '+10%', className: styles.mild },
    { factor: 1.5, label: '×1.5', className: styles.increase },
    { factor: 2, label: '×2', className: styles.increase },
    { factor: 3, label: '×3', className: styles.increase }
] as const;

const EDGE_PADDING = 16;
const VERTICAL_GAP = 8; // Отступ между кнопкой и панелью

export const YAxisControls: React.FC<YAxisControlsProps> = ({
                                                                control,
                                                                className
                                                            }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualMin, setManualMin] = useState('');
    const [manualMax, setManualMax] = useState('');
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

    const containerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    const toggleManualInput = useCallback(() => {
        setShowManualInput(prev => {
            if (!prev) {
                setManualMin(control.currentRange.min.toString());
                setManualMax(control.currentRange.max.toString());
            }
            return !prev;
        });
    }, [control.currentRange]);

    // ТОЧНОЕ позиционирование под кнопкой с защитой от выхода за границы
    useEffect(() => {
        if (!isExpanded || !containerRef.current || !panelRef.current) {
            return;
        }

        const calculatePosition = (): void => {
            if (!containerRef.current || !panelRef.current) return;

            const button = containerRef.current.getBoundingClientRect();
            const panel = panelRef.current;

            const panelWidth = panel.offsetWidth;
            const panelHeight = panel.offsetHeight;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Позиция кнопки
            const buttonLeft = button.left;
            const buttonRight = button.right;
            const buttonTop = button.top;
            const buttonBottom = button.bottom;
            const buttonWidth = button.width;

            console.log('[YAxisControls] 🔍 Расчёт позиции:', {
                button: {
                    left: Math.round(buttonLeft),
                    right: Math.round(buttonRight),
                    top: Math.round(buttonTop),
                    bottom: Math.round(buttonBottom),
                    width: Math.round(buttonWidth)
                },
                panel: {
                    width: panelWidth,
                    height: panelHeight
                },
                viewport: {
                    width: viewportWidth,
                    height: viewportHeight
                }
            });

            // ========================================
            // ВЕРТИКАЛЬНАЯ ПОЗИЦИЯ (top)
            // ========================================
            let top = buttonBottom + VERTICAL_GAP;
            let showAbove = false;

            // Проверяем, влезет ли снизу
            if (top + panelHeight > viewportHeight - EDGE_PADDING) {
                // Не влезает снизу - показываем сверху
                top = buttonTop - panelHeight - VERTICAL_GAP;
                showAbove = true;

                // Проверяем, влезет ли сверху
                if (top < EDGE_PADDING) {
                    // Не влезает и сверху - показываем снизу и обрезаем по высоте
                    top = buttonBottom + VERTICAL_GAP;
                    showAbove = false;
                    console.log('[YAxisControls] ⚠️ Панель не влезает по высоте');
                }
            }

            console.log(`[YAxisControls] Вертикаль: ${showAbove ? '⬆️ СВЕРХУ' : '⬇️ СНИЗУ'} кнопки`);

            // ========================================
            // ГОРИЗОНТАЛЬНАЯ ПОЗИЦИЯ (left)
            // ========================================
            let left: number;

            // СТРАТЕГИЯ 1: Выравниваем по ПРАВОМУ краю кнопки
            // Панель прижата правым краем к правому краю кнопки
            const leftIfAlignedRight = buttonRight - panelWidth;

            if (leftIfAlignedRight >= EDGE_PADDING && buttonRight <= viewportWidth - EDGE_PADDING) {
                // Влезает при выравнивании по правому краю
                left = leftIfAlignedRight;
                console.log('[YAxisControls] ✅ Выравнивание по ПРАВОМУ краю кнопки');
            }
                // СТРАТЕГИЯ 2: Выравниваем по ЛЕВОМУ краю кнопки
            // Панель прижата левым краем к левому краю кнопки
            else if (buttonLeft >= EDGE_PADDING && (buttonLeft + panelWidth) <= viewportWidth - EDGE_PADDING) {
                // Влезает при выравнивании по левому краю
                left = buttonLeft;
                console.log('[YAxisControls] ✅ Выравнивание по ЛЕВОМУ краю кнопки');
            }
            // СТРАТЕГИЯ 3: Не влезает ни так, ни так - позиционируем с учётом границ экрана
            else {
                // Определяем, к какому краю ближе кнопка
                const distanceFromLeft = buttonLeft;
                const distanceFromRight = viewportWidth - buttonRight;

                if (distanceFromRight > distanceFromLeft) {
                    // Кнопка ближе к левому краю - выравниваем панель по правому краю экрана
                    left = viewportWidth - panelWidth - EDGE_PADDING;
                    console.log('[YAxisControls] 🔧 Прижато к ПРАВОМУ краю экрана');
                } else {
                    // Кнопка ближе к правому краю - выравниваем панель по левому краю экрана
                    left = EDGE_PADDING;
                    console.log('[YAxisControls] 🔧 Прижато к ЛЕВОМУ краю экрана');
                }
            }

            // ========================================
            // ФИНАЛЬНАЯ ПРОВЕРКА И КОРРЕКЦИЯ
            // ========================================
            // Гарантируем, что панель не выйдет за левую границу
            if (left < EDGE_PADDING) {
                left = EDGE_PADDING;
                console.log('[YAxisControls] 🔧 Коррекция: прижато к левой границе');
            }

            // Гарантируем, что панель не выйдет за правую границу
            if (left + panelWidth > viewportWidth - EDGE_PADDING) {
                left = viewportWidth - panelWidth - EDGE_PADDING;
                console.log('[YAxisControls] 🔧 Коррекция: прижато к правой границе');
            }

            // Гарантируем, что панель не выйдет за верхнюю границу
            if (top < EDGE_PADDING) {
                top = EDGE_PADDING;
                console.log('[YAxisControls] 🔧 Коррекция: прижато к верхней границе');
            }

            const positioning: React.CSSProperties = {
                top: `${top}px`,
                left: `${left}px`
            };

            console.log('[YAxisControls] 📍 Итоговая позиция:', {
                top: Math.round(top),
                left: Math.round(left),
                fitsHorizontally: (left >= EDGE_PADDING) && (left + panelWidth <= viewportWidth - EDGE_PADDING),
                fitsVertically: (top >= EDGE_PADDING) && (top + panelHeight <= viewportHeight - EDGE_PADDING)
            });

            setPanelStyle(positioning);
        };

        // Вычисляем позицию с задержкой для корректного рендера
        const timerId = setTimeout(calculatePosition, 20);

        // Перевычисляем при изменениях
        const handleResize = (): void => {
            calculatePosition();
        };

        const handleScroll = (): void => {
            calculatePosition();
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            clearTimeout(timerId);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isExpanded]);

    // Закрытие при клике вне панели
    useEffect(() => {
        if (!isExpanded) return;

        const handleClickOutside = (e: MouseEvent): void => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsExpanded(false);
                setShowManualInput(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isExpanded]);

    const formatValue = useCallback((value: number): string => {
        if (value === 0) return '0';
        const abs = Math.abs(value);
        if (abs >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
        if (abs >= 1_000) return (value / 1_000).toFixed(2) + 'K';
        if (abs < 0.01) return value.toExponential(3);
        if (abs < 1) return value.toFixed(4);
        return value.toFixed(2);
    }, []);

    const formatFullValue = useCallback((value: number): string => {
        if (Math.abs(value) < 0.001) return value.toExponential(6);
        if (Math.abs(value) < 1) return value.toFixed(6);
        if (Math.abs(value) < 1000) return value.toFixed(3);
        return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    }, []);

    const deviation = useMemo(() => {
        const optRange = control.optimalRange.max - control.optimalRange.min;
        const currRange = control.currentRange.max - control.currentRange.min;
        return ((currRange - optRange) / optRange * 100);
    }, [control.optimalRange, control.currentRange]);

    const minSliderValue = useMemo(() => {
        const range = control.optimalRange.max - control.optimalRange.min;
        const offset = control.currentRange.min - control.optimalRange.min;
        return (offset / range) * 100;
    }, [control.optimalRange, control.currentRange.min]);

    const maxSliderValue = useMemo(() => {
        const range = control.optimalRange.max - control.optimalRange.min;
        const offset = control.currentRange.max - control.optimalRange.max;
        return (offset / range) * 100;
    }, [control.optimalRange, control.currentRange.max]);

    const handleMinSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const percent = parseFloat(e.target.value);
        const range = control.optimalRange.max - control.optimalRange.min;
        const newMin = control.optimalRange.min + (range * percent / 100);
        control.setCustomMin(newMin);
    }, [control]);

    const handleMaxSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const percent = parseFloat(e.target.value);
        const range = control.optimalRange.max - control.optimalRange.min;
        const newMax = control.optimalRange.max + (range * percent / 100);
        control.setCustomMax(newMax);
    }, [control]);

    const handleManualSubmit = useCallback(() => {
        const min = parseFloat(manualMin);
        const max = parseFloat(manualMax);

        if (!isNaN(min)) {
            control.setCustomMin(min);
        }
        if (!isNaN(max)) {
            control.setCustomMax(max);
        }

        setShowManualInput(false);
    }, [manualMin, manualMax, control]);

    const handleExpandBoth = useCallback((factor: number) => {
        control.multiplyMin(1 / factor);
        control.multiplyMax(factor);
    }, [control]);

    return (
        <div className={`${styles.container} ${className ?? ''}`} ref={containerRef}>
            <button
                type="button"
                className={`${styles.toggleButton} ${control.isCustom ? styles.active : ''}`}
                onClick={toggleExpanded}
                title={isExpanded ? 'Скрыть настройки оси Y' : 'Настроить ось Y'}
            >
                <span className={styles.icon}>📊</span>
                <span className={styles.buttonText}>Y</span>
                {control.isCustom && (
                    <span
                        className={`${styles.deviationBadge} ${
                            Math.abs(deviation) > 50 ? styles.high :
                                Math.abs(deviation) > 20 ? styles.medium :
                                    styles.low
                        }`}
                        title={`Отклонение от оптимума: ${deviation > 0 ? '+' : ''}${deviation.toFixed(0)}%`}
                    >
                        {deviation > 0 ? '+' : ''}{deviation.toFixed(0)}%
                    </span>
                )}
            </button>

            {isExpanded && (
                <div
                    ref={panelRef}
                    className={styles.panel}
                    style={panelStyle}
                >
                    <div className={styles.header}>
                        <h4 className={styles.title}>Диапазон оси Y</h4>
                        <div className={styles.headerButtons}>
                            <button
                                type="button"
                                className={styles.iconButton}
                                onClick={toggleManualInput}
                                title="Ввести точные значения"
                            >
                                ✏️
                            </button>
                            {control.isCustom && (
                                <button
                                    type="button"
                                    className={styles.resetButton}
                                    onClick={control.reset}
                                    title="Сбросить к оптимальным значениям"
                                >
                                    ↺
                                </button>
                            )}
                        </div>
                    </div>

                    {showManualInput ? (
                        <div className={styles.manualInput}>
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Максимум:</label>
                                <input
                                    type="number"
                                    className={styles.numberInput}
                                    value={manualMax}
                                    onChange={(e) => setManualMax(e.target.value)}
                                    step="any"
                                    placeholder={formatFullValue(control.optimalRange.max)}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Минимум:</label>
                                <input
                                    type="number"
                                    className={styles.numberInput}
                                    value={manualMin}
                                    onChange={(e) => setManualMin(e.target.value)}
                                    step="any"
                                    placeholder={formatFullValue(control.optimalRange.min)}
                                />
                            </div>
                            <div className={styles.manualButtons}>
                                <button
                                    type="button"
                                    className={styles.cancelButton}
                                    onClick={() => setShowManualInput(false)}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    className={styles.applyButton}
                                    onClick={handleManualSubmit}
                                >
                                    Применить
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={styles.quickActions}>
                                <button
                                    type="button"
                                    className={`${styles.quickButton} ${styles.expand}`}
                                    onClick={() => handleExpandBoth(1.5)}
                                    title="Расширить диапазон в 1.5 раза"
                                >
                                    ⬍ ×1.5
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.quickButton} ${styles.expand}`}
                                    onClick={() => handleExpandBoth(2)}
                                    title="Расширить диапазон в 2 раза"
                                >
                                    ⬍ ×2
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.quickButton} ${styles.shrink}`}
                                    onClick={() => handleExpandBoth(0.75)}
                                    title="Сузить диапазон до 75%"
                                >
                                    ⬌ ×0.75
                                </button>
                            </div>

                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <span className={styles.label}>Максимум</span>
                                    <span className={styles.value} title={formatFullValue(control.currentRange.max)}>
                                        {formatValue(control.currentRange.max)}
                                    </span>
                                </div>

                                <div className={styles.sliderContainer}>
                                    <input
                                        type="range"
                                        className={styles.slider}
                                        min="-100"
                                        max="200"
                                        step="1"
                                        value={maxSliderValue}
                                        onChange={handleMaxSlider}
                                    />
                                    <div className={styles.sliderLabels}>
                                        <span>-50%</span>
                                        <span>0</span>
                                        <span>+100%</span>
                                    </div>
                                </div>

                                <div className={styles.presetButtons}>
                                    {MAX_PRESETS.map(preset => (
                                        <button
                                            key={preset.factor}
                                            type="button"
                                            className={`${styles.presetButton} ${preset.className}`}
                                            onClick={() => control.multiplyMax(preset.factor)}
                                            title={`Умножить максимум на ${preset.factor}`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <span className={styles.label}>Минимум</span>
                                    <span className={styles.value} title={formatFullValue(control.currentRange.min)}>
                                        {formatValue(control.currentRange.min)}
                                    </span>
                                </div>

                                <div className={styles.sliderContainer}>
                                    <input
                                        type="range"
                                        className={styles.slider}
                                        min="-100"
                                        max="200"
                                        step="1"
                                        value={minSliderValue}
                                        onChange={handleMinSlider}
                                    />
                                    <div className={styles.sliderLabels}>
                                        <span>-50%</span>
                                        <span>0</span>
                                        <span>+100%</span>
                                    </div>
                                </div>

                                <div className={styles.presetButtons}>
                                    {MIN_PRESETS.map(preset => (
                                        <button
                                            key={preset.factor}
                                            type="button"
                                            className={`${styles.presetButton} ${preset.className}`}
                                            onClick={() => control.multiplyMin(preset.factor)}
                                            title={`Умножить минимум на ${preset.factor}`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {control.isCustom && (
                                <div className={styles.info}>
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>Оптимальный:</span>
                                        <span className={styles.infoValue}>
                                            {formatValue(control.optimalRange.min)} — {formatValue(control.optimalRange.max)}
                                        </span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>Текущий:</span>
                                        <span className={styles.infoValue}>
                                            {formatValue(control.currentRange.min)} — {formatValue(control.currentRange.max)}
                                        </span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>Диапазон:</span>
                                        <span className={styles.infoValue}>
                                            {formatValue(control.currentRange.max - control.currentRange.min)}
                                            {' '}
                                            <span className={styles.deviation}>
                                                ({deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%)
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};