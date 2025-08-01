/**
 * メニューナビゲーション管理用カスタムフック
 * ブレッドクラム、アクティブメニュー、権限チェックなどを管理
 */

import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  itsmMenuStructure, 
  filterMenuByPermissions,
  getFlatMenuItems,
  type MenuItem,
  type MenuSection 
} from '../components/layout/MenuStructure'

export interface BreadcrumbItem {
  label: string
  path: string
  icon?: string
}

export interface NavigationState {
  currentMenuItem: MenuItem | null
  breadcrumbs: BreadcrumbItem[]
  parentSection: MenuSection | null
  siblingItems: MenuItem[]
  hasPermission: boolean
}

export const useMenuNavigation = () => {
  const location = useLocation()
  const { authState } = useAuth()
  const [navigationHistory, setNavigationHistory] = useState<string[]>([])

  // ユーザー権限に基づいてフィルタリングされたメニュー構造
  const filteredMenuStructure = useMemo(() => {
    const userRoles = authState.user?.roles || []
    return itsmMenuStructure.map(section => ({
      ...section,
      items: filterMenuByPermissions(section.items, userRoles)
    })).filter(section => section.items.length > 0)
  }, [authState.user?.roles])

  // フラットなメニューアイテムリスト
  const flatMenuItems = useMemo(() => {
    return getFlatMenuItems()
  }, [])

  // 現在のパスに基づく仗ビゲーション状態
  const navigationState = useMemo((): NavigationState => {
    const currentPath = location.pathname
    
    // 現在のメニューアイテムを見つける
    const findCurrentMenuItem = (items: MenuItem[]): MenuItem | null => {
      for (const item of items) {
        if (item.path === currentPath || currentPath.startsWith(item.path + '/')) {
          return item
        }
        if (item.children) {
          const childItem = findCurrentMenuItem(item.children)
          if (childItem) return childItem
        }
      }
      return null
    }

    let currentMenuItem: MenuItem | null = null
    let parentSection: MenuSection | null = null

    // セクションとメニューアイテムを検索
    for (const section of filteredMenuStructure) {
      const foundItem = findCurrentMenuItem(section.items)
      if (foundItem) {
        currentMenuItem = foundItem
        parentSection = section
        break
      }
    }

    // ブレッドクラムを構築
    const breadcrumbs: BreadcrumbItem[] = []
    
    if (parentSection && currentMenuItem) {
      // セクション名を追加
      breadcrumbs.push({
        label: parentSection.title,
        path: '',
        icon: 'Dashboard'
      })

      // パスを分析してブレッドクラムを構築
      const buildBreadcrumbs = (items: MenuItem[], targetPath: string, basePath: BreadcrumbItem[] = []): BreadcrumbItem[] | null => {
        for (const item of items) {
          const currentPath = [...basePath, {
            label: item.label,
            path: item.path,
            icon: item.icon.name
          }]

          if (item.path === targetPath || targetPath.startsWith(item.path + '/')) {
            if (item.children) {
              const childPath = buildBreadcrumbs(item.children, targetPath, currentPath)
              if (childPath) return childPath
            }
            return currentPath
          }
        }
        return null
      }

      const pathBreadcrumbs = buildBreadcrumbs(parentSection.items, currentPath)
      if (pathBreadcrumbs) {
        breadcrumbs.push(...pathBreadcrumbs.slice(1)) // セクション以外を追加
      }
    }

    // 兄弟アイテムを取得
    const siblingItems: MenuItem[] = []
    if (parentSection && currentMenuItem) {
      const findSiblings = (items: MenuItem[], targetItem: MenuItem): MenuItem[] => {
        // 直接の兄弟を探す
        const directSiblings = items.filter(item => item.id !== targetItem.id)
        if (directSiblings.length > 0) return directSiblings

        // 親の兄弟を探す
        for (const item of items) {
          if (item.children) {
            const childSiblings = findSiblings(item.children, targetItem)
            if (childSiblings.length > 0) return item.children.filter(child => child.id !== targetItem.id)
          }
        }
        return []
      }

      siblingItems.push(...findSiblings(parentSection.items, currentMenuItem))
    }

    // 権限チェック
    const userRoles = authState.user?.roles || [authState.user?.role].filter(Boolean) as string[]
    const hasPermission = currentMenuItem ? 
      !currentMenuItem.permission || 
      !currentMenuItem.permission.roles || 
      currentMenuItem.permission.roles.some(role => userRoles.includes(role)) : true

    return {
      currentMenuItem,
      breadcrumbs,
      parentSection,
      siblingItems,
      hasPermission
    }
  }, [location.pathname, filteredMenuStructure, authState.user?.roles])

  // ナビゲーション履歴の管理
  useEffect(() => {
    const currentPath = location.pathname
    setNavigationHistory(prev => {
      const newHistory = prev.filter(path => path !== currentPath)
      return [currentPath, ...newHistory].slice(0, 10) // 最大10件
    })
  }, [location.pathname])

  // メニュー検索機能
  const searchMenuItems = (query: string): MenuItem[] => {
    if (!query.trim()) return []
    
    const userRoles = authState.user?.roles || [authState.user?.role].filter(Boolean) as string[]
    const searchableItems = flatMenuItems.filter(item => {
      // 権限チェック
      if (item.permission) {
        if (item.permission.roles && !item.permission.roles.some(role => userRoles.includes(role))) {
          return false
        }
      }
      return true
    })

    const lowercaseQuery = query.toLowerCase()
    return searchableItems.filter(item => 
      item.label.toLowerCase().includes(lowercaseQuery) ||
      item.description?.toLowerCase().includes(lowercaseQuery)
    ).slice(0, 20)
  }

  // 関連メニューアイテムの取得
  const getRelatedMenuItems = (currentItem: MenuItem | null): MenuItem[] => {
    if (!currentItem || !navigationState.parentSection) return []

    const relatedItems: MenuItem[] = []
    const section = navigationState.parentSection

    // 同じセクション内の他のアイテム
    const addRelatedItems = (items: MenuItem[], level = 0) => {
      items.forEach(item => {
        if (item.id !== currentItem.id && level < 2) {
          relatedItems.push(item)
        }
        if (item.children && level < 1) {
          addRelatedItems(item.children, level + 1)
        }
      })
    }

    addRelatedItems(section.items)
    return relatedItems.slice(0, 5)
  }

  // よく使用されるメニューアイテムの取得
  const getFrequentlyUsedItems = (): MenuItem[] => {
    const frequentPaths = navigationHistory.slice(0, 5)
    const items: MenuItem[] = []

    frequentPaths.forEach(path => {
      const item = flatMenuItems.find(item => item.path === path)
      if (item) items.push(item)
    })

    return items
  }

  // メニューアイテムがアクティブかどうかの判定
  const isMenuItemActive = (menuItem: MenuItem): boolean => {
    const currentPath = location.pathname
    return currentPath === menuItem.path || currentPath.startsWith(menuItem.path + '/')
  }

  // パンくずナビゲーション用のJSX生成
  const generateBreadcrumbItems = () => {
    return navigationState.breadcrumbs.map((item, index) => ({
      ...item,
      isLast: index === navigationState.breadcrumbs.length - 1,
      isClickable: item.path !== ''
    }))
  }

  return {
    // 状態
    navigationState,
    filteredMenuStructure,
    flatMenuItems,
    navigationHistory,

    // 機能
    searchMenuItems,
    getRelatedMenuItems,
    getFrequentlyUsedItems,
    isMenuItemActive,
    generateBreadcrumbItems,

    // ユーティリティ
    hasPermission: navigationState.hasPermission,
    currentPage: navigationState.currentMenuItem?.label || 'ページが見つかりません',
    currentSection: navigationState.parentSection?.title || '',
  }
}

export default useMenuNavigation