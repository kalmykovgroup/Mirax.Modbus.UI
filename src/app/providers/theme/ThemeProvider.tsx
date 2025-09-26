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


    const applyTheme = (t: Theme) => {
        const effectiveTheme =
            t === "system"
                ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                : t;

        const root = document.documentElement;
        root.setAttribute("data-theme", effectiveTheme);    // ключевой фикс
        root.classList.toggle("dark", effectiveTheme === "dark"); // для Tailwind-стратегии "class"
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
