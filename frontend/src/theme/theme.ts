import { createTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    tertiary: Palette['primary']
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions['primary']
  }
}

// ITSM色パレット - ITサービス管理に適したプロフェッショナルな色合い
export const theme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // 信頼性を表現するブルー
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9c27b0', // アクション要素に使用するパープル
      light: '#ba68c8',
      dark: '#7b1fa2',
      contrastText: '#ffffff',
    },
    tertiary: {
      main: '#ff6f00', // 警告・注意項目用のオレンジ
      light: '#ff9800',
      dark: '#e65100',
      contrastText: '#ffffff',
    },
    error: {
      main: '#d32f2f', // 重要度Critical用の赤
      light: '#ef5350',
      dark: '#c62828',
    },
    warning: {
      main: '#ff9800', // 重要度High用のオレンジ
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#0288d1', // 情報表示用のライトブルー
      light: '#03a9f4',
      dark: '#01579b',
    },
    success: {
      main: '#2e7d32', // 成功・解決済み用のグリーン
      light: '#4caf50',
      dark: '#1b5e20',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 300,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 300,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 400,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 400,
      lineHeight: 1.2,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 400,
      lineHeight: 1.2,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.75,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.75,
      textTransform: 'none', // ボタンテキストの大文字変換を無効化
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.66,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 2.66,
      textTransform: 'uppercase',
    },
  },
  spacing: 8, // 8pxベースのスペーシング
  shape: {
    borderRadius: 8, // 角丸の基本値
  },
  components: {
    // アプリケーション全体のデザイン統一
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#c1c1c1 #f1f1f1',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#c1c1c1',
            minHeight: 24,
          },
          '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
            backgroundColor: '#a8a8a8',
          },
          '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
            backgroundColor: '#a8a8a8',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#a8a8a8',
          },
          '&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner': {
            backgroundColor: '#f1f1f1',
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: '#f1f1f1',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // デフォルトのグラデーションを無効化
        },
        elevation1: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
        },
        elevation2: {
          boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.16), 0px 3px 6px rgba(0, 0, 0, 0.23)',
        },
        elevation4: {
          boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.19), 0px 6px 6px rgba(0, 0, 0, 0.23)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.16)',
          },
        },
        containedPrimary: {
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(25, 118, 210, 0.24)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f5f5f5',
          '& .MuiTableCell-head': {
            fontWeight: 600,
            color: 'rgba(0, 0, 0, 0.87)',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.12)',
            },
          },
        },
      },
    },
  },
})

// 優先度別カラーマッピング
export const priorityColors = {
  critical: theme.palette.error.main,
  high: theme.palette.warning.main,
  medium: theme.palette.info.main,
  low: theme.palette.success.main,
}

// ステータス別カラーマッピング
export const statusColors = {
  open: theme.palette.error.main,
  in_progress: theme.palette.warning.main,
  resolved: theme.palette.success.main,
  closed: theme.palette.grey[500],
  on_hold: theme.palette.grey[600],
}