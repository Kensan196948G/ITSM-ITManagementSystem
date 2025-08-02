import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Divider,
  Fade,
  useTheme,
  useMediaQuery,
  Paper,
  Backdrop,
} from '@mui/material'
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  FullscreenExit as CollapseIcon,
  Fullscreen as ExpandIcon,
} from '@mui/icons-material'
import { DetailPanelProps } from '../../types'
import { ErrorBoundary } from './ErrorBoundary'
import DetailPanelContent from './DetailPanelContent'

const DETAIL_PANEL_WIDTH = 480
const DETAIL_PANEL_MIN_WIDTH = 320
const DETAIL_PANEL_MAX_WIDTH = 800

export const DetailPanel: React.FC<DetailPanelProps> = ({
  isOpen,
  item,
  onClose,
  position = 'right',
  width = DETAIL_PANEL_WIDTH,
  maxWidth = DETAIL_PANEL_MAX_WIDTH,
  minWidth = DETAIL_PANEL_MIN_WIDTH,
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'))
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // レスポンシブ対応：デバイスサイズに応じてパネル設定を調整
  const getResponsiveConfig = () => {
    if (isMobile) {
      return {
        variant: 'temporary' as const,
        anchor: 'bottom' as const,
        width: '100%',
        height: '85vh',
        showBackdrop: true,
      }
    }
    
    if (isTablet) {
      return {
        variant: 'temporary' as const,
        anchor: position as 'right',
        width: Math.min(400, window.innerWidth - 100),
        height: '100vh',
        showBackdrop: true,
      }
    }

    return {
      variant: 'persistent' as const,
      anchor: position as 'right',
      width: isExpanded ? maxWidth : width,
      height: '100vh',
      showBackdrop: false,
    }
  }

  const config = getResponsiveConfig()

  // キーボードナビゲーション対応
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          onClose()
          break
        case 'F5':
          if (event.ctrlKey) {
            event.preventDefault()
            handleRefresh()
          }
          break
        case 'e':
          if (event.ctrlKey && event.altKey) {
            event.preventDefault()
            handleEdit()
          }
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // フォーカス管理
  useEffect(() => {
    if (isOpen && contentRef.current) {
      // パネルが開いたときに適切な要素にフォーカス
      const firstFocusable = contentRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      
      if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 100)
      }
    }
  }, [isOpen, item])

  const handleRefresh = () => {
    if (!item) return
    
    setIsLoading(true)
    // リフレッシュロジック（実際のAPI呼び出しなど）
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  const handleEdit = () => {
    if (!item) return
    // 編集ロジック
    console.log('編集開始:', item)
  }

  const handleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const renderToolbar = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item?.title || '詳細情報'}
        </Typography>
        {item?.subtitle && (
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.subtitle}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* リフレッシュボタン */}
        <IconButton
          onClick={handleRefresh}
          disabled={isLoading}
          size="small"
          aria-label="情報を更新"
          title="情報を更新 (Ctrl+F5)"
        >
          <RefreshIcon />
        </IconButton>

        {/* 編集ボタン */}
        <IconButton
          onClick={handleEdit}
          size="small"
          aria-label="編集"
          title="編集 (Ctrl+Alt+E)"
        >
          <EditIcon />
        </IconButton>

        {/* 展開/縮小ボタン（デスクトップのみ） */}
        {!isMobile && !isTablet && (
          <IconButton
            onClick={handleExpand}
            size="small"
            aria-label={isExpanded ? '縮小' : '展開'}
            title={isExpanded ? '縮小' : '展開'}
          >
            {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        )}

        {/* 閉じるボタン */}
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="詳細パネルを閉じる"
          title="閉じる (Esc)"
        >
          <CloseIcon />
        </IconButton>
      </Box>
    </Box>
  )

  const renderContent = () => {
    if (!item) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: theme.palette.text.secondary,
          }}
        >
          <Typography variant="body1">
            詳細情報を表示するアイテムを選択してください
          </Typography>
        </Box>
      )
    }

    return (
      <ErrorBoundary
        fallback={({ error, resetError }) => (
          <Box sx={{ p: 2 }}>
            <Typography color="error" gutterBottom>
              詳細情報の読み込み中にエラーが発生しました
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {error.message}
            </Typography>
            <IconButton onClick={resetError} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        )}
      >
        <DetailPanelContent 
          item={item}
          onEdit={(updatedItem) => {
            console.log('編集:', updatedItem)
            // 実際の編集処理をここに実装
          }}
          onDelete={(id) => {
            console.log('削除:', id)
            // 実際の削除処理をここに実装
          }}
          onRefresh={(id) => {
            console.log('更新:', id)
            handleRefresh()
          }}
        />
      </ErrorBoundary>
    )
  }

  const drawerProps = {
    open: isOpen,
    onClose: onClose,
    anchor: config.anchor,
    variant: config.variant,
    ModalProps: {
      keepMounted: true, // パフォーマンス向上
      disableScrollLock: true, // スクロールロック無効化
    },
    PaperProps: {
      sx: {
        width: config.width,
        height: config.height,
        maxWidth: maxWidth,
        minWidth: minWidth,
        backgroundColor: theme.palette.background.default,
        borderLeft: config.anchor === 'right' ? `1px solid ${theme.palette.divider}` : 'none',
        borderTop: config.anchor === 'bottom' ? `1px solid ${theme.palette.divider}` : 'none',
        borderRadius: config.anchor === 'bottom' ? '16px 16px 0 0' : 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        // アニメーション設定
        transition: theme.transitions.create(['width', 'height'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      },
      elevation: isMobile ? 16 : 4,
    },
    SlideProps: {
      direction: config.anchor === 'right' ? 'left' : 'up',
    },
  }

  return (
    <>
      {/* モバイル用バックドロップ */}
      {config.showBackdrop && (
        <Backdrop
          open={isOpen}
          onClick={onClose}
          sx={{
            zIndex: theme.zIndex.drawer - 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      <Drawer {...drawerProps}>
        <Fade in={isOpen} timeout={300}>
          <Box
            ref={contentRef}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            role="complementary"
            aria-label="詳細情報パネル"
            aria-expanded={isOpen}
          >
            {renderToolbar()}
            
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                backgroundColor: theme.palette.background.paper,
              }}
            >
              {renderContent()}
            </Box>
          </Box>
        </Fade>
      </Drawer>
    </>
  )
}

export default DetailPanel