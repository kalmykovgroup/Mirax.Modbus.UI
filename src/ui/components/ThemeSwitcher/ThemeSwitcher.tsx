import React from "react";
import { useTheme } from "@app/providers/theme/useTheme";
import styles from "./ThemeSwitcher.module.css";

function SunIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
            <circle cx="12" cy="12" r="5" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="1" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="23" />
                <line x1="1" y1="12" x2="4" y2="12" />
                <line x1="20" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
                <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
                <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
                <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
            </g>
        </svg>
    );
}

function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
            <path
                fill="currentColor"
                d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
            />
        </svg>
    );
}

export default function ThemeSwitcher({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme(); // "light" | "dark" | (возможен "system")
    const isDark = theme === "dark";        // вправо = тёмная

    const toggle = () => setTheme(isDark ? "light" : "dark");

    return (<>
        <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label="Переключить тему"
            data-checked={isDark ? "true" : "false"}
            className={`${styles.switch} ${className ?? ""}`}
            onClick={toggle}
        >
      <span className={styles.icons} aria-hidden="true">
        <SunIcon className={`${styles.icon} ${styles.sun}`} />
        <MoonIcon className={`${styles.icon} ${styles.moon}`} />
      </span>
            <span className={styles.thumb} aria-hidden="true" />
      </button>
        </>
    );
}
