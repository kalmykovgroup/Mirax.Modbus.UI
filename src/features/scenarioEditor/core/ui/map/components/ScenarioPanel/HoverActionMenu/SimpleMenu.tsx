import * as React from "react";
import styles from "./SimpleMenu.module.css";

type Action = "play" | "pause" | "resume" | "cancel" | "terminated";

export interface SimpleMenuProps {
    label?: string;
    placement?: "bottom" | "top";
    onAction?: (a: Action) => void;
    className?: string;
}

export function SimpleMenu({
                               label = "Действия",
                               placement = "bottom",
                               onAction,
                               className = "",
                           }: SimpleMenuProps) {
    const detailsRef = React.useRef<HTMLDetailsElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const [open, setOpen] = React.useState(false);

    // следим за состоянием <details open>
    React.useEffect(() => {
        const el = detailsRef.current;
        if (!el) return;
        const onToggle = () => setOpen(el.open);
        el.addEventListener("toggle", onToggle);
        return () => el.removeEventListener("toggle", onToggle);
    }, []);

    // клик вне — закрыть
    React.useEffect(() => {
        if (!open) return;
        const onDocMouseDown = (e: MouseEvent) => {
            const el = detailsRef.current;
            if (el && !el.contains(e.target as Node)) {
                el.removeAttribute("open");
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [open]);

    // Esc — закрыть
    const onKeyDown: React.KeyboardEventHandler<HTMLDetailsElement> = (e) => {
        if (e.key === "Escape" && open) {
            e.preventDefault();
            detailsRef.current?.removeAttribute("open");
            setOpen(false);
        }
    };

    const choose = (a: Action) => () => {
        onAction?.(a);
        detailsRef.current?.removeAttribute("open");
        setOpen(false);
    };

    // === ГЛАВНОЕ: сдвиг по X, если меню вылезает за правый край ===
    const recalcShift = React.useCallback(() => {
        const host = detailsRef.current;
        const menu = menuRef.current;
        if (!host || !menu) return;

        // Сбросить сдвиг перед измерением (важно!)
        menu.style.setProperty("--menu-shift-x", "0px");

        const hostLeft = host.getBoundingClientRect().left; // позиция кнопки относительно окна
        const r = menu.getBoundingClientRect();             // текущие размеры/позиция меню (с left:0)
        const vw = window.innerWidth;
        const margin = 8;                                   // безопасный отступ от края окна

        const overflowRight = r.right + margin - vw;        // насколько «вылезли» вправо
        let shift = 0;

        if (overflowRight > 0) {
            // нельзя сдвинуть сильнее, чем расстояние от левого края окна до кнопки (минус margin)
            const maxShiftLeft = Math.max(0, hostLeft - margin);
            shift = Math.min(overflowRight, maxShiftLeft);
        }

        menu.style.setProperty("--menu-shift-x", `${Math.round(shift)}px`);
    }, []);

    // Пересчёт при открытии, ресайзе, скролле
    React.useEffect(() => {
        if (!open) return;
        // подождём отрисовку меню (тк оно показывается через CSS [open])
        const t = requestAnimationFrame(recalcShift);
        const onWin = () => recalcShift();
        window.addEventListener("resize", onWin, { passive: true });
        window.addEventListener("scroll", onWin, { passive: true });

        return () => {
            cancelAnimationFrame(t);
            window.removeEventListener("resize", onWin);
            window.removeEventListener("scroll", onWin);
        };
    }, [open, recalcShift]);

    return (
        <details
            ref={detailsRef}
            className={[
                styles.wrap,
                placement === "top" ? styles.top : styles.bottom,
                className,
            ].join(" ")}
            onKeyDown={onKeyDown}
        >
            <summary className={styles.trigger} aria-haspopup="menu" aria-expanded={open}>
                {label}
                <span className={styles.chev} aria-hidden>▾</span>
            </summary>

            {/* Показ/скрытие управляется CSS через .wrap[open] .menu
          Сдвиг по X — через CSS var(--menu-shift-x), которую мы выставляем из JS */}
            <div ref={menuRef} className={styles.menu} role="menu">
                <button className={styles.item} role="menuitem" onClick={choose("play")}>Запустить</button>
                <button className={styles.item} role="menuitem" onClick={choose("pause")}>Пауза</button>
                <button className={styles.item} role="menuitem" onClick={choose("resume")}>Продолжить</button>
                <button className={styles.item} role="menuitem" onClick={choose("cancel")}>Отменить</button>
                <button className={styles.item} role="menuitem" onClick={choose("terminated")}>Принудительно завершить</button>
            </div>
        </details>
    );
}
