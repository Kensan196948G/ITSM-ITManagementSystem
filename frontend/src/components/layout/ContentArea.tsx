/**
 * 右側コンテンツエリアコンポーネント
 * ブレッドクラム、関連メニュー、動的コンテンツローディングを提供
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Breadcrumbs,
  Typography,
  Link,
  Paper,
  Chip,
  Card,
  CardContent,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material'
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  KeyboardArrowRight,
  TrendingUp,
  AccessTime,
  Star,
} from '@mui/icons-material'
import useMenuNavigation from '../../hooks/useMenuNavigation'

interface ContentAreaProps {
  children: React.ReactNode
  loading?: boolean
  error?: string | null
  showRelatedItems?: boolean
  showBreadcrumbs?: boolean
  pageTitle?: string
  pageDescription?: string
  actions?: React.ReactNode
}

const ContentArea: React.FC<ContentAreaProps> = ({
  children,
  loading = false,
  error = null,
  showRelatedItems = true,
  showBreadcrumbs = true,
  pageTitle,
  pageDescription,
  actions,
}) => {
  const theme = useTheme()
  const navigate = useNavigate()
  const {
    navigationState,
    generateBreadcrumbItems,
    getRelatedMenuItems,
    getFrequentlyUsedItems,
    hasPermission,
    currentPage,
    currentSection,
  } = useMenuNavigation()

  // アイコンマッピング（Sidebarと同じ）
  const getIcon = (iconName: string) => {
    // 簡略化したアイコンマッピング
    const iconMap: { [key: string]: React.ElementType } = {
      Dashboard: HomeIcon,
      TrendingUp,
      AccessTime,
      Star,
    }
    const IconComponent = iconMap[iconName] || HomeIcon
    return <IconComponent />
  }

  // ブレッドクラムの生成
  const breadcrumbItems = generateBreadcrumbItems()
  const relatedItems = getRelatedMenuItems(navigationState.currentMenuItem)
  const frequentItems = getFrequentlyUsedItems()

  // 権限チェック
  if (!hasPermission) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          このページにアクセスする権限がありません。
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダーエリア */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: alpha(theme.palette.primary.main, 0.02),
        }}
      >
        {/* ブレッドクラム */}
        {showBreadcrumbs && breadcrumbItems.length > 0 && (
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 2 }}
          >
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/dashboard')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              <HomeIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
              ホーム
            </Link>
            {breadcrumbItems.map((item, index) => (
              item.isLast ? (
                <Typography key={index} color="text.primary" variant="body2">
                  {item.label}
                </Typography>
              ) : (
                <Link
                  key={index}
                  component="button"
                  variant="body2"
                  onClick={() => item.isClickable && navigate(item.path)}
                  sx={{
                    textDecoration: 'none',
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' },
                    cursor: item.isClickable ? 'pointer' : 'default',
                  }}
                >
                  {item.label}
                </Link>
              )
            ))}
          </Breadcrumbs>
        )}

        {/* ページタイトルとアクション */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {pageTitle || currentPage}
            </Typography>
            {(pageDescription || currentSection) && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {pageDescription || `${currentSection}の管理`}
              </Typography>
            )}
            {currentSection && (
              <Chip 
                label={currentSection}
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
          </Box>
          {actions && (
            <Box sx={{ ml: 2 }}>
              {actions}
            </Box>
          )}
        </Box>
      </Paper>

      {/* メインコンテンツエリア */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左側：メインコンテンツ */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box>
              <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
              <Skeleton variant="text" height={40} sx={{ mb: 1 }} />
              <Skeleton variant="text" height={40} sx={{ mb: 1 }} />
              <Skeleton variant="text" height={40} width="60%" />
            </Box>
          ) : (
            children
          )}
        </Box>

        {/* 右側：関連項目 */}
        {showRelatedItems && (relatedItems.length > 0 || frequentItems.length > 0) && (
          <Box sx={{ width: 280, flexShrink: 0, borderLeft: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              {/* よく使用する項目 */}
              {frequentItems.length > 0 && (
                <Card sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      <AccessTime sx={{ fontSize: '1rem', mr: 0.5, verticalAlign: 'middle' }} />
                      最近の使用項目
                    </Typography>
                    <List dense>
                      {frequentItems.map((item, index) => (
                        <ListItemButton
                          key={index}
                          onClick={() => navigate(item.path)}
                          sx={{ 
                            borderRadius: 1,
                            mb: 0.5,
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {getIcon(item.icon.name)}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.label.split(' > ').pop()}
                            primaryTypographyProps={{ fontSize: '0.875rem' }}
                          />
                          <KeyboardArrowRight fontSize="small" color="action" />
                        </ListItemButton>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}

              {/* 関連項目 */}
              {relatedItems.length > 0 && (
                <Card>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      <TrendingUp sx={{ fontSize: '1rem', mr: 0.5, verticalAlign: 'middle' }} />
                      関連項目
                    </Typography>
                    <List dense>
                      {relatedItems.map((item, index) => (
                        <ListItemButton
                          key={index}
                          onClick={() => navigate(item.path)}
                          sx={{ 
                            borderRadius: 1,
                            mb: 0.5,
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {getIcon(item.icon.name)}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.label}
                            secondary={item.description}
                            primaryTypographyProps={{ fontSize: '0.875rem' }}
                            secondaryTypographyProps={{ fontSize: '0.75rem' }}
                          />
                          <KeyboardArrowRight fontSize="small" color="action" />
                        </ListItemButton>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}

              {/* 空の状態 */}
              {relatedItems.length === 0 && frequentItems.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    関連項目はありません
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default ContentArea