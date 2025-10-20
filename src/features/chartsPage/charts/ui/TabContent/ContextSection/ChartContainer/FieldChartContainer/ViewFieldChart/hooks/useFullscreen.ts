// features/chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/hooks/useFullscreen.ts

import React, { useState, useCallback, useEffect, useRef } from 'react';

interface UseFullscreenReturn {
    readonly isFullscreen: boolean;
    readonly enterFullscreen: () => Promise<void>;
    readonly exitFullscreen: () => Promise<void>;
    readonly toggleFullscreen: () => Promise<void>;
    readonly isSupported: boolean;
}

export function useFullscreen(elementRef: React.RefObject<HTMLElement>): UseFullscreenReturn {
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const isRequestingRef = useRef<boolean>(false);

    const isSupported = typeof document !== 'undefined' &&
        (document.fullscreenEnabled ?? false);

    const enterFullscreen = useCallback(async (): Promise<void> => {
        if (!isSupported || !elementRef.current || isRequestingRef.current) {
            return;
        }

        try {
            isRequestingRef.current = true;
            await elementRef.current.requestFullscreen();
        } catch (error) {
            console.error('[useFullscreen] Ошибка входа в fullscreen:', error);
        } finally {
            isRequestingRef.current = false;
        }
    }, [isSupported, elementRef]);

    const exitFullscreen = useCallback(async (): Promise<void> => {
        if (!isSupported || !document.fullscreenElement || isRequestingRef.current) {
            return;
        }

        try {
            isRequestingRef.current = true;
            await document.exitFullscreen();
        } catch (error) {
            console.error('[useFullscreen] Ошибка выхода из fullscreen:', error);
        } finally {
            isRequestingRef.current = false;
        }
    }, [isSupported]);

    const toggleFullscreen = useCallback(async (): Promise<void> => {
        if (isFullscreen) {
            await exitFullscreen();
        } else {
            await enterFullscreen();
        }
    }, [isFullscreen, enterFullscreen, exitFullscreen]);

    useEffect(() => {
        if (!isSupported) {
            return;
        }

        const handleFullscreenChange = (): void => {
            const isCurrentlyFullscreen = document.fullscreenElement === elementRef.current;
            setIsFullscreen(isCurrentlyFullscreen);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [isSupported, elementRef]);

    return {
        isFullscreen,
        enterFullscreen,
        exitFullscreen,
        toggleFullscreen,
        isSupported
    };
}