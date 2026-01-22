import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { updatePreference } from "../preferences";
import { getTheme, type Theme } from "./themes";

interface ThemeContextValue {
	/** Current theme object */
	theme: Theme;
	/** Current theme key (e.g., "dracula", "nord") */
	themeKey: string;
	/** Preview a theme (doesn't save to preferences) */
	previewTheme: (themeKey: string) => void;
	/** Save and apply a theme (persists to preferences) */
	saveTheme: (themeKey: string) => void;
	/** Cancel preview and revert to saved theme */
	cancelPreview: () => void;
	/** If set, theme is locked by config (but can still preview) */
	configLockedTheme?: string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
	children: React.ReactNode;
	/** Initial theme object (resolved at startup) */
	initialTheme: Theme;
	/** Initial theme key */
	initialThemeKey: string;
	/** If set, theme is locked by config */
	configLockedTheme?: string;
	/** Detected terminal theme (if "terminal" was resolved at startup) */
	terminalTheme?: Theme;
}

export function ThemeProvider({
	children,
	initialTheme,
	initialThemeKey,
	configLockedTheme,
	terminalTheme,
}: ThemeProviderProps) {
	// The "saved" theme key (from config or preferences)
	const [savedThemeKey, setSavedThemeKey] = useState(initialThemeKey);
	// The preview theme key (if user is previewing)
	const [previewThemeKey, setPreviewThemeKey] = useState<string | null>(null);

	// Resolve theme from key, handling "terminal" specially
	const resolveTheme = useMemo(() => {
		return (themeKey: string): Theme => {
			if (themeKey === "terminal" && terminalTheme) {
				return terminalTheme;
			}
			return getTheme(themeKey);
		};
	}, [terminalTheme]);

	// Compute effective theme
	const effectiveThemeKey = previewThemeKey ?? savedThemeKey;
	const theme =
		effectiveThemeKey === initialThemeKey
			? initialTheme
			: resolveTheme(effectiveThemeKey);

	const previewTheme = useCallback((themeKey: string) => {
		setPreviewThemeKey(themeKey);
	}, []);

	const saveTheme = useCallback((themeKey: string) => {
		setPreviewThemeKey(null);
		setSavedThemeKey(themeKey);
		updatePreference("theme", themeKey);
	}, []);

	const cancelPreview = useCallback(() => {
		setPreviewThemeKey(null);
	}, []);

	return (
		<ThemeContext.Provider
			value={{
				theme,
				themeKey: effectiveThemeKey,
				previewTheme,
				saveTheme,
				cancelPreview,
				configLockedTheme,
			}}
		>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
