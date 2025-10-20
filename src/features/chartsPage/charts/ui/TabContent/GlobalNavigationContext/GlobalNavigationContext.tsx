// src/features/chartsPage/charts/ui/TabContent/GlobalNavigationContext/GlobalNavigationContext.tsx

import { createContext, useContext, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import type { Guid } from '@app/lib/types/Guid';
import { selectTemplate } from '@chartsPage/charts/core/store/selectors/base.selectors';
import { selectVisibleContextIds } from '@chartsPage/charts/core/store/tabsSlice';

/**
 * Глобальный индекс графика
 */
interface GlobalChartIndex {
    readonly contextId: Guid;
    readonly fieldName: string;
    readonly fieldIndex: number;
    readonly globalIndex: number;
}

/**
 * Контекст глобальной навигации
 */
interface GlobalNavigationContextValue {
    readonly allCharts: readonly GlobalChartIndex[];
    readonly totalCharts: number;
    readonly getCurrentIndex: (contextId: Guid, fieldName: string) => number;
    readonly navigateToIndex: (globalIndex: number) => void;
    readonly navigateNext: () => void;
    readonly navigatePrevious: () => void;
}

const GlobalNavigationContext = createContext<GlobalNavigationContextValue | null>(null);

interface GlobalNavigationProviderProps {
    readonly children: ReactNode;
    readonly tabId: Guid;
}

/**
 * Провайдер глобальной навигации
 */
export function GlobalNavigationProvider({ children, tabId }: GlobalNavigationProviderProps) {
    const visibleContextIds = useSelector((state: RootState) =>
        selectVisibleContextIds(state, tabId)
    );

    const templates = useSelector((state: RootState) => {
        const result: Record<Guid, ReturnType<typeof selectTemplate>> = {};
        for (const contextId of visibleContextIds) {
            result[contextId] = selectTemplate(state, contextId);
        }
        return result;
    });

    const currentGlobalIndexRef = useRef<number>(0);

    const allCharts = useMemo((): readonly GlobalChartIndex[] => {
        const charts: GlobalChartIndex[] = [];
        let globalIndex = 0;

        for (const contextId of visibleContextIds) {
            const template = templates[contextId];

            if (!template?.selectedFields) continue;

            for (let fieldIndex = 0; fieldIndex < template.selectedFields.length; fieldIndex++) {
                const field = template.selectedFields[fieldIndex];
                if (!field) continue;

                charts.push({
                    contextId,
                    fieldName: field.name,
                    fieldIndex,
                    globalIndex: globalIndex++,
                });
            }
        }

        return Object.freeze(charts);
    }, [visibleContextIds, templates]);

    const totalCharts = allCharts.length;

    const getCurrentIndex = useCallback(
        (contextId: Guid, fieldName: string): number => {
            const index = allCharts.findIndex(
                (chart) => chart.contextId === contextId && chart.fieldName === fieldName
            );
            return index >= 0 ? index : 0;
        },
        [allCharts]
    );

    const navigateToIndex = useCallback(
        async (globalIndex: number): Promise<void> => {
            if (globalIndex < 0 || globalIndex >= totalCharts) {
                console.warn('[GlobalNavigation] Invalid index:', globalIndex);
                return;
            }

            const targetChart = allCharts[globalIndex];
            if (!targetChart) {
                console.warn('[GlobalNavigation] Chart not found for index:', globalIndex);
                return;
            }

            console.log('[GlobalNavigation] Navigating to:', {
                globalIndex,
                contextId: targetChart.contextId,
                fieldName: targetChart.fieldName
            });

            currentGlobalIndexRef.current = globalIndex;

            // Запоминаем, был ли активен fullscreen
            const wasInFullscreen = document.fullscreenElement !== null;

            console.log('[GlobalNavigation] wasInFullscreen:', wasInFullscreen);

            // Выходим из fullscreen если нужно
            if (wasInFullscreen) {
                console.log('[GlobalNavigation] Exiting fullscreen...');
                try {
                    await document.exitFullscreen();
                    // Даём время на анимацию выхода
                    await new Promise(resolve => setTimeout(resolve, 150));
                } catch (error) {
                    console.error('[GlobalNavigation] Error exiting fullscreen:', error);
                }
            }

            // Ищем целевой элемент
            const selector = `[data-chart-id="${targetChart.contextId}-${targetChart.fieldName}"]`;
            console.log('[GlobalNavigation] Looking for element:', selector);

            const chartElement = document.querySelector(selector);

            if (!chartElement) {
                console.warn('[GlobalNavigation] Element not found:', selector);
                return;
            }

            console.log('[GlobalNavigation] Element found, scrolling...');

            // Скроллим к элементу
            chartElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });

            // Если был fullscreen - автоматически входим в fullscreen для нового графика
            if (wasInFullscreen) {
                console.log('[GlobalNavigation] Re-entering fullscreen for new chart...');

                // Даём время на скролл, затем входим в fullscreen
                setTimeout(() => {
                    if (chartElement instanceof HTMLElement) {
                        chartElement.requestFullscreen()
                            .then(() => {
                                console.log('[GlobalNavigation] Successfully entered fullscreen');
                            })
                            .catch((err) => {
                                console.error('[GlobalNavigation] Error entering fullscreen:', err);
                            });
                    }
                }, 400);
            }
        },
        [allCharts, totalCharts]
    );

    const navigateNext = useCallback((): void => {
        const current = currentGlobalIndexRef.current;
        const nextIndex = Math.min(current + 1, totalCharts - 1);

        console.log('[GlobalNavigation] navigateNext:', {
            current,
            next: nextIndex,
            total: totalCharts
        });

        void navigateToIndex(nextIndex);
    }, [totalCharts, navigateToIndex]);

    const navigatePrevious = useCallback((): void => {
        const current = currentGlobalIndexRef.current;
        const prevIndex = Math.max(current - 1, 0);

        console.log('[GlobalNavigation] navigatePrevious:', {
            current,
            prev: prevIndex,
            total: totalCharts
        });

        void navigateToIndex(prevIndex);
    }, [navigateToIndex]);

    const value = useMemo(
        (): GlobalNavigationContextValue => ({
            allCharts,
            totalCharts,
            getCurrentIndex,
            navigateToIndex: (idx: number) => void navigateToIndex(idx),
            navigateNext,
            navigatePrevious,
        }),
        [allCharts, totalCharts, getCurrentIndex, navigateToIndex, navigateNext, navigatePrevious]
    );

    return (
        <GlobalNavigationContext.Provider value={value}>
            {children}
        </GlobalNavigationContext.Provider>
    );
}

/**
 * Хук для использования глобальной навигации
 */
export function useGlobalNavigation(): GlobalNavigationContextValue {
    const context = useContext(GlobalNavigationContext);

    if (!context) {
        throw new Error(
            '[useGlobalNavigation] Must be used within GlobalNavigationProvider'
        );
    }

    return context;
}