// src/features/chartsPage/charts/ui/TabContent/contexts/GlobalNavigationContext.tsx

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
    readonly fieldIndex: number; // индекс внутри контекста
    readonly globalIndex: number; // глобальный индекс на странице
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

    // Получаем все шаблоны для видимых контекстов
    const templates = useSelector((state: RootState) => {
        const result: Record<Guid, ReturnType<typeof selectTemplate>> = {};
        for (const contextId of visibleContextIds) {
            result[contextId] = selectTemplate(state, contextId);
        }
        return result;
    });

    // Используем ref вместо state для отслеживания текущего индекса
    const currentGlobalIndexRef = useRef<number>(0);

    // Собираем все графики со всех видимых контекстов
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

    // Получить глобальный индекс по contextId и fieldName
    const getCurrentIndex = useCallback(
        (contextId: Guid, fieldName: string): number => {
            const index = allCharts.findIndex(
                (chart) => chart.contextId === contextId && chart.fieldName === fieldName
            );
            return index >= 0 ? index : 0;
        },
        [allCharts]
    );

    // Навигация к конкретному индексу
    const navigateToIndex = useCallback(
        (globalIndex: number): void => {
            if (globalIndex < 0 || globalIndex >= totalCharts) {
                console.warn('[GlobalNavigation] Invalid index:', globalIndex);
                return;
            }

            const chart = allCharts[globalIndex];
            if (!chart) {
                console.warn('[GlobalNavigation] Chart not found for index:', globalIndex);
                return;
            }

            console.log('[GlobalNavigation] Navigating to:', {
                globalIndex,
                contextId: chart.contextId,
                fieldName: chart.fieldName
            });

            currentGlobalIndexRef.current = globalIndex;

            // Скроллим к графику
            const selector = `[data-chart-id="${chart.contextId}-${chart.fieldName}"]`;
            console.log('[GlobalNavigation] Looking for element:', selector);

            const chartElement = document.querySelector(selector);

            if (chartElement) {
                console.log('[GlobalNavigation] Element found, scrolling...');
                chartElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            } else {
                console.warn('[GlobalNavigation] Element not found:', selector);
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

        navigateToIndex(nextIndex);
    }, [totalCharts, navigateToIndex]);

    const navigatePrevious = useCallback((): void => {
        const current = currentGlobalIndexRef.current;
        const prevIndex = Math.max(current - 1, 0);

        console.log('[GlobalNavigation] navigatePrevious:', {
            current,
            prev: prevIndex,
            total: totalCharts
        });

        navigateToIndex(prevIndex);
    }, [navigateToIndex]);

    const value = useMemo(
        (): GlobalNavigationContextValue => ({
            allCharts,
            totalCharts,
            getCurrentIndex,
            navigateToIndex,
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