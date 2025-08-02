# 🚨 GitHub Actions エラー修復プロンプト - Loop #286

## エラー概要
**エラータイプ**: フロントエンドテストエラー - 重複要素検知  
**発生時刻**: 2025-08-02T11:46:13  
**実行ID**: 16693273506  
**ワークフロー**: Test Suite  

## 🔍 詳細エラー情報

### 失敗したステップ
- **ステップ名**: Run unit tests (frontend-tests)
- **テスト**: DetailPanel.test.js > パネルが正しく表示される
- **エラー原因**: Found multiple elements with the role "heading" and name "テストチケット"

### エラーログ詳細
```
× src/components/common/__tests__/DetailPanel.test.js > DetailPanel > 基本表示テスト > パネルが正しく表示される 433ms
   → Found multiple elements with the role "heading" and name "テストチケット"

Here are the matching elements:

Ignored nodes: comments, script, style
<h6 class="MuiTypography-root MuiTypography-h6 css-1961jlk-MuiTypography-root">
  テストチケット
</h6>

Ignored nodes: comments, script, style  
<h6 class="MuiTypography-root MuiTypography-h6 MuiTypography-gutterBottom css-rsc4wb-MuiTypography-root">
  テストチケット
</h6>
```

### コンテキスト情報
- **コンポーネント**: DetailPanel
- **テストファイル**: src/components/common/__tests__/DetailPanel.test.js
- **エラータイプ**: React Testing Library複数要素エラー
- **フレームワーク**: Vitest + React Testing Library

## 🎯 Claude修復タスク

### 必要な修正
1. **テストセレクターの修正**
   - より具体的なセレクターの使用
   - `getAllByRole`または`*AllBy*`バリアントの使用
   - 重複要素の特定と区別

2. **DetailPanelコンポーネントの修正**
   - 重複するheading要素の確認
   - 適切なaria-labelの追加
   - セマンティック構造の改善

### 修復方針
- [x] エラー分析: 重複heading要素が原因
- [ ] テストファイル修正
- [ ] コンポーネント構造確認・修正
- [ ] セレクター改善

## 📝 修復すべきファイル

1. **テストファイル**: `src/components/common/__tests__/DetailPanel.test.js`
2. **コンポーネント**: `src/components/common/DetailPanel.tsx`

現在の問題点:
- 同じテキスト「テストチケット」を持つh6要素が複数存在
- `getByRole('heading', { name: 'テストチケット' })`が曖昧
- テスト対象の要素を一意に特定できない

## 🔧 修復指示

以下の修正を行ってください：

### 1. テストファイル修正
```javascript
// 修正前
const heading = screen.getByRole('heading', { name: 'テストチケット' });

// 修正後（オプション1: より具体的なセレクター）
const heading = screen.getByRole('heading', { 
  name: 'テストチケット',
  level: 6 
});

// 修正後（オプション2: 複数要素対応）
const headings = screen.getAllByRole('heading', { name: 'テストチケット' });
expect(headings).toHaveLength(2);
const mainHeading = headings[0]; // または適切な要素を選択

// 修正後（オプション3: data-testid使用）
const heading = screen.getByTestId('detail-panel-title');
```

### 2. コンポーネント修正
```jsx
// DetailPanel.tsx
<h6 
  data-testid="detail-panel-title"
  className="MuiTypography-root MuiTypography-h6"
>
  {title}
</h6>

// または異なるaria-labelを追加
<h6 
  aria-label="メインタイトル"
  className="MuiTypography-root MuiTypography-h6"
>
  {title}
</h6>
```

## 📊 エラー統計
- **総エラー数**: 1
- **エラーカテゴリ**: フロントエンドテスト/セレクター
- **重要度**: Medium
- **修復優先度**: High

## 🎯 期待される結果
- DetailPanelテストの正常実行
- 重複要素エラーの解消
- より堅牢なテストセレクターの実装

---
**修復完了後**: フロントエンドテスト再実行でテストしてください。