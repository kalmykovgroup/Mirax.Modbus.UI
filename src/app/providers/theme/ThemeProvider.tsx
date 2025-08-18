import React, { createContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
    theme: "dark",
    setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem("theme") as Theme) || "system";
    });

    // Применить тему в <html data-theme="">
    const applyTheme = (t: Theme) => {
        let effectiveTheme = t;
        if (t === "system") {
            const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            effectiveTheme = systemDark ? "dark" : "light";
        }
        document.documentElement.setAttribute("data-theme", effectiveTheme);
    };

    const setTheme = (t: Theme) => {
        localStorage.setItem("theme", t);
        setThemeState(t);
        applyTheme(t);
    };

    useEffect(() => {
        applyTheme(theme);

        // Слушаем изменение системной темы, если выбрана "system"
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const listener = () => {
            if (theme === "system") applyTheme("system");
        };
        mediaQuery.addEventListener("change", listener);
        return () => mediaQuery.removeEventListener("change", listener);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
