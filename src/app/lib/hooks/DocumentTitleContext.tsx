// src/app/lib/hooks/DocumentTitleContext.tsx

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef, type ReactNode,
} from 'react';

interface TitleEntry {
    readonly id: string;
    readonly title: string;
    readonly priority: number;
}

interface DocumentTitleContextValue {
    readonly setTitle: (id: string, title: string, priority: number) => void;
    readonly removeTitle: (id: string) => void;
}

const DocumentTitleContext = createContext<DocumentTitleContextValue | null>(null);

export function DocumentTitleProvider({ children }: { readonly children: ReactNode }) {
    const [titles, setTitles] = useState<Map<string, TitleEntry>>(new Map());

    useEffect(() => {
        if (titles.size === 0) {
            document.title = 'Графики'; // Дефолтный title
            return;
        }

        const entries = Array.from(titles.values());
        const winner = entries.reduce((max, current) =>
            current.priority > max.priority ? current : max
        );

        document.title = winner.title;
    }, [titles]);

    const setTitle = useCallback(
        (id: string, title: string, priority: number) => {
            setTitles((prev) => {
                const next = new Map(prev);
                next.set(id, { id, title, priority });
                return next;
            });
        },
        []
    );

    const removeTitle = useCallback((id: string) => {
        setTitles((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    }, []);

    const value: DocumentTitleContextValue = {
        setTitle,
        removeTitle,
    };

    return (
        <DocumentTitleContext.Provider value={value}>
            {children}
        </DocumentTitleContext.Provider>
    );
}

/**
 * Хук для установки document.title с приоритетом
 *
 * @param title - Заголовок страницы
 * @param priority - Приоритет (больше = важнее)
 * @param enabled - Флаг активности (если false, title не регистрируется)  ДОБАВЛЕНО
 */
export function useDocumentTitle(
    title: string,
    priority: number = 0,
    enabled: boolean = true //  НОВЫЙ ПАРАМЕТР
): void {
    const context = useContext(DocumentTitleContext);

    if (!context) {
        throw new Error('useDocumentTitle must be used within DocumentTitleProvider');
    }

    const { setTitle, removeTitle } = context;

    const componentIdRef = useRef<string>(`title-${Math.random().toString(36).slice(2)}`);
    const componentId = componentIdRef.current;

    useEffect(() => {
        //  Регистрируем title ТОЛЬКО если enabled === true
        if (enabled) {
            setTitle(componentId, title, priority);
        } else {
            // Если disabled, удаляем title (если был зарегистрирован)
            removeTitle(componentId);
        }

        return () => {
            removeTitle(componentId);
        };
    }, [title, priority, enabled, componentId, setTitle, removeTitle]);
}