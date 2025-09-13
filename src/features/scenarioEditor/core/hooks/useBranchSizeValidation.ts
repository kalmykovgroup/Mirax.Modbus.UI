import { useEffect } from 'react'
import type { FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode'
import { FlowType } from '@/features/scenarioEditor/shared/contracts/types/FlowType'

/**
 * useBranchSizeValidation
 *
 * Зачем:
 *   Гарантировать, что у всех веток есть валидные размеры (> 0), но
 *   не ловить «ложные» ошибки, когда вкладка скрыта или размеры ещё не проставлены.
 *
 * Как работает:
 *   1) Если документ не видим (document.visibilityState !== 'visible') — ждём события
 *      visibilitychange и повторяем проверку.
 *   2) Когда документ видим — пробуем до MAX_ATTEMPTS раз с шагом в 1 кадр (rAF)
 *      дождаться валидных размеров (React Flow успевает измерить ноды).
 *   3) Если после всех попыток есть ветки без размеров — кидаем ошибку.
 */
export function useBranchSizeValidation(rf: { getNodes: () => FlowNode[] }) {
    useEffect(() => {
        let cancelled = false
        const MAX_ATTEMPTS = 8 // сколько кадров подождать, прежде чем падать
        const isVisible = () => typeof document !== 'undefined' ? document.visibilityState === 'visible' : true

        const collectBadBranches = (): string[] => {
            const all = rf.getNodes() as FlowNode[]
            return all
                .filter(n => n.type === FlowType.branchNode)
                .filter(n => {
                    const w =
                        typeof n.width === 'number'
                            ? n.width
                            : typeof (n.style as any)?.width === 'number'
                                ? (n.style as any).width
                                : 0

                    const h =
                        typeof n.height === 'number'
                            ? n.height
                            : typeof (n.style as any)?.height === 'number'
                                ? (n.style as any).height
                                : 0

                    return !(w > 0 && h > 0)
                })
                .map(n => n.id)
        }

        const validateWithRaf = (attempt = 0) => {
            if (cancelled) return

            // если вкладка скрыта — дождёмся, пока станет видимой, затем начнём цикл заново
            if (!isVisible()) {
                const onVisible = () => {
                    document.removeEventListener('visibilitychange', onVisible)
                    if (!cancelled) requestAnimationFrame(() => validateWithRaf(0))
                }
                document.addEventListener('visibilitychange', onVisible)
                return
            }

            const bad = collectBadBranches()
            if (bad.length === 0) return // всё хорошо

            if (attempt < MAX_ATTEMPTS) {
                // подождём ещё один кадр — RF может ещё мерить ноды
                requestAnimationFrame(() => validateWithRaf(attempt + 1))
                return
            }

            // спустя N кадров размеры не появились — это уже реальная ошибка
            throw new Error(`Invalid scenario: branches without size: ${bad.join(', ')}`)
        }

        // стартуем на микрозадаче, чтобы попасть ПОСЛЕ монтирования RF-компонентов
        queueMicrotask(() => validateWithRaf(0))

        return () => {
            cancelled = true
        }
    }, [rf])
}
