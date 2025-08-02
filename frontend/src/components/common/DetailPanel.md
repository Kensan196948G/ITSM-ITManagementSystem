# DetailPanel コンポーネント

## 概要

DetailPanel は、ITSMシステムのクリック時右側詳細コンテンツ表示機能を提供するReactコンポーネントです。WebUIドキュメントの仕様に基づいて実装されており、レスポンシブデザイン、アクセシビリティ、アニメーション効果をサポートしています。

## 主な機能

### 🎯 コア機能
- **動的詳細表示**: チケット、ユーザー、ダッシュボード要素の詳細情報表示
- **レスポンシブ対応**: デスクトップ、タブレット、モバイルデバイス対応
- **アクセシビリティ**: WCAG 2.1 AA準拠、キーボードナビゲーション対応
- **アニメーション**: 滑らかな開閉アニメーション
- **多言語対応**: 日本語優先、多言語展開可能

### 📱 レスポンシブ対応
- **デスクトップ (1025px~)**: 右側固定パネル、展開/縮小機能
- **タブレット (769px~1024px)**: 右側オーバーレイパネル
- **モバイル (~768px)**: 下部からのスライドアップパネル

### ♿ アクセシビリティ機能
- **キーボードナビゲーション**: Tab、Esc、Ctrl+F5等のショートカット
- **ARIA属性**: 適切なロール、ラベル、状態表示
- **フォーカス管理**: パネル開閉時の適切なフォーカス制御
- **スクリーンリーダー対応**: 構造化された情報階層

## 使用方法

### 基本的な使用例

```tsx
import React from 'react'
import { useDetailPanelContext } from '../layout/Layout'

const ExampleComponent: React.FC = () => {
  const { openDetailPanel } = useDetailPanelContext()

  const handleItemClick = (item: any) => {
    const detailItem = {
      id: item.id,
      type: 'ticket', // 'ticket' | 'user' | 'dashboard' | 'incident' | 'problem'
      title: item.title,
      subtitle: `#${item.id} • ${item.category}`,
      data: item, // 実際のデータオブジェクト
      metadata: {
        lastViewed: new Date().toISOString(),
        source: 'example-component',
      },
    }

    openDetailPanel(detailItem, 'right')
  }

  return (
    <div onClick={() => handleItemClick(someItem)}>
      クリックして詳細を表示
    </div>
  )
}
```

### カスタムフックの使用

```tsx
import { useDetailPanel } from '../hooks/useDetailPanel'

