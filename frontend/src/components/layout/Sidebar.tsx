import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Collapse,
  Avatar,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  ConfirmationNumber as TicketIcon,
  People as PeopleIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  Build as ConfigIcon,
  ExpandLess,
  ExpandMore,
  Add as AddIcon,
  List as ListIcon,
  Person as PersonIcon,
  BugReport as IncidentIcon,
  ChangeCircle as ChangeIcon,
  Help as KnowledgeIcon,
} from '@mui/icons-material'
import type { NavItem } from '../../types'

interface SidebarProps {
  onItemClick?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [openItems, setOpenItems] = React.useState<string[]>(['tickets', 'users'])

  const handleItemClick = (path: string, hasChildren: boolean = false) => {
    if (hasChildren) {
      setOpenItems(prev => 
        prev.includes(path) 
          ? prev.filter(item => item !== path)
          : [...prev, path]
      )
    } else {
      navigate(path)
      onItemClick?.()
    }
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const navigationItems: NavItem[] = [
    {
      path: '/dashboard',
      label: 'ダッシュボード',
      icon: 'DashboardIcon',
    },
    {
      path: 'tickets',
      label: 'チケット管理',
      icon: 'TicketIcon',
      children: [
        { path: '/tickets', label: 'チケット一覧', icon: 'ListIcon' },
        { path: '/tickets/create', label: '新規作成', icon: 'AddIcon' },
      ],
    },
    {
      path: 'users',
      label: 'ユーザー管理',
      icon: 'PeopleIcon',
      children: [
        { path: '/users', label: 'ユーザー一覧', icon: 'ListIcon' },
        { path: '/users/create', label: '新規作成', icon: 'AddIcon' },
      ],
    },
    {
      path: '/reports',
      label: 'レポート',
      icon: 'ReportIcon',
    },
    {
      path: '/knowledge',
      label: 'ナレッジベース',
      icon: 'KnowledgeIcon',
    },
    {
      path: '/settings',
      label: '設定',
      icon: 'SettingsIcon',
    },
  ]

  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ElementType } = {
      DashboardIcon,
      TicketIcon,
      PeopleIcon,
      ReportIcon,
      SettingsIcon,
      ConfigIcon,
      AddIcon,
      ListIcon,
      PersonIcon,
      IncidentIcon,
      ChangeIcon,
      KnowledgeIcon,
    }
    const IconComponent = iconMap[iconName] || TicketIcon
    return <IconComponent />
  }

  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const hasChildren = Boolean(item.children?.length)
    const isOpen = openItems.includes(item.path)
    const itemIsActive = hasChildren ? false : isActive(item.path)

    return (
      <React.Fragment key={item.path}>
        <ListItemButton
          onClick={() => handleItemClick(item.path, hasChildren)}
          selected={itemIsActive}
          sx={{
            pl: 2 + depth * 2,
            borderRadius: 1,
            mx: 1,
            mb: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '& .MuiListItemIcon-root': {
                color: 'primary.contrastText',
              },
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            {getIcon(item.icon)}
          </ListItemIcon>
          <ListItemText 
            primary={item.label} 
            primaryTypographyProps={{
              fontSize: depth > 0 ? '0.875rem' : '1rem',
              fontWeight: itemIsActive ? 600 : 400,
            }}
          />
          {hasChildren && (
            isOpen ? <ExpandLess /> : <ExpandMore />
          )}
        </ListItemButton>

        {hasChildren && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map(child => renderNavItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Brand area */}
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'primary.main',
            width: 40,
            height: 40,
            mr: 2,
          }}
        >
          <ConfigIcon />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            ITSM
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Management
          </Typography>
        </Box>
      </Toolbar>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
        <List component="nav" sx={{ px: 1 }}>
          {navigationItems.map(item => renderNavItem(item))}
        </List>

        <Divider sx={{ mx: 2, my: 2 }} />

        {/* Quick access section */}
        <Box sx={{ px: 2, mb: 2 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: 1 }}
          >
            クイックアクセス
          </Typography>
          <List dense>
            <ListItemButton 
              onClick={() => handleItemClick('/tickets/create')}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <IncidentIcon color="error" />
              </ListItemIcon>
              <ListItemText 
                primary="緊急チケット作成" 
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
            </ListItemButton>
          </List>
        </Box>
      </Box>

      {/* Footer info */}
      <Box 
        sx={{ 
          px: 2, 
          py: 1, 
          borderTop: '1px solid', 
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" color="text.secondary" align="center">
          Version 1.0.0
        </Typography>
      </Box>
    </Box>
  )
}

export default Sidebar