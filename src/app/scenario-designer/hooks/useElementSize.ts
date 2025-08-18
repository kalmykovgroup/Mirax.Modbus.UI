// src/app/scenario-designer/components/JumpStepNode/useElementSize.ts
import { useEffect, useRef, useState } from 'react';

export function useElementSize<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!ref.current) return;
        const el = ref.current;
        const ro = new ResizeObserver(entries => {
            for (const e of entries) {
                const cr = e.contentRect;
                setSize({ width: cr.width, height: cr.height });
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return [ref, size] as const;
}
