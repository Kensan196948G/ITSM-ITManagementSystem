import React, { useState, useEffect, useMemo } from 'react'
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
  TextField,
  InputAdornment,
  Badge,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Fade,
  alpha,
} from '@mui/material'
import {
  // Dashboard & Analytics
  Dashboard,
  Analytics,
  Timeline,
  MonitorHeart,
  BarChart,
  ShowChart,
  TrendingUp,
  PieChart,
  Assessment,
  
  // Incident & Problem Management
  BugReport,
  ErrorOutline,
  PauseCircleOutline,
  CheckCircleOutline,
  SearchOff,
  FolderOpen,
  FindInPage,
  FolderOff,
  Psychology,
  BookmarkBorder,
  Shield,
  
  // Change & Release Management
  ChangeCircle,
  Add,
  EditNote,
  Approval,
  Schedule,
  DoneAll,
  Groups,
  CalendarMonth,
  ReportProblem as Emergency,
  RocketLaunch,
  Upcoming,
  PlayArrow,
  CheckCircle,
  Event,
  Undo,
  Science,
  
  // Configuration Management
  Inventory,
  Computer,
  Apps,
  Hub,
  CloudQueue,
  AccountTree,
  Layers,
  FactCheck,
  
  // Service Catalog
  ViewList,
  Archive,
  Speed,
  RequestPage,
  LibraryBooks,
  
  // Capacity & Availability
  Storage,
  Accessibility,
  
  // User & Organization
  People,
  List as ListIcon,
  PersonAdd,
  Group,
  Security,
  CorporateFare,
  VpnKey,
  
  // System Management
  Settings,
  Tune,
  Email,
  Timer,
  AccountTree as WorkFlow,
  Notifications,
  
  // Knowledge Management
  MenuBook,
  Article,
  CreateNewFolder,
  Category,
  Quiz,
  Assignment,
  School,
  
  // UI Controls
  ExpandLess,
  ExpandMore,
  Search,
  Star,
  StarBorder,
  Build as ConfigIcon,
  FileDownload,
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import { 
  itsmMenuStructure, 
  getQuickAccessItems, 
  filterMenuByPermissions,
  getFlatMenuItems,
  type MenuItem,
  type MenuSection 
} from './MenuStructure'

interface SidebarProps {
  onItemClick?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { authState } = useAuth()
  
  // 状態管理
  const [openSections, setOpenSections] = useState<string[]>(['dashboard', 'incident-management'])
  const [openItems, setOpenItems] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [showSearch, setShowSearch] = useState(false)

  // ローカルストレージからお気に入りを復元
  useEffect(() => {
    const savedFavorites = localStorage.getItem('itsm-sidebar-favorites')
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }
    
    const savedOpenSections = localStorage.getItem('itsm-sidebar-open-sections')
    if (savedOpenSections) {
      setOpenSections(JSON.parse(savedOpenSections))
    }
  }, [])

  // お気に入りの保存
  useEffect(() => {
    localStorage.setItem('itsm-sidebar-favorites', JSON.stringify(favorites))
  }, [favorites])

  // 開いているセクションの保存
  useEffect(() => {
    localStorage.setItem('itsm-sidebar-open-sections', JSON.stringify(openSections))
  }, [openSections])

  // ユーザー権限に基づいてフィルタリングされたメニュー
  const filteredMenuStructure = useMemo(() => {
    const userRoles = authState.user?.roles || []
    return itsmMenuStructure.map(section => ({
      ...section,
      items: filterMenuByPermissions(section.items, userRoles)
    })).filter(section => section.items.length > 0)
  }, [authState.user?.roles])

  // 検索結果
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const flatItems = getFlatMenuItems()
    return flatItems.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10)
  }, [searchQuery])

  // ナビゲーション処理
  const handleItemClick = (path: string, hasChildren: boolean = false, sectionId?: string) => {
    if (hasChildren) {
      if (sectionId) {
        // セクションの開閉
        setOpenSections(prev => 
          prev.includes(sectionId) 
            ? prev.filter(id => id !== sectionId)
            : [...prev, sectionId]
        )
      } else {
        // アイテムの開閉
        setOpenItems(prev => 
          prev.includes(path) 
            ? prev.filter(item => item !== path)
            : [...prev, path]
        )
      }
    } else {
      navigate(path)
      setSearchQuery('')
      setShowSearch(false)
      onItemClick?.()
    }
  }

  // アクティブ状態の判定
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  // お気に入りの切り替え
  const toggleFavorite = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setFavorites(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  // アイコンマッピング
  const getIcon = (iconName: string, color?: string) => {
    const iconMap: { [key: string]: React.ElementType } = {
      // Dashboard & Analytics
      Dashboard,
      Analytics,
      Timeline,
      MonitorHeart,
      BarChart,
      ShowChart,
      TrendingUp,
      PieChart,
      Assessment,
      
      // Incident & Problem Management
      BugReport,
      ErrorOutline,
      PauseCircleOutline,
      CheckCircleOutline,
      SearchOff,
      FolderOpen,
      FindInPage,
      FolderOff,
      Psychology,
      BookmarkBorder,
      Shield,
      
      // Change & Release Management
      ChangeCircle,
      Add,
      EditNote,
      Approval,
      Schedule,
      DoneAll,
      Groups,
      CalendarMonth,
      Emergency,
      RocketLaunch,
      Upcoming,
      PlayArrow,
      CheckCircle,
      Event,
      Undo,
      Science,
      
      // Configuration Management
      Inventory,
      Computer,
      Apps,
      Hub,
      CloudQueue,
      AccountTree,
      Layers,
      FactCheck,
      
      // Service Catalog
      ViewList,
      Archive,
      Speed,
      RequestPage,
      LibraryBooks,
      
      // Capacity & Availability
      Storage,
      Accessibility,
      
      // User & Organization
      People,
      List: ListIcon,
      PersonAdd,
      Group,
      Security,
      CorporateFare,
      VpnKey,
      
      // System Management
      Settings,
      Tune,
      Email,
      Timer,
      WorkFlow,
      Notifications,
      
      // Knowledge Management
      MenuBook,
      Article,
      CreateNewFolder,
      Category,
      Quiz,
      Assignment,
      School,
      
      // UI Controls
      ConfigIcon,
      FileDownload,
    }
    
    const IconComponent = iconMap[iconName] || Dashboard
    return <IconComponent color={color as any} />
  }

  // メニューアイテムのレンダリング
  const renderMenuItem = (item: MenuItem, depth: number = 0) => {
    const hasChildren = Boolean(item.children?.length)
    const isOpen = openItems.includes(item.id)
    const itemIsActive = hasChildren ? false : isActive(item.path)
    const isFavorite = favorites.includes(item.id)

    return (
      <React.Fragment key={item.id}>
        <ListItemButton
          onClick={() => handleItemClick(item.path, hasChildren)}
          selected={itemIsActive}
          sx={{
            pl: 2 + depth * 1.5,
            pr: 1,
            borderRadius: 1,
            mx: 1,
            mb: 0.5,
            minHeight: 44,
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
            '&:hover': {
              backgroundColor: alpha('#000', 0.04),
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {item.badge ? (
              <Badge 
                badgeContent={item.badge.count || item.badge.text}
                color={item.badge.color || 'error'}
                max={99}
                variant={item.badge.text ? 'standard' : 'standard'}
              >
                {getIcon(item.icon.name, item.icon.color)}
              </Badge>
            ) : (
              getIcon(item.icon.name, item.icon.color)
            )}
          </ListItemIcon>
          <ListItemText 
            primary={item.label}
            secondary={depth === 0 && item.description ? item.description : undefined}
            primaryTypographyProps={{
              fontSize: depth > 0 ? '0.875rem' : '1rem',
              fontWeight: itemIsActive ? 600 : 500,
              noWrap: true,
            }}
            secondaryTypographyProps={{
              fontSize: '0.75rem',
              noWrap: true,
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {!hasChildren && (
              <Tooltip title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}>
                <IconButton
                  size="small"
                  onClick={(e) => toggleFavorite(item.id, e)}
                  sx={{ 
                    opacity: 0.7,
                    '&:hover': { opacity: 1 }
                  }}
                >
                  {isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
            {hasChildren && (
              isOpen ? <ExpandLess /> : <ExpandMore />
            )}
          </Box>
        </ListItemButton>

        {hasChildren && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map(child => renderMenuItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
        
        {item.dividerAfter && <Divider sx={{ mx: 2, my: 1 }} />}
      </React.Fragment>
    )
  }

  // セクションのレンダリング
  const renderSection = (section: MenuSection) => {
    const isOpen = openSections.includes(section.id)
    
    return (
      <Box key={section.id} sx={{ mb: 1 }}>
        <ListItemButton
          onClick={() => handleItemClick('', true, section.id)}
          sx={{
            pl: 2,
            pr: 1,
            py: 1,
            mx: 1,
            borderRadius: 1,
            backgroundColor: alpha('#000', 0.02),
            '&:hover': {
              backgroundColor: alpha('#000', 0.06),
            },
          }}
        >
          <ListItemText
            primary={section.title}
            primaryTypographyProps={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          />
          {isOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        
        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {section.items.map(item => renderMenuItem(item))}
          </List>
        </Collapse>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Brand area */}
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
              Management System
            </Typography>
          </Box>
        </Box>
        <Tooltip title="検索">
          <IconButton 
            size="small"
            onClick={() => setShowSearch(!showSearch)}
            sx={{ 
              color: showSearch ? 'primary.main' : 'text.secondary'
            }}
          >
            <Search />
          </IconButton>
        </Tooltip>
      </Toolbar>

      {/* Search Bar */}
      <Fade in={showSearch}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="メニューを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            autoFocus
          />
          {searchResults.length > 0 && (
            <Paper 
              elevation={4}
              sx={{ 
                mt: 1, 
                maxHeight: 200, 
                overflow: 'auto',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <List dense>
                {searchResults.map((item) => (
                  <ListItemButton
                    key={item.id}
                    onClick={() => handleItemClick(item.path)}
                    sx={{ py: 0.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getIcon(item.icon.name, item.icon.color)}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      secondary={item.description}
                      primaryTypographyProps={{ fontSize: '0.875rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      </Fade>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
        {/* お気に入りセクション */}
        {favorites.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ fontWeight: 600, letterSpacing: 1, fontSize: '0.75rem' }}
              >
                <Star fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                お気に入り
              </Typography>
            </Box>
            <List dense sx={{ px: 1 }}>
              {favorites.map(favoriteId => {
                const flatItems = getFlatMenuItems()
                const favoriteItem = flatItems.find(item => item.id === favoriteId)
                if (!favoriteItem) return null
                
                return (
                  <ListItemButton
                    key={favoriteId}
                    onClick={() => handleItemClick(favoriteItem.path)}
                    selected={isActive(favoriteItem.path)}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      mb: 0.5,
                      pl: 2,
                      minHeight: 36,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        '& .MuiListItemIcon-root': {
                          color: 'primary.contrastText',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getIcon(favoriteItem.icon.name, favoriteItem.icon.color)}
                    </ListItemIcon>
                    <ListItemText
                      primary={favoriteItem.label.split(' > ').pop()}
                      primaryTypographyProps={{ fontSize: '0.875rem', noWrap: true }}
                    />
                  </ListItemButton>
                )
              })}
            </List>
            <Divider sx={{ mx: 2, my: 1 }} />
          </Box>
        )}

        {/* メインナビゲーション */}
        <List component="nav" sx={{ px: 0 }}>
          {filteredMenuStructure.map(section => renderSection(section))}
        </List>

        {/* クイックアクセスセクション */}
        {getQuickAccessItems().length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mx: 2, mb: 2 }} />
            <Box sx={{ px: 2, py: 1 }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ fontWeight: 600, letterSpacing: 1, fontSize: '0.75rem' }}
              >
                クイックアクセス
              </Typography>
            </Box>
            <List dense sx={{ px: 1 }}>
              {getQuickAccessItems().map(item => (
                <ListItemButton
                  key={item.id}
                  onClick={() => handleItemClick(item.path)}
                  sx={{
                    borderRadius: 1,
                    mx: 1,
                    mb: 0.5,
                    pl: 2,
                    minHeight: 36,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {getIcon(item.icon.name, item.icon.color)}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: '0.875rem', noWrap: true }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        )}
      </Box>

      {/* Footer info */}
      <Box 
        sx={{ 
          px: 2, 
          py: 1.5, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          ITSM v1.0.0
        </Typography>
        <Chip 
          label={authState.user?.name || 'User'}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.75rem' }}
        />
      </Box>
    </Box>
  )
}

export default Sidebar