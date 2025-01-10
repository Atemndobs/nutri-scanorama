import { createContext, useContext, useEffect, useState } from "react";
const initialState = {
    theme: "dark",
    setTheme: () => null,
};
const ThemeProviderContext = createContext(initialState);
export function ThemeProvider({ children, defaultTheme = "dark", storageKey = "nutri-scan-theme", ...props }) {
    const [theme, setTheme] = useState(() => localStorage.getItem(storageKey) || defaultTheme);
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        // Add black background for iOS status bar in dark mode
        if (theme === 'dark') {
            document.body.classList.add('dark-ios-status');
        }
        else {
            document.body.classList.remove('dark-ios-status');
        }
        localStorage.setItem(storageKey, theme);
    }, [theme, storageKey]);
    const value = {
        theme,
        setTheme: (theme) => {
            setTheme(theme);
        },
    };
    return (<ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>);
}
export const useTheme = () => {
    const context = useContext(ThemeProviderContext);
    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");
    return context;
};
//# sourceMappingURL=theme-provider.jsx.map