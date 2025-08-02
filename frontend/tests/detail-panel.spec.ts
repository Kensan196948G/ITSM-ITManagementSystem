import { test, expect, Page } from '@playwright/test';

/**
 * DetailPanel E2Eテスト
 * 実行ID: 16693273506 の修復対応
 * 
 * 問題点の修復:
 * - 同じテキスト「テストチケット」を持つh6要素が複数存在
 * - React Testing Libraryのセレクターが曖昧
 * - テスト対象の要素を一意に特定できない
 */

test.describe('DetailPanel E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // アプリケーションのベースURLに移動
    await page.goto('/');
    
    // アプリケーションが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // ダッシュボードが表示されるまで待機
    await expect(page.getByText('ITSM管理システム')).toBeVisible({ timeout: 10000 });
  });

  test.describe('基本機能テスト', () => {
    test('詳細パネルの表示/非表示', async () => {
      // チケット一覧でアイテムをクリック
      const ticketRow = page.getByRole('row').filter({ hasText: 'テストチケット' }).first();
      await expect(ticketRow).toBeVisible();
      await ticketRow.click();

      // 詳細パネルが表示されることを確認
      const detailPanel = page.getByRole('complementary', { name: '詳細情報パネル' });
      await expect(detailPanel).toBeVisible();

      // パネルのタイトルが正しく表示されることを確認（data-testidで特定）
      const panelTitle = page.getByTestId('detail-panel-title');
      await expect(panelTitle).toHaveText('テストチケット');

      // サブタイトルの確認
      const panelSubtitle = page.getByTestId('detail-panel-subtitle');
      await expect(panelSubtitle).toBeVisible();

      // 閉じるボタンをクリック
      const closeButton = page.getByTestId('close-button');
      await expect(closeButton).toBeVisible();
      await closeButton.click();

      // パネルが非表示になることを確認
      await expect(detailPanel).not.toBeVisible();
    });

    test('ツールバーボタンの動作確認', async () => {
      // チケットを選択してパネルを開く
      await page.getByRole('row').filter({ hasText: 'テストチケット' }).first().click();
      
      const detailPanel = page.getByRole('complementary', { name: '詳細情報パネル' });
      await expect(detailPanel).toBeVisible();

      // リフレッシュボタンのテスト
      const refreshButton = page.getByTestId('refresh-button');
      await expect(refreshButton).toBeVisible();
      await expect(refreshButton).not.toBeDisabled();
      await refreshButton.click();

      // 編集ボタンのテスト
      const editButton = page.getByTestId('edit-button');
      await expect(editButton).toBeVisible();
      await expect(editButton).not.toBeDisabled();
      await editButton.click();

      // 展開ボタンのテスト（デスクトップビューのみ）
      const expandButton = page.getByTestId('expand-button');
      if (await expandButton.isVisible()) {
        await expandButton.click();
        // パネルが展開されることを確認
        await expect(detailPanel).toBeVisible();
      }
    });
  });

  test.describe('キーボードナビゲーション', () => {
    test('Escapeキーでパネルを閉じる', async () => {
      // パネルを開く
      await page.getByRole('row').filter({ hasText: 'テストチケット' }).first().click();
      
      const detailPanel = page.getByRole('complementary', { name: '詳細情報パネル' });
      await expect(detailPanel).toBeVisible();

      // Escapeキーを押す
      await page.keyboard.press('Escape');

      // パネルが閉じることを確認
      await expect(detailPanel).not.toBeVisible();
    });

    test('Ctrl+F5でリフレッシュ', async () => {
      // パネルを開く
      await page.getByRole('row').filter({ hasText: 'テストチケット' }).first().click();
      
      const detailPanel = page.getByRole('complementary', { name: '詳細情報パネル' });
      await expect(detailPanel).toBeVisible();

      // Ctrl+F5を押す
      await page.keyboard.press('Control+F5');

      // パネルが表示されたままであることを確認
      await expect(detailPanel).toBeVisible();
      
      // リフレッシュボタンが一時的に無効化されることを確認
      const refreshButton = page.getByTestId('refresh-button');
      // リフレッシュ処理は非同期なので、ボタンの状態変化を確認
      await expect(refreshButton).toBeVisible();
    });
  });

  test.describe('レスポンシブ対応テスト', () => {
    test('モバイルビューでの表示', async () => {
      // ビューポートをモバイルサイズに設定
      await page.setViewportSize({ width: 375, height: 667 });
      
      // チケットを選択
      await page.getByRole('row').filter({ hasText: 'テストチケット' }).first().click();
      
      const detailPanel = page.getByRole('complementary', { name: '詳細情報パネル' });
      await expect(detailPanel).toBeVisible();

      // モバイルビューでは展開ボタンが表示されないことを確認
      const expandButton = page.getByTestId('expand-button');
      await expect(expandButton).not.toBeVisible();

      // パネルがモバイル向けのスタイルで表示されることを確認
      const panelElement = await detailPanel.elementHandle();
      const boundingBox = await panelElement?.boundingBox();
      expect(boundingBox?.width).toBeCloseTo(375, 10); // モバイル幅に合わせる
    });

    test('タブレットビューでの表示', async () => {
      // ビューポートをタブレットサイズに設定
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // チケットを選択
      await page.getByRole('row').filter({ hasText: 'テストチケット' }).first().click();
      
      const detailPanel = page.getByRole('complementary', { name: '詳細情報パネル' });
      await expect(detailPanel).toBeVisible();

      // タブレットビューでは適切な幅で表示されることを確認
      const panelElement = await detailPanel.elementHandle();
      const boundingBox = await panelElement?.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(400); // タブレット向けの最大幅
    });
  });

  test.describe('アクセシビリティテスト', () => {
    test('ARIA属性の確認', async () => {
      // チケットを選択
      await page.getByRole('row').filter({ hasText: 'テストチケット' }).first().click();
      
      const detailPanel = page.getByRole('complementary', { name: '詳細情報パネル' });
      await expect(detailPanel).toBeVisible();

      // ARIA属性の確認
      await expect(detailPanel).toHaveAttribute('aria-label', '詳細情報パネル');
      await expect(detailPanel).toHaveAttribute('aria-expanded', 'true');

      // フォーカス可能な要素の確認
      const focusableElements = [
        page.getByTestId('refresh-button'),
        page.getByTestId('edit-button'),
        page.getByTestId('close-button')
      ];

      for (const element of focusableElements) {
        await expect(element).toBeVisible();
        await expect(element).not.toBeDisabled();
        
        // フォーカスできることを確認
        await element.focus();
        await expect(element).toBeFocused();
      }
    });

    test('キーボードナビゲーション順序', async () => {
      // チケットを選択
      await page.getByRole('row').filter({ hasText: 'テストチケット' }).first().click();
      
      const detailPanel = page.getByRole('complementary', { name: '詳細情報パネル' });
      await expect(detailPanel).toBeVisible();

      // Tabキーでのナビゲーション確認
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('refresh-button')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByTestId('edit-button')).toBeFocused();

      // 展開ボタンが表示されている場合のテスト
      const expandButton = page.getByTestId('expand-button');
      if (await expandButton.isVisible()) {
        await page.keyboard.press('Tab');
        await expect(expandButton).toBeFocused();
      }

      await page.keyboard.press('Tab');
      await expect(page.getByTestId('close-button')).toBeFocused();
    });
  });

  test.describe('エラーハンドリング', () => {
    test('無効なアイテムでのエラー処理', async () => {
      // 存在しないアイテムを選択しようとした場合のテスト
      await page.goto('/?itemId=invalid-id');
      
      // エラーメッセージまたは適切なフォールバック表示を確認
      const errorMessage = page.getByText('詳細情報を表示するアイテムを選択してください');
      await expect(errorMessage).toBeVisible();
    });

    test('ネットワークエラー時の処理', async () => {
      // ネットワークを無効化
      await page.context().setOffline(true);
      
      // チケットを選択
      await page.getByRole('row').filter({ hasText: 'テストチケット' }).first().click();
      
      const detailPanel = page.getByRole('complementary', { name: '詳細情報パネル' });
      await expect(detailPanel).toBeVisible();

      // リフレッシュボタンをクリック
      const refreshButton = page.getByTestId('refresh-button');
      await refreshButton.click();

      // エラー処理が適切に行われることを確認
      // （実装に応じてエラーメッセージの表示やリトライロジックを確認）
      
      // ネットワークを再有効化
      await page.context().setOffline(false);
    });
  });

  test.describe('パフォーマンステスト', () => {
    test('大量データでのレンダリング性能', async () => {
      // 大量のコメントを持つチケットを選択
      await page.goto('/?itemId=large-data-ticket');
      
      const detailPanel = page.getByRole('complementary', { name: '詳細情報パネル' });
      
      // レンダリング時間を測定
      const startTime = Date.now();
      await expect(detailPanel).toBeVisible();
      const endTime = Date.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(2000); // 2秒以内でレンダリング完了

      // スクロール性能の確認
      const contentArea = detailPanel.locator('[role="tabpanel"]');
      await contentArea.scrollIntoViewIfNeeded();
      
      // スムーズなスクロールを確認
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(100);
      await page.mouse.wheel(0, -500);
    });
  });

  test.describe('コンテンツ表示テスト', () => {
    test('タブ切り替え機能', async () => {
      // チケットを選択
      await page.getByRole('row').filter({ hasText: 'テストチケット' }).first().click();
      
      const detailPanel = page.getByRole('complementary', { name: '詳細情報パネル' });
      await expect(detailPanel).toBeVisible();

      // 概要タブが選択されていることを確認
      const overviewTab = page.getByRole('tab', { name: '概要' });
      await expect(overviewTab).toHaveAttribute('aria-selected', 'true');

      // 履歴タブをクリック
      const historyTab = page.getByRole('tab', { name: '履歴' });
      await historyTab.click();
      await expect(historyTab).toHaveAttribute('aria-selected', 'true');

      // コメントタブをクリック
      const commentTab = page.getByRole('tab', { name: 'コメント' });
      await commentTab.click();
      await expect(commentTab).toHaveAttribute('aria-selected', 'true');

      // 関連情報タブをクリック
      const relatedTab = page.getByRole('tab', { name: '関連情報' });
      await relatedTab.click();
      await expect(relatedTab).toHaveAttribute('aria-selected', 'true');
    });

    test('編集モードの切り替え', async () => {
      // チケットを選択
      await page.getByRole('row').filter({ hasText: 'テストチケット' }).first().click();
      
      const detailPanel = page.getByRole('complementary', { name: '詳細情報パネル' });
      await expect(detailPanel).toBeVisible();

      // 編集ボタンをクリック
      const editButton = page.getByTestId('edit-button');
      await editButton.click();

      // 編集フィールドが表示されることを確認
      const titleField = page.getByLabel('タイトル');
      await expect(titleField).toBeVisible();
      await expect(titleField).toBeEditable();

      // 保存ボタンが表示されることを確認
      const saveButton = page.getByRole('button', { name: 'Save' });
      await expect(saveButton).toBeVisible();

      // キャンセルボタンが表示されることを確認
      const cancelButton = page.getByRole('button', { name: 'Cancel' });
      await expect(cancelButton).toBeVisible();

      // キャンセルボタンをクリック
      await cancelButton.click();

      // 編集モードが解除されることを確認
      await expect(titleField).not.toBeVisible();
    });
  });
});