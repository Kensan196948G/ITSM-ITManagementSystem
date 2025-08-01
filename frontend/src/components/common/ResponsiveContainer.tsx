import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Drawer,
  IconButton,
  Fab,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  Typography,
  Collapse,
  Card,
  CardContent,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Slide,
  SwipeableDrawer,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  KeyboardArrowUp as ScrollTopIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { TransitionProps } from '@mui/material/transitions'

// Responsive breakpoints configuration
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
} as const

// Mobile-specific transition components
const SlideTransition = React.forwardRef<
  unknown,
  TransitionProps & { children: React.ReactElement }
>((props, ref) => <Slide direction="up" ref={ref} {...props} />)

SlideTransition.displayName = 'SlideTransition'

// Hook for responsive behavior
export const useResponsive = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'))
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))
  const isXsScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'))

  return {
    isMobile,
    isTablet,
    isDesktop,
    isXsScreen,
    isSmallScreen,
    currentBreakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
  }
}

// Responsive grid configuration
export const getResponsiveGridProps = (
  mobile: number = 12,
  tablet: number = 6,
  desktop: number = 4
) => ({
  xs: mobile,
  sm: tablet,
  md: desktop,
})

// Responsive spacing utility
export const getResponsiveSpacing = (
  mobile: number = 1,
  tablet: number = 2,
  desktop: number = 3
) => ({
  xs: mobile,
  sm: tablet,
  md: desktop,
})

// Mobile-optimized container component
interface ResponsiveContainerProps {
  children: React.ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  padding?: number | string
  mobilePadding?: number | string
  className?: string
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'lg',
  padding = 3,
  mobilePadding = 1,
  className,
}) => {
  const { isMobile } = useResponsive()

  return (
    <Container
      maxWidth={maxWidth}
      className={className}
      sx={{
        px: isMobile ? mobilePadding : padding,
        py: isMobile ? 1 : 2,
      }}
    >
      {children}
    </Container>
  )
}

// Mobile-optimized card component
interface MobileCardProps {
  children: React.ReactNode
  title?: string
  collapsible?: boolean
  defaultExpanded?: boolean
  actions?: React.ReactNode
  dense?: boolean
}

export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  title,
  collapsible = false,
  defaultExpanded = true,
  actions,
  dense = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const { isMobile } = useResponsive()

  return (
    <Card
      sx={{
        mb: isMobile ? 1 : 2,
        boxShadow: isMobile ? 1 : 3,
      }}
    >
      {title && (
        <Box
          sx={{
            p: dense ? 1 : 2,
            pb: collapsible && !expanded ? (dense ? 1 : 2) : 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: collapsible ? 'pointer' : 'default',
          }}
          onClick={collapsible ? () => setExpanded(!expanded) : undefined}
        >
          <Typography
            variant={isMobile ? 'h6' : 'h5'}
            sx={{
              fontWeight: 600,
              fontSize: isMobile ? '1.1rem' : '1.25rem',
            }}
          >
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {actions}
            {collapsible && (
              <IconButton size="small">
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Box>
        </Box>
      )}
      <Collapse in={!collapsible || expanded}>
        <CardContent
          sx={{
            p: dense ? 1 : 2,
            pt: title ? (dense ? 1 : 2) : (dense ? 1 : 2),
            '&:last-child': {
              pb: dense ? 1 : 2,
            },
          }}
        >
          {children}
        </CardContent>
      </Collapse>
    </Card>
  )
}

// Mobile drawer component
interface MobileDrawerProps {
  open: boolean
  onOpen: () => void
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: number | string
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  open,
  onOpen,
  onClose,
  title,
  children,
  width = 280,
}) => {
  const { isMobile } = useResponsive()

  return (
    <SwipeableDrawer
      anchor="left"
      open={open}
      onOpen={onOpen}
      onClose={onClose}
      variant={isMobile ? 'temporary' : 'temporary'}
      sx={{
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
        },
      }}
    >
      {title && (
        <AppBar position="static" color="default" elevation={0}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {title}
            </Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}
      <Box sx={{ p: 2 }}>
        {children}
      </Box>
    </SwipeableDrawer>
  )
}

// Mobile filter dialog
interface MobileFilterDialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  onApply?: () => void
  onReset?: () => void
}

