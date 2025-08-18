import {useTheme} from "@app/providers/theme/useTheme.ts";

import styles from "./ThemeSwitcher.module.css"

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();

    return (
        <select className={styles.select} value={theme} onChange={(e) => setTheme(e.target.value as any)}>
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
        </select>
    );
}
