import React, { useState, createContext, useContext } from 'react'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import Sidebar from './Sidebar'
import Header from './Header'
import { ErrorBoundary } from '../common/ErrorBoundary'
import DetailPanel from '../common/DetailPanel'
import { useDetailPanel } from '../../hooks/useDetailPanel'
import { DetailPanelItem } from '../../types'

const DRAWER_WIDTH = 280

interface LayoutProps {
  children: React.ReactNode
}

// 詳細パネル用のコンテキスト
interface DetailPanelContextType {
  openDetailPanel: (item: DetailPanelItem, position?: 'right' | 'bottom') => void
  closeDetailPanel: () => void
  updateDetailPanelItem: (item: DetailPanelItem) => void
  isDetailPanelOpen: boolean
  currentItem: DetailPanelItem | null
}

const DetailPanelContext = createContext<DetailPanelContextType | null>(null)

export const useDetailPanelContext = () => {
  const context = useContext(DetailPanelContext)
  if (!context) {
    throw new Error('useDetailPanelContext must be used within a Layout')
  }
  return context
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  // 詳細パネルの状態管理
  const {
    detailPanelState,
    openDetailPanel,
    closeDetailPanel,
    updateDetailPanelItem,
    isDetailPanelOpen,
    currentItem,
  } = useDetailPanel()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  // レスポンシブ対応：詳細パネルの幅を考慮したメインコンテンツの幅調整
  const getMainContentWidth = () => {
    if (isMobile || !isDetailPanelOpen) {
      return { md: `calc(100% - ${DRAWER_WIDTH}px)` }
    }
    
    const detailPanelWidth = detailPanelState.width || 480
    return { md: `calc(100% - ${DRAWER_WIDTH + detailPanelWidth}px)` }
  }

  return (
    <DetailPanelContext.Provider
      value={{
        openDetailPanel,
        closeDetailPanel,
        updateDetailPanelItem,
        isDetailPanelOpen,
        currentItem,
      }}
    >
      <Box sx={{ display: 'flex' }}>
        {/* App Bar */}
        <AppBar
          position="fixed"
          sx={{
            width: getMainContentWidth(),
            ml: { md: `${DRAWER_WIDTH}px` },
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
        <ErrorBoundary
          fallback={({ error, resetError }) => (
            <Toolbar>
              <Typography variant="h6" color="inherit" sx={{ flexGrow: 1 }}>
                ITSM Management System
              </Typography>
              <Typography variant="body2" color="inherit" sx={{ mr: 2 }}>
                Header Error: {error.message}
              </Typography>
              <IconButton color="inherit" onClick={resetError}>
                <MenuIcon />
              </IconButton>
            </Toolbar>
          )}
        >
          <Header 
            onMenuClick={handleDrawerToggle} 
            showMenuButton={isMobile} 
          />
        </ErrorBoundary>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="メインナビゲーション"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          <Sidebar onItemClick={() => setMobileOpen(false)} />
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
          open
        >
          <Sidebar />
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: getMainContentWidth(),
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
          transition: theme.transitions.create(['width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar /> {/* Spacer for fixed AppBar */}
        {children}
      </Box>

      {/* Detail Panel */}
      <DetailPanel
        isOpen={isDetailPanelOpen}
        item={currentItem}
        onClose={closeDetailPanel}
        position={detailPanelState.position}
        width={detailPanelState.width}
      />
    </Box>
    </DetailPanelContext.Provider>
  )
}

export default Layout