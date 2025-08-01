import React, { useEffect, useState } from 'react'
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
} from '@mui/material'
import {
  Accessibility as AccessibilityIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Contrast as ContrastIcon,
  TextFields as TextSizeIcon,
  VolumeUp as VolumeIcon,
  Keyboard as KeyboardIcon,
  Close as CloseIcon,
} from '@mui/icons-material'

interface AccessibilityState {
  fontSize: number
  highContrast: boolean
  soundEnabled: boolean
  keyboardNavigation: boolean
}

const AccessibilityHelper: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [settings, setSettings] = useState<AccessibilityState>({
    fontSize: 1,
    highContrast: false,
    soundEnabled: false,
    keyboardNavigation: true,
  })
  const [isVisible, setIsVisible] = useState(false)

  const open = Boolean(anchorEl)

  useEffect(() => {
    // Load accessibility settings from localStorage
    const savedSettings = localStorage.getItem('accessibility-settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      setSettings(parsed)
      applySettings(parsed)
    }

    // Show accessibility helper after a delay
    const timer = setTimeout(() => setIsVisible(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const applySettings = (newSettings: AccessibilityState) => {
    // Apply font size
    document.documentElement.style.fontSize = `${newSettings.fontSize}rem`
    
    // Apply high contrast
    if (newSettings.highContrast) {
      document.body.classList.add('high-contrast')
    } else {
      document.body.classList.remove('high-contrast')
    }

    // Apply keyboard navigation styles
    if (newSettings.keyboardNavigation) {
      document.body.classList.add('keyboard-nav')
    } else {
      document.body.classList.remove('keyboard-nav')
    }
  }

  const updateSetting = <K extends keyof AccessibilityState>(
    key: K,
    value: AccessibilityState[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    applySettings(newSettings)
    localStorage.setItem('accessibility-settings', JSON.stringify(newSettings))
  }

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
      highContrast: false,
      soundEnabled: false,
      keyboardNavigation: true,
    }
    setSettings(defaultSettings)
    applySettings(defaultSettings)
    localStorage.setItem('accessibility-settings', JSON.stringify(defaultSettings))
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
            setAnchorEl(document.querySelector('[data-accessibility-btn]'))
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [settings])

  return (
    <>
      {/* High contrast styles */}
      <style>{`
        .high-contrast {
          filter: contrast(150%) brightness(1.2);
        }
        .high-contrast .MuiPaper-root {
          border: 2px solid #000 !important;
        }
        .keyboard-nav *:focus {
          outline: 3px solid #0066cc !important;
          outline-offset: 2px !important;
        }
        .keyboard-nav button:focus,
        .keyboard-nav [role="button"]:focus {
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5) !important;
        }
      `}</style>

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
        
        <MenuItem onClick={increaseFontSize} disabled={settings.fontSize >= 1.5}>
          <ListItemIcon>
            <ZoomInIcon />
          </ListItemIcon>
          <ListItemText
            primary="文字を大きくする"
            secondary="Alt + +"
          />
        </MenuItem>
        
        <MenuItem onClick={decreaseFontSize} disabled={settings.fontSize <= 0.8}>
          <ListItemIcon>
            <ZoomOutIcon />
          </ListItemIcon>
          <ListItemText
            primary="文字を小さくする"
            secondary="Alt + -"
          />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={toggleHighContrast}>
          <ListItemIcon>
            <ContrastIcon />
          </ListItemIcon>
          <ListItemText
            primary={settings.highContrast ? 'ハイコントラストを無効' : 'ハイコントラストを有効'}
            secondary="Alt + C"
          />
        </MenuItem>
        
        <MenuItem onClick={toggleSound}>
          <ListItemIcon>
            <VolumeIcon />
          </ListItemIcon>
          <ListItemText
            primary={settings.soundEnabled ? '音声フィードバックを無効' : '音声フィードバックを有効'}
          />
        </MenuItem>
        
        <MenuItem onClick={toggleKeyboardNav}>
          <ListItemIcon>
            <KeyboardIcon />
          </ListItemIcon>
          <ListItemText
            primary={settings.keyboardNavigation ? 'キーボードナビゲーションを無効' : 'キーボードナビゲーションを有効'}
          />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={resetSettings}>
          <ListItemText
            primary="設定をリセット"
            sx={{ textAlign: 'center', color: 'text.secondary' }}
          />
        </MenuItem>
        
        <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            現在の文字サイズ: {Math.round(settings.fontSize * 100)}%
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            キーボードショートカット: Alt + A でメニューを開く
          </Typography>
        </Box>
      </Menu>
    </>
  )
}

export default AccessibilityHelper