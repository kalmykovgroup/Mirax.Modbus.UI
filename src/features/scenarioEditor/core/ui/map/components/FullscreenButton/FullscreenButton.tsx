// src/features/scenarioEditor/core/ui/map/components/FullscreenButton/FullscreenButton.tsx

import { useState, useEffect, useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import styles from './FullscreenButton.module.css';

interface FullscreenButtonProps {
    targetRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Кнопка для переключения полноэкранного режима
 */
export function FullscreenButton({ targetRef }: FullscreenButtonProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Проверяем, находимся ли мы в полноэкранном режиме
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = async () => {
        if (!targetRef.current) return;

        try {
            if (!isFullscreen) {
                // Входим в полноэкранный режим
                if (targetRef.current.requestFullscreen) {
                    await targetRef.current.requestFullscreen();
                } else if ((targetRef.current as any).webkitRequestFullscreen) {
                    await (targetRef.current as any).webkitRequestFullscreen();
                } else if ((targetRef.current as any).mozRequestFullScreen) {
                    await (targetRef.current as any).mozRequestFullScreen();
                } else if ((targetRef.current as any).msRequestFullscreen) {
                    await (targetRef.current as any).msRequestFullscreen();
                }
            } else {
                // Выходим из полноэкранного режима
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                } else if ((document as any).mozCancelFullScreen) {
                    await (document as any).mozCancelFullScreen();
                } else if ((document as any).msExitFullscreen) {
                    await (document as any).msExitFullscreen();
                }
            }
        } catch (error) {
            console.error('Ошибка при переключении полноэкранного режима:', error);
        }
    };

    return (
        <button
            className={styles.fullscreenButton}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Открыть на весь экран'}
            aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Открыть на весь экран'}
        >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
    );
}
