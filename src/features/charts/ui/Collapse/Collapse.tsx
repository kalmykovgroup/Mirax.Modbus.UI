import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import cls from './Collapse.module.css';

type Props = {
    open: boolean;
    /** мс */
    duration?: number | undefined;
    /** задержка мс (редко нужно) */
    delay?: number | undefined;
    /** доп. класс контейнера */
    className?: string | undefined;
    children: React.ReactNode;
};

export default function Collapse({
                                     open,
                                     duration = 220,
                                     delay = 0,
                                     className,
                                     children,
                                 }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [inlineStyle, setInlineStyle] = useState<React.CSSProperties>({
        height: open ? 'auto' : 0,
        overflow: 'hidden',
    });

    // Когда open меняется — анимируем высоту от текущей до целевой
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        const currentHeight = el.getBoundingClientRect().height;
        const targetHeight = open ? el.scrollHeight : 0;

        // старт: выставляем текущую высоту (числом), чтобы был переход
        setInlineStyle({
            height: currentHeight,
            overflow: 'hidden',
            transition: `height ${duration}ms ease, opacity ${duration}ms ease, transform ${duration}ms ease`,
            transitionDelay: `${delay}ms`,
            opacity: open ? 0 : 1,
            transform: open ? 'translateY(-6px)' : 'translateY(0)',
        });

        // следующий тик — выставляем целевую высоту
        const id = requestAnimationFrame(() => {
            setInlineStyle({
                height: targetHeight,
                overflow: 'hidden',
                transition: `height ${duration}ms ease, opacity ${duration}ms ease, transform ${duration}ms ease`,
                transitionDelay: `${delay}ms`,
                opacity: open ? 1 : 0,
                transform: open ? 'translateY(0)' : 'translateY(-6px)',
            });
        });

        return () => cancelAnimationFrame(id);
    }, [open, duration, delay]);

    // После завершения анимации, когда открыт — освобождаем высоту = 'auto'
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const onEnd = (e: TransitionEvent) => {
            if (e.propertyName !== 'height') return;
            setInlineStyle((s) => ({
                ...s,
                height: open ? 'auto' : 0,
                // оставляем overflow hidden, чтобы при закрытом не торчали края
            }));
        };
        el.addEventListener('transitionend', onEnd);
        return () => el.removeEventListener('transitionend', onEnd);
    }, [open]);

    return (
        <div
            ref={ref}
            className={`${cls.collapse} ${open ? cls.open : cls.closed} ${className ?? ''}`}
            style={inlineStyle}
            aria-hidden={!open}
        >
            <div className={cls.inner}>{children}</div>
        </div>
    );
}