export const MobileFilterDialog: React.FC<MobileFilterDialogProps> = ({
  open,
  onClose,
  title = 'フィルター',
  children,
  onApply,
  onReset,
}) => {
  const { isMobile } = useResponsive()

  return (
    <Dialog
      fullScreen={isMobile}
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth={!isMobile}
      TransitionComponent={isMobile ? SlideTransition : undefined}
    >
      <AppBar position="relative" color="default" elevation={0}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            {title}
          </Typography>
          {onReset && (
            <IconButton color="inherit" onClick={onReset}>
              <Typography variant="button">リセット</Typography>
            </IconButton>
          )}
          {onApply && (
            <IconButton color="inherit" onClick={onApply}>
              <Typography variant="button">適用</Typography>
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
      <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
        {children}
      </DialogContent>
    </Dialog>
  )
}

// Scroll to top component
export const ScrollToTop: React.FC = () => {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  if (!showScrollTop) return null

  return (
    <Fab
      color="primary"
      size="medium"
      onClick={scrollToTop}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1000,
      }}
    >
      <ScrollTopIcon />
    </Fab>
  )
}

// Mobile toolbar component
interface MobileToolbarProps {
  title?: string
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  showFilter?: boolean
  onFilterClick?: () => void
  filterCount?: number
  actions?: React.ReactNode
  onMenuClick?: () => void
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({
  title,
  searchPlaceholder,
  onSearch,
  showFilter = false,
  onFilterClick,
  filterCount = 0,
  actions,
  onMenuClick,
}) => {
  const { isMobile } = useResponsive()
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = () => {
    if (onSearch) {
      onSearch(searchQuery)
    }
    setSearchExpanded(false)
  }

  if (!isMobile) return null

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar variant="dense">
        {onMenuClick && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={onMenuClick}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        
        {!searchExpanded && title && (
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
        )}

        {searchExpanded && (
          <Box sx={{ flexGrow: 1, mx: 1 }}>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
              }}
              autoFocus
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {onSearch && (
            <IconButton
              color="inherit"
              onClick={() => {
                if (searchExpanded) {
                  handleSearchSubmit()
                } else {
                  setSearchExpanded(true)
                }
              }}
            >
              <SearchIcon />
            </IconButton>
          )}

          {showFilter && onFilterClick && (
            <IconButton color="inherit" onClick={onFilterClick}>
              <Box sx={{ position: 'relative' }}>
                <FilterIcon />
                {filterCount > 0 && (
                  <Chip
                    label={filterCount}
                    size="small"
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      minWidth: 16,
                      height: 16,
                      fontSize: '0.6rem',
                    }}
                  />
                )}
              </Box>
            </IconButton>
          )}

          {actions}

          {searchExpanded && (
            <IconButton
              color="inherit"
              onClick={() => {
                setSearchExpanded(false)
                setSearchQuery('')
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}

// Responsive stack component
interface ResponsiveStackProps {
  children: React.ReactNode
  spacing?: number
  mobileSpacing?: number
  direction?: 'row' | 'column'
  mobileDirection?: 'row' | 'column'
  alignItems?: string
  justifyContent?: string
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  spacing = 2,
  mobileSpacing = 1,
  direction = 'row',
  mobileDirection = 'column',
  alignItems = 'center',
  justifyContent = 'flex-start',
}) => {
  const { isMobile } = useResponsive()

  return (
    <Stack
      direction={isMobile ? mobileDirection : direction}
      spacing={isMobile ? mobileSpacing : spacing}
      alignItems={alignItems}
      justifyContent={justifyContent}
      sx={{
        width: '100%',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
      }}
    >
      {children}
    </Stack>
  )
}

// Touch-friendly button component
interface TouchButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'text' | 'outlined' | 'contained'
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  disabled?: boolean
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  startIcon,
  endIcon,
}) => {
  const { isMobile } = useResponsive()

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: isMobile ? '48px' : '36px', // Touch-friendly height
        minWidth: isMobile ? '48px' : 'auto',
        padding: isMobile ? '12px 16px' : '8px 16px',
        border: variant === 'outlined' ? '1px solid #ccc' : 'none',
        borderRadius: '4px',
        backgroundColor: variant === 'contained' ? '#1976d2' : 'transparent',
        color: variant === 'contained' ? 'white' : '#1976d2',
        fontSize: isMobile ? '16px' : '14px', // Prevent zoom on iOS
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        width: fullWidth ? '100%' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontFamily: 'inherit',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.02857em',
      }}
    >
      {startIcon}
      {children}
      {endIcon}
    </button>
  )
}

export default ResponsiveContainer