import { useState, useCallback, useRef, useEffect } from 'react'
import { DetailPanelState, DetailPanelItem } from '../types'

interface UseDetailPanelReturn {
  detailPanelState: DetailPanelState
  openDetailPanel: (item: DetailPanelItem, position?: 'right' | 'bottom') => void
  closeDetailPanel: () => void
  updateDetailPanelItem: (item: DetailPanelItem) => void
  isDetailPanelOpen: boolean
  currentItem: DetailPanelItem | null
}

const DEFAULT_PANEL_STATE: DetailPanelState = {
  isOpen: false,
  item: null,
  position: 'right',
  width: 480,
  height: 400,
}

export const useDetailPanel = (initialState?: Partial<DetailPanelState>): UseDetailPanelReturn => {
  const [detailPanelState, setDetailPanelState] = useState<DetailPanelState>({
    ...DEFAULT_PANEL_STATE,
    ...initialState,
  })

  const previousItemRef = useRef<DetailPanelItem | null>(null)

  // 詳細パネルを開く
  const openDetailPanel = useCallback((
    item: DetailPanelItem, 
    position: 'right' | 'bottom' = 'right'
  ) => {
    setDetailPanelState(prev => ({
      ...prev,
      isOpen: true,
      item,
      position,
    }))
    previousItemRef.current = item
  }, [])

  // 詳細パネルを閉じる
  const closeDetailPanel = useCallback(() => {
    setDetailPanelState(prev => ({
      ...prev,
      isOpen: false,
      // アイテムは即座にはクリアしない（アニメーション中も表示するため）
    }))
  }, [])

  // アイテムを更新
  const updateDetailPanelItem = useCallback((item: DetailPanelItem) => {
    setDetailPanelState(prev => ({
      ...prev,
      item,
    }))
    previousItemRef.current = item
  }, [])

  // パネルが完全に閉じた後にアイテムをクリア
  useEffect(() => {
    if (!detailPanelState.isOpen) {
      const timer = setTimeout(() => {
        setDetailPanelState(prev => ({
          ...prev,
          item: null,
        }))
      }, 300) // アニメーション時間に合わせて調整

      return () => clearTimeout(timer)
    }
  }, [detailPanelState.isOpen])

  return {
    detailPanelState,
    openDetailPanel,
    closeDetailPanel,
    updateDetailPanelItem,
    isDetailPanelOpen: detailPanelState.isOpen,
    currentItem: detailPanelState.item,
  }
}

export default useDetailPanel