const CustomComponent: React.FC = () => {
  const {
    detailPanelState,
    openDetailPanel,
    closeDetailPanel,
    updateDetailPanelItem,
    isDetailPanelOpen,
    currentItem,
  } = useDetailPanel()

  // カスタムロジックの実装
}
```

## API リファレンス

### DetailPanelProps

```typescript
interface DetailPanelProps {
  isOpen: boolean                    // パネルの開閉状態
  item: DetailPanelItem | null       // 表示するアイテム
  onClose: () => void               // 閉じる時のコールバック
  position?: 'right' | 'bottom'     // 表示位置（デフォルト: 'right'）
  width?: number | string           // パネル幅（デフォルト: 480px）
  maxWidth?: number | string        // 最大幅（デフォルト: 800px）
  minWidth?: number | string        // 最小幅（デフォルト: 320px）
}
```

### DetailPanelItem

```typescript
interface DetailPanelItem {
  id: string                        // 一意のID
  type: 'ticket' | 'user' | 'dashboard' | 'incident' | 'problem'
  title: string                     // 表示タイトル
  subtitle?: string                 // サブタイトル
  data: any                        // 実際のデータ
  metadata?: Record<string, any>   // メタデータ
}
```

### useDetailPanelContext

```typescript
interface DetailPanelContextType {
  openDetailPanel: (item: DetailPanelItem, position?: 'right' | 'bottom') => void
  closeDetailPanel: () => void
  updateDetailPanelItem: (item: DetailPanelItem) => void
  isDetailPanelOpen: boolean
  currentItem: DetailPanelItem | null
}
```

## キーボードショートカット

| キー | 機能 |
|------|------|
| `Esc` | パネルを閉じる |
| `Ctrl + F5` | 情報を更新 |
| `Ctrl + Alt + E` | 編集モードに切り替え |
| `Tab` | 次の要素にフォーカス |
| `Shift + Tab` | 前の要素にフォーカス |

## コンテンツタイプ別表示

### チケット詳細
- **概要タブ**: 基本情報、ステータス、担当者、カスタムフィールド
- **履歴タブ**: 変更履歴の時系列表示
- **コメントタブ**: コメント一覧、内部/外部フラグ
- **関連情報タブ**: 添付ファイル、関連チケット

### ユーザー詳細
- **プロフィール**: 基本情報、ロール、部署
- **パフォーマンス統計**: 処理チケット数、解決率、SLA遵守率
- **担当チケット**: 現在の担当チケット一覧

### ダッシュボード要素
- **メトリクス詳細**: KPI指標の詳細分析
- **チャート詳細**: グラフの詳細データ表示

## スタイリング

### デザインシステム準拠
- **カラーパレット**: ITSMテーマカラーの使用
- **タイポグラフィ**: Material-UI Typography規準
- **アニメーション**: Material-UIのトランジション設定
- **シャドウ**: 段階的なエレベーション

### カスタマイズ可能な要素
```scss
// パネル幅の調整
.detail-panel {
  --panel-width-desktop: 480px;
  --panel-width-tablet: 400px;
  --panel-width-mobile: 100%;
}

// アニメーション速度の調整
.detail-panel-transition {
  --animation-duration: 300ms;
  --animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## パフォーマンス最適化

### 実装されている最適化
- **React.memo**: 不要な再レンダリング防止
- **遅延レンダリング**: パネル開閉時の段階的レンダリング
- **仮想化**: 大量データリスト表示時の仮想化
- **エラーバウンダリ**: エラー発生時の適切な処理

### 推奨事項
- 大量のデータを表示する場合は、ページネーションまたは仮想化を使用
- 画像ファイルは適切なサイズに最適化
- API呼び出しはキャッシュ機能を活用

## トラブルシューティング

### よくある問題

#### パネルが表示されない
```typescript
// Layout コンポーネント内で使用されているか確認
const { openDetailPanel } = useDetailPanelContext()
```

#### アニメーションが動作しない
```typescript
// Material-UIのテーマプロバイダーが適用されているか確認
import { ThemeProvider } from '@mui/material'
```

#### モバイルでスクロールできない
```typescript
// disableScrollLock の設定確認
ModalProps={{
  disableScrollLock: true,
}}
```

### デバッグ方法

```typescript
// デバッグ情報の表示
useEffect(() => {
  console.log('DetailPanel State:', detailPanelState)
}, [detailPanelState])
```

## 今後の拡張予定

### Phase 2 機能
- **マルチパネル対応**: 複数パネルの同時表示
- **ドラッグ&ドロップ**: パネル位置の調整
- **お気に入り**: よく見る項目のブックマーク
- **検索機能**: パネル内コンテンツの検索

### 技術的改善
- **仮想化強化**: React Window導入による大量データ対応
- **PWA対応**: オフライン時のキャッシュ表示
- **パフォーマンス監視**: 表示速度の計測と最適化

## 関連ドキュメント

- [WebUI詳細仕様書](../../../docs/WebUI/WebUI詳細仕様書.md)
- [WebUI機能説明書](../../../docs/WebUI/WebUI機能説明書.md)
- [アクセシビリティガイドライン](./AccessibilityHelper.md)
- [レスポンシブデザイン指針](./ResponsiveContainer.md)

---

## ライセンス

このコンポーネントは ITSM統合管理システムの一部として開発されています。