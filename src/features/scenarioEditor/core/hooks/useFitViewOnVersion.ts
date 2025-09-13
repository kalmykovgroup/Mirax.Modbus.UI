import { useEffect } from 'react'

export function useFitViewOnVersion(rf: { fitView: (opts?: any) => void }, version: string) {
    useEffect(() => {
        queueMicrotask(() => {
            try { rf.fitView({ padding: 0.2 }) } catch {}
        })
    }, [rf, version])
}
