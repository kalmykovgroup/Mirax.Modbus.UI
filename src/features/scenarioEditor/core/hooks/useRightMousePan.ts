import { useCallback, useEffect, useRef } from 'react'

type RFViewportApi = {
    getViewport: () => { x: number; y: number; zoom: number }
    setViewport: (vp: { x: number; y: number; zoom: number }, opts?: { duration?: number }) => void
}

export function useRightMousePan(rf: RFViewportApi) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const isPanningRef = useRef(false)

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        // 2 = ПКМ (MouseEvent.button)
        if (e.button !== 2) return
        e.preventDefault()
        isPanningRef.current = true
        containerRef.current?.classList.add('rmb-panning')
    }, [])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const onMove = (e: MouseEvent) => {
            if (!isPanningRef.current) return
            e.preventDefault()

            const { x, y, zoom } = rf.getViewport()
            // движение мыши в пикселях; viewport.x/y тоже в пикселях
            // если направление «наоборот», поменяй знак на минус
            rf.setViewport({ x: x + e.movementX, y: y + e.movementY, zoom })
        }

        const stop = () => {
            if (!isPanningRef.current) return
            isPanningRef.current = false
            el.classList.remove('rmb-panning')
        }

        const preventContext = (e: MouseEvent) => {
            // во время перетаскивания глушим контекстное меню
            if (isPanningRef.current) e.preventDefault()
        }

        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', stop)
        el.addEventListener('contextmenu', preventContext)

        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', stop)
            el.removeEventListener('contextmenu', preventContext)
        }
    }, [rf])

    return { containerRef, onMouseDown }
}
