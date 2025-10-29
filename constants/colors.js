// constants/colors.js
const palette = {
    primary: '#4F46E5', 
    primaryDark: '#4338CA',
    primaryLight: '#6366F1',
    success: '#10B981', 
    danger: '#EF4444', 
    warning: '#F59E0B', 
    accent: '#3B82F6', 
    
    gray900: '#111827',
    gray700: '#374151',
    gray500: '#6B7280',
    gray300: '#D1D5DB',
    gray100: '#F3F4F6',
    white: '#FFFFFF',
};

export const lightTheme = {
    background: palette.gray100,
    surface: palette.white,
    primary: palette.primary,
    accent: palette.accent,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
    text: palette.gray900,
    textSecondary: palette.gray500,
    textOnPrimary: palette.white,
    border: palette.gray300,
    disabled: palette.gray300,
};

export const darkTheme = {
    background: palette.gray900,
    surface: '#1F2937', 
    primary: palette.primaryLight,
    accent: palette.accent,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
    text: palette.gray100,
    textSecondary: palette.gray500,
    textOnPrimary: palette.white,
    border: palette.gray700,
    disabled: palette.gray700,
};