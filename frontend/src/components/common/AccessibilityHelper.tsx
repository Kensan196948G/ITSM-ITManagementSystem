import React, { useEffect, useState, useCallback, createContext, useContext } from 'react'
import {
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Zoom,
  Box,
  Typography,
  IconButton,
  Divider,
  Slider,
  Switch,
  FormControlLabel,
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material'
import {
  Accessibility as AccessibilityIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Contrast as ContrastIcon,
  TextFields as TextSizeIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as VolumeOffIcon,
  Keyboard as KeyboardIcon,
  Mouse as MouseIcon,
  Close as CloseIcon,
  MotionPhotosOff as MotionOffIcon,
  PlayArrow as MotionOnIcon,
  Palette as PaletteIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Visibility as VisibilityIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material'

interface AccessibilityState {
  fontSize: number
  lineHeight: number
  highContrast: boolean
  soundEnabled: boolean
  keyboardNavigation: boolean
  reduceMotion: boolean
  screenReaderOptimized: boolean
  focusIndicators: boolean
  colorBlindSupport: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
  readingMode: boolean
  animationSpeed: number
  cursorSize: number
}

interface AccessibilityContextType {
  settings: AccessibilityState
  updateSetting: <K extends keyof AccessibilityState>(key: K, value: AccessibilityState[K]) => void
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  isAccessibilityEnabled: boolean
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider')
  }
  return context
}

interface AccessibilityProviderProps {
  children: React.ReactNode
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilityState>({
    fontSize: 1,
    lineHeight: 1.5,
    highContrast: false,
    soundEnabled: false,
    keyboardNavigation: true,
    reduceMotion: false,
    screenReaderOptimized: false,
    focusIndicators: true,
    colorBlindSupport: 'none',
    readingMode: false,
    animationSpeed: 1,
    cursorSize: 1,
  })

  const [announceElement, setAnnounceElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Create ARIA live region for announcements
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.style.position = 'absolute'
    liveRegion.style.left = '-10000px'
    liveRegion.style.width = '1px'
    liveRegion.style.height = '1px'
    liveRegion.style.overflow = 'hidden'
    document.body.appendChild(liveRegion)
    setAnnounceElement(liveRegion)

    return () => {
      if (liveRegion.parentNode) {
        liveRegion.parentNode.removeChild(liveRegion)
      }
    }
  }, [])

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceElement) {
      announceElement.setAttribute('aria-live', priority)
      announceElement.textContent = message
      
      // Clear after announcement
      setTimeout(() => {
        announceElement.textContent = ''
      }, 1000)
    }
  }, [announceElement])

  const updateSetting = useCallback(<K extends keyof AccessibilityState>(
    key: K,
    value: AccessibilityState[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    applySettings(newSettings)
    localStorage.setItem('accessibility-settings', JSON.stringify(newSettings))
    
    // Announce change
    const settingNames = {
      fontSize: '文字サイズ',
      lineHeight: '行間',
      highContrast: 'ハイコントラスト',
      soundEnabled: '音声フィードバック',
      keyboardNavigation: 'キーボードナビゲーション',
      reduceMotion: 'アニメーション減少',
      screenReaderOptimized: 'スクリーンリーダー最適化',
      focusIndicators: 'フォーカス表示',
      colorBlindSupport: '色覚サポート',
      readingMode: '読み取りモード',
      animationSpeed: 'アニメーション速度',
      cursorSize: 'カーソルサイズ',
    }
    
    announce(`${settingNames[key]}が変更されました`)
  }, [settings, announce])

  const contextValue: AccessibilityContextType = {
    settings,
    updateSetting,
    announce,
    isAccessibilityEnabled: Object.values(settings).some(value => value !== false && value !== 'none' && value !== 1),
  }

  // Load saved settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
        applySettings({ ...settings, ...parsed })
      } catch (error) {
        console.warn('Failed to load accessibility settings:', error)
      }
    }
  }, [])

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  )
}

const AccessibilityHelper: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [helpDialogOpen, setHelpDialogOpen] = useState(false)
  const { settings, updateSetting, announce } = useAccessibility()

  const open = Boolean(anchorEl)

  useEffect(() => {
    // Load accessibility settings from localStorage
    const savedSettings = localStorage.getItem('accessibility-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        // Apply each setting individually using updateSetting
        Object.entries(parsed).forEach(([key, value]) => {
          updateSetting(key as keyof AccessibilityState, value as any)
        })
      } catch (error) {
        console.warn('Failed to parse accessibility settings:', error)
      }
    }

    // Show accessibility helper after a delay
    const timer = setTimeout(() => setIsVisible(true), 2000)
    return () => clearTimeout(timer)
  }, [])



  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const increaseFontSize = () => {
    if (settings.fontSize < 1.5) {
      updateSetting('fontSize', Math.min(settings.fontSize + 0.1, 1.5))
    }
  }

  const decreaseFontSize = () => {
    if (settings.fontSize > 0.8) {
      updateSetting('fontSize', Math.max(settings.fontSize - 0.1, 0.8))
    }
  }

  const toggleHighContrast = () => {
    updateSetting('highContrast', !settings.highContrast)
  }

  const toggleSound = () => {
    updateSetting('soundEnabled', !settings.soundEnabled)
  }

  const toggleKeyboardNav = () => {
    updateSetting('keyboardNavigation', !settings.keyboardNavigation)
  }

  const resetSettings = () => {
    const defaultSettings: AccessibilityState = {
      fontSize: 1,
      lineHeight: 1.5,
      highContrast: false,
      soundEnabled: false,
      keyboardNavigation: true,
      reduceMotion: false,
      screenReaderOptimized: false,
      focusIndicators: true,
      colorBlindSupport: 'none',
      readingMode: false,
      animationSpeed: 1,
      cursorSize: 1,
    }
    Object.entries(defaultSettings).forEach(([key, value]) => {
      updateSetting(key as keyof AccessibilityState, value)
    })
    announce('アクセシビリティ設定がリセットされました')
    handleClose()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) {
        switch (event.key) {
          case '+':
          case '=':
            event.preventDefault()
            increaseFontSize()
            break
          case '-':
            event.preventDefault()
            decreaseFontSize()
            break
          case 'c':
            event.preventDefault()
            toggleHighContrast()
            break
          case 'a':
            event.preventDefault()
            setAnchorEl(document.querySelector('[data-accessibility-btn]') as HTMLElement)
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [settings])

  return (
    <>
      {/* Accessibility styles */}
      <AccessibilityStyles settings={settings} />

      <Zoom in={isVisible}>
        <Fab
          color="primary"
          size="medium"
          onClick={handleClick}
          data-accessibility-btn
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1300,
          }}
          aria-label="アクセシビリティ設定を開く"
        >
          <AccessibilityIcon />
        </Fab>
      </Zoom>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
        PaperProps={{
          sx: { minWidth: 280 },
        }}
      >
        <Box sx={{ px: 2, py: 1, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              アクセシビリティ設定
            </Typography>
            <IconButton size="small" onClick={handleClose} sx={{ color: 'inherit' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
        
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            文字サイズ: {Math.round(settings.fontSize * 100)}%
          </Typography>
          <Slider
            value={settings.fontSize}
            onChange={(_, value) => updateSetting('fontSize', value as number)}
            min={0.8}
            max={1.5}
            step={0.1}
            marks
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
            aria-label="文字サイズ"
          />
        </Box>
        
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            行間: {settings.lineHeight}
          </Typography>
          <Slider
            value={settings.lineHeight}
            onChange={(_, value) => updateSetting('lineHeight', value as number)}
            min={1.2}
            max={2.0}
            step={0.1}
            marks
            valueLabelDisplay="auto"
            aria-label="行間"
          />
        </Box>
        
        <Divider />
        
        <Box sx={{ px: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.highContrast}
                onChange={(e) => updateSetting('highContrast', e.target.checked)}
              />
            }
            label="ハイコントラスト"
          />
        </Box>
        
        <Box sx={{ px: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.reduceMotion}
                onChange={(e) => updateSetting('reduceMotion', e.target.checked)}
              />
            }
            label="アニメーション削減"
          />
        </Box>
        
        <Box sx={{ px: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.screenReaderOptimized}
                onChange={(e) => updateSetting('screenReaderOptimized', e.target.checked)}
              />
            }
            label="スクリーンリーダー最適化"
          />
        </Box>
        
        <Box sx={{ px: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.focusIndicators}
                onChange={(e) => updateSetting('focusIndicators', e.target.checked)}
              />
            }
            label="フォーカス表示強化"
          />
        </Box>
        
        <Box sx={{ px: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.readingMode}
                onChange={(e) => updateSetting('readingMode', e.target.checked)}
              />
            }
            label="読み取りモード"
          />
        </Box>
        
        <Divider />
        
        <MenuItem onClick={resetSettings}>
          <ListItemText
            primary="設定をリセット"
            sx={{ textAlign: 'center', color: 'text.secondary' }}
          />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => setHelpDialogOpen(true)}>
          <ListItemIcon>
            <HelpIcon />
          </ListItemIcon>
          <ListItemText primary="ヘルプとキーボードショートカット" />
        </MenuItem>
        
        <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            アクセシビリティ機能が有効です
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
            {settings.highContrast && <Chip label="ハイコントラスト" size="small" />}
            {settings.reduceMotion && <Chip label="モーション削減" size="small" />}
            {settings.screenReaderOptimized && <Chip label="スクリーンリーダー" size="small" />}
            {settings.fontSize !== 1 && <Chip label={`文字サイズ ${Math.round(settings.fontSize * 100)}%`} size="small" />}
          </Box>
        </Box>
      </Menu>
      
      {/* Help Dialog */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          アクセシビリティヘルプ
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>WCAG 2.1 AA準拠</AlertTitle>
            このシステムはWebアクセシビリティガイドライン WCAG 2.1 AAレベルに準拠しています。
          </Alert>
          
          <Typography variant="h6" gutterBottom>
            キーボードショートカット
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>Alt + A: アクセシビリティメニューを開く</li>
            <li>Alt + +: 文字サイズを大きくする</li>
            <li>Alt + -: 文字サイズを小さくする</li>
            <li>Alt + C: ハイコントラストモードを切り替え</li>
            <li>Tab: 次の要素にフォーカス</li>
            <li>Shift + Tab: 前の要素にフォーカス</li>
            <li>Enter / Space: 選択した要素を実行</li>
            <li>Escape: ダイアログやメニューを閉じる</li>
          </Box>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            機能説明
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li><strong>文字サイズ調整</strong>: 80%から150%まで調整可能</li>
            <li><strong>ハイコントラスト</strong>: コントラスト比を高めて視認性を向上</li>
            <li><strong>アニメーション削減</strong>: 前庭障害の方向けにアニメーションを削減</li>
            <li><strong>スクリーンリーダー最適化</strong>: NVDA、JAWS等に最適化</li>
            <li><strong>フォーカス表示強化</strong>: キーボード操作時の視認性向上</li>
            <li><strong>読み取りモード</strong>: 不要な要素を非表示にして集中力向上</li>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// CSS-in-JS for accessibility styles
const AccessibilityStyles: React.FC<{ settings: AccessibilityState }> = ({ settings }) => {
  const styles = `
    ${settings.fontSize !== 1 ? `
      html { font-size: ${settings.fontSize}rem !important; }
    ` : ''}
    
    ${settings.lineHeight !== 1.5 ? `
      body, p, div { line-height: ${settings.lineHeight} !important; }
    ` : ''}
    
    ${settings.highContrast ? `
      .high-contrast,
      .high-contrast * {
        filter: contrast(150%) brightness(1.2) !important;
      }
      .high-contrast .MuiPaper-root {
        border: 2px solid #000 !important;
        box-shadow: 0 4px 8px rgba(0,0,0,0.5) !important;
      }
      .high-contrast .MuiButton-root {
        border: 2px solid currentColor !important;
      }
    ` : ''}
    
    ${settings.focusIndicators ? `
      .accessibility-focus *:focus,
      .accessibility-focus *:focus-visible {
        outline: 3px solid #0066cc !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.3) !important;
      }
      .accessibility-focus button:focus,
      .accessibility-focus [role="button"]:focus {
        box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5) !important;
      }
    ` : ''}
    
    ${settings.reduceMotion ? `
      .reduce-motion,
      .reduce-motion *,
      .reduce-motion *::before,
      .reduce-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    ` : ''}
    
    ${settings.readingMode ? `
      .reading-mode .MuiAppBar-root,
      .reading-mode .MuiFab-root:not([data-accessibility-btn]),
      .reading-mode .MuiSpeedDial-root,
      .reading-mode [role="banner"],
      .reading-mode [role="complementary"] {
        display: none !important;
      }
      .reading-mode {
        background: #f5f5f5 !important;
      }
      .reading-mode .MuiContainer-root {
        background: white !important;
        box-shadow: 0 0 20px rgba(0,0,0,0.1) !important;
        margin: 20px auto !important;
        padding: 40px !important;
        border-radius: 8px !important;
      }
    ` : ''}
    
    ${settings.screenReaderOptimized ? `
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      .sr-only:focus {
        position: static !important;
        width: auto !important;
        height: auto !important;
        padding: 0.5rem !important;
        margin: 0 !important;
        overflow: visible !important;
        clip: auto !important;
        white-space: normal !important;
        background: #000 !important;
        color: #fff !important;
        text-decoration: none !important;
        border-radius: 4px !important;
      }
    ` : ''}
    
    ${settings.cursorSize !== 1 ? `
      * {
        cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${16 * settings.cursorSize}" height="${16 * settings.cursorSize}" viewBox="0 0 16 16"><path d="M0,0 L0,16 L6,10 L10,16 L16,0 Z" fill="black"/></svg>') 0 0, auto !important;
      }
    ` : ''}
    
    ${settings.colorBlindSupport !== 'none' ? `
      .color-blind-filter {
        filter: ${
          settings.colorBlindSupport === 'protanopia' ? 'url(#protanopia)' :
          settings.colorBlindSupport === 'deuteranopia' ? 'url(#deuteranopia)' :
          settings.colorBlindSupport === 'tritanopia' ? 'url(#tritanopia)' : 'none'
        } !important;
      }
    ` : ''}
  `

  useEffect(() => {
    // Apply body classes
    const body = document.body
    const classes = [
      settings.highContrast && 'high-contrast',
      settings.focusIndicators && 'accessibility-focus',
      settings.reduceMotion && 'reduce-motion',
      settings.readingMode && 'reading-mode',
      settings.screenReaderOptimized && 'screen-reader-optimized',
      settings.colorBlindSupport !== 'none' && 'color-blind-filter',
    ].filter(Boolean) as string[]

    classes.forEach(className => body.classList.add(className))

    return () => {
      classes.forEach(className => body.classList.remove(className))
    }
  }, [settings])

  return <style dangerouslySetInnerHTML={{ __html: styles }} />
}

// Apply accessibility settings globally
const applySettings = (newSettings: AccessibilityState) => {
  // Apply settings that need immediate DOM manipulation
  if (newSettings.fontSize !== 1) {
    document.documentElement.style.fontSize = `${newSettings.fontSize}rem`
  } else {
    document.documentElement.style.fontSize = ''
  }
}

export default AccessibilityHelper