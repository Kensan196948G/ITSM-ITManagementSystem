import React, { useState, useEffect } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  SwipeableDrawer,
  ListItemButton,
  Collapse,
  Chip,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as TicketIcon,
  People as UsersIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  AccountCircle as ProfileIcon,
  ExpandLess,
  ExpandMore,
  BugReport as IncidentIcon,
  Build as ChangeIcon,
  Help as ProblemIcon,
  Assessment as ReportsIcon,
  Book as KnowledgeIcon,
  ExitToApp as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useResponsive } from '../common/ResponsiveContainer'

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  badge?: number
  children?: NavigationItem[]
}

interface MobileLayoutProps {
  children: React.ReactNode
  user?: {
    name: string
    role: string
    avatar?: string
  }
  notifications?: number
  onThemeToggle?: () => void
  isDarkMode?: boolean
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'ダッシュボード',
    icon: <DashboardIcon />,
    path: '/dashboard',
  },
  {
    id: 'tickets',
    label: 'チケット管理',
    icon: <TicketIcon />,
    path: '/tickets',
    badge: 5,
    children: [
      {
        id: 'incidents',
        label: 'インシデント',
        icon: <IncidentIcon />,
        path: '/tickets/incidents',
        badge: 3,
      },
      {
        id: 'changes',
        label: '変更管理',
        icon: <ChangeIcon />,
        path: '/tickets/changes',
        badge: 1,
      },
      {
        id: 'problems',
        label: '問題管理',
        icon: <ProblemIcon />,
        path: '/tickets/problems',
        badge: 1,
      },
    ],
  },
  {
    id: 'users',
    label: 'ユーザー管理',
    icon: <UsersIcon />,
    path: '/users',
  },
  {
    id: 'reports',
    label: 'レポート',
    icon: <ReportsIcon />,
    path: '/reports',
  },
  {
    id: 'knowledge',
    label: 'ナレッジベース',
    icon: <KnowledgeIcon />,
    path: '/knowledge',
  },
  {
    id: 'settings',
    label: '設定',
    icon: <SettingsIcon />,
    path: '/settings',
  },
]

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  user,
  notifications = 0,
  onThemeToggle,
  isDarkMode = false,
}) => {
  const { isMobile, isTablet } = useResponsive()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [bottomNavValue, setBottomNavValue] = useState(0)

  // Update bottom navigation value based on current path
  useEffect(() => {
    const currentPath = location.pathname
    const mainItems = navigationItems.filter(item => !item.children)
    const currentIndex = mainItems.findIndex(item => 
      currentPath.startsWith(item.path)
    )
    if (currentIndex !== -1) {
      setBottomNavValue(currentIndex)
    }
  }, [location.pathname])

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen)
  }

  const handleItemClick = (item: NavigationItem) => {
    if (item.children) {
      setExpandedItems(prev => ({
        ...prev,
        [item.id]: !prev[item.id]
      }))
    } else {
      navigate(item.path)
      setDrawerOpen(false)
    }
  }

  const handleBottomNavChange = (_: React.SyntheticEvent, newValue: number) => {
    setBottomNavValue(newValue)
    const mainItems = navigationItems.filter(item => !item.children)
    if (mainItems[newValue]) {
      navigate(mainItems[newValue].path)
    }
  }

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems[item.id]
    const isActive = location.pathname === item.path || 
      (hasChildren && item.children?.some(child => location.pathname === child.path))

    return (
      <Box key={item.id}>
        <ListItemButton
          onClick={() => handleItemClick(item)}
          sx={{
            pl: 2 + level * 2,
            bgcolor: isActive ? 'action.selected' : 'transparent',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <ListItemIcon>
            <Badge badgeContent={item.badge} color="error">
              {item.icon}
            </Badge>
          </ListItemIcon>
          <ListItemText 
            primary={item.label}
            primaryTypographyProps={{
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'primary.main' : 'text.primary',
            }}
          />
          {hasChildren && (
            isExpanded ? <ExpandLess /> : <ExpandMore />
          )}
        </ListItemButton>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    )
  }

  const drawerContent = (
    <Box sx={{ width: 280 }}>
      {/* User Profile Section */}
      {user && (
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={user.avatar} sx={{ width: 48, height: 48 }}>
              {user.name.charAt(0)}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {user.name}
              </Typography>
              <Chip 
                label={user.role} 
                size="small" 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'inherit',
                  fontSize: '0.75rem',
                }}
              />
            </Box>
          </Box>
        </Box>
      )}

      <Divider />

      {/* Navigation Items */}
      <List sx={{ py: 1 }}>
        {navigationItems.map(item => renderNavigationItem(item))}
      </List>

      <Divider />

      {/* Additional Actions */}
      <List>
        <ListItemButton onClick={onThemeToggle}>
          <ListItemIcon>
            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </ListItemIcon>
          <ListItemText primary={isDarkMode ? 'ライトモード' : 'ダークモード'} />
        </ListItemButton>
        
        <ListItemButton onClick={() => navigate('/profile')}>
          <ListItemIcon>
            <ProfileIcon />
          </ListItemIcon>
          <ListItemText primary="プロフィール" />
        </ListItemButton>
        
        <ListItemButton onClick={() => console.log('Logout')}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="ログアウト" />
        </ListItemButton>
      </List>
    </Box>
  )

  // Main navigation items for bottom navigation (mobile only)
  const bottomNavItems = navigationItems
    .filter(item => ['dashboard', 'tickets', 'users', 'reports'].includes(item.id))
    .slice(0, 4)

  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Mobile App Bar */}
        <AppBar position="sticky" elevation={1}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
              ITSM Manager
            </Typography>
            <IconButton color="inherit" onClick={() => navigate('/notifications')}>
              <Badge badgeContent={notifications} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Mobile Drawer */}
        <SwipeableDrawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onOpen={() => setDrawerOpen(true)}
        >
          {drawerContent}
        </SwipeableDrawer>

        {/* Main Content */}
        <Box sx={{ 
          flexGrow: 1, 
          pb: 7, // Space for bottom navigation
          overflow: 'auto',
        }}>
          {children}
        </Box>

        {/* Bottom Navigation */}
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000,
          }} 
          elevation={8}
        >
          <BottomNavigation
            value={bottomNavValue}
            onChange={handleBottomNavChange}
            showLabels
            sx={{ height: 64 }}
          >
            {bottomNavItems.map((item, index) => (
              <BottomNavigationAction
                key={item.id}
                label={item.label}
                icon={
                  <Badge badgeContent={item.badge} color="error">
                    {item.icon}
                  </Badge>
                }
                sx={{
                  minWidth: 64,
                  fontSize: '0.75rem',
                }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      </Box>
    )
  }

  // Tablet and Desktop Layout
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={!isTablet || drawerOpen}
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            ITSM Manager
          </Typography>
          {isTablet && (
            <IconButton onClick={handleDrawerToggle} sx={{ ml: 'auto' }}>
              <MenuIcon />
            </IconButton>
          )}
        </Box>
        <Divider />
        {drawerContent}
      </Drawer>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top App Bar (Tablet) */}
        {isTablet && (
          <AppBar position="sticky" color="default" elevation={1}>
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                ITSM Manager
              </Typography>
              <IconButton color="inherit" onClick={() => navigate('/notifications')}>
                <Badge badgeContent={notifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Toolbar>
          </AppBar>
        )}

        {/* Page Content */}
        <Box sx={{ flexGrow: 1, p: isTablet ? 2 : 3, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}

export default MobileLayout