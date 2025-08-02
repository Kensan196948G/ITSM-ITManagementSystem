import { test, expect, Page } from '@playwright/test';

/**
 * 【フェーズ2】ITSM E2E包括テストスイート
 * フロントエンド→バックエンド間の完全フロー検証
 */

class ITSMPageObjects {
  constructor(private page: Page) {}

  // ログインページ
  async login(username: string = 'test@example.com', password: string = 'password123') {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', username);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  // ダッシュボード操作
  async navigateToDashboard() {
    await this.page.goto('/dashboard');
    await this.page.waitForSelector('[data-testid="dashboard-container"]');
  }

  // インシデント作成
  async createIncident(title: string, description: string, priority: string = 'Medium') {
    await this.page.goto('/incidents/create');
    await this.page.fill('[data-testid="incident-title"]', title);
    await this.page.fill('[data-testid="incident-description"]', description);
    await this.page.selectOption('[data-testid="incident-priority"]', priority);
    await this.page.click('[data-testid="create-incident-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  // インシデントリスト確認
  async verifyIncidentInList(title: string) {
    await this.page.goto('/incidents');
    await this.page.waitForSelector('[data-testid="incidents-table"]');
    const incidentRow = this.page.locator(`[data-testid="incident-row"]:has-text("${title}")`);
    await expect(incidentRow).toBeVisible();
    return incidentRow;
  }
}

test.describe('【フェーズ2】ITSM E2E包括テスト', () => {
  let pageObjects: ITSMPageObjects;

  test.beforeEach(async ({ page }) => {
    pageObjects = new ITSMPageObjects(page);
    // 各テスト前にヘルスチェック
    const response = await page.request.get('http://localhost:8000/health');
    expect(response.status()).toBe(200);
  });

  test.describe('認証フロー', () => {
    test('正常ログイン → ダッシュボード遷移', async ({ page }) => {
      await pageObjects.login();
      
      // ダッシュボードに遷移されることを確認
      await expect(page).toHaveURL(/dashboard/);
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      
      // ユーザー情報が表示されることを確認
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('不正ログイン → エラーメッセージ表示', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'invalid@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      
      // エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('認証');
    });

    test('ログアウト → ログインページ遷移', async ({ page }) => {
      await pageObjects.login();
      await pageObjects.navigateToDashboard();
      
      // ログアウト実行
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // ログインページに遷移されることを確認
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('ダッシュボード機能', () => {
    test.beforeEach(async () => {
      await pageObjects.login();
      await pageObjects.navigateToDashboard();
    });

    test('ダッシュボード統計表示', async ({ page }) => {
      // 統計カードが表示されることを確認
      await expect(page.locator('[data-testid="total-incidents"]')).toBeVisible();
      await expect(page.locator('[data-testid="open-incidents"]')).toBeVisible();
      await expect(page.locator('[data-testid="resolved-incidents"]')).toBeVisible();
      
      // 数値が表示されることを確認
      const totalIncidents = await page.locator('[data-testid="total-incidents"] .metric-value').textContent();
      expect(totalIncidents).toMatch(/^\d+$/);
    });

    test('リアルタイムチャート表示', async ({ page }) => {
      // チャートコンテナが表示されることを確認
      await expect(page.locator('[data-testid="chart-container"]')).toBeVisible();
      
      // チャートデータが読み込まれることを確認
      await page.waitForSelector('[data-testid="chart-container"] svg', { timeout: 10000 });
      const chartSvg = page.locator('[data-testid="chart-container"] svg');
      await expect(chartSvg).toBeVisible();
    });

    test('フィルター機能', async ({ page }) => {
      // 日付フィルターの動作確認
      await page.selectOption('[data-testid="date-filter"]', '7d');
      await page.waitForLoadState('networkidle');
      
      // フィルター適用後のデータ更新確認
      await expect(page.locator('[data-testid="filter-applied"]')).toBeVisible();
    });
  });

  test.describe('インシデント管理フロー', () => {
    test.beforeEach(async () => {
      await pageObjects.login();
    });

    test('インシデント作成 → 一覧表示 → 詳細表示', async ({ page }) => {
      const incidentTitle = `E2Eテストインシデント_${Date.now()}`;
      const incidentDescription = 'E2Eテストで作成されたテストインシデントです。';

      // 1. インシデント作成
      await pageObjects.createIncident(incidentTitle, incidentDescription, 'High');
      
      // 成功メッセージの確認
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('作成');

      // 2. インシデント一覧で確認
      const incidentRow = await pageObjects.verifyIncidentInList(incidentTitle);
      
      // 3. 詳細表示
      await incidentRow.click();
      await expect(page).toHaveURL(/incidents\/\d+/);
      await expect(page.locator('[data-testid="incident-title"]')).toContainText(incidentTitle);
      await expect(page.locator('[data-testid="incident-description"]')).toContainText(incidentDescription);
    });

    test('インシデント編集 → 変更履歴確認', async ({ page }) => {
      // 既存インシデントの編集
      await page.goto('/incidents');
      await page.click('[data-testid="incident-row"]:first-child [data-testid="edit-button"]');
      
      const newDescription = `更新されました_${Date.now()}`;
      await page.fill('[data-testid="incident-description"]', newDescription);
      await page.click('[data-testid="save-button"]');
      
      // 変更履歴の確認
      await page.click('[data-testid="history-tab"]');
      await expect(page.locator('[data-testid="history-entry"]:first-child')).toContainText('更新');
    });

    test('インシデントステータス変更フロー', async ({ page }) => {
      await page.goto('/incidents');
      await page.click('[data-testid="incident-row"]:first-child');
      
      // ステータス変更
      await page.click('[data-testid="status-dropdown"]');
      await page.click('[data-testid="status-option-in-progress"]');
      await page.fill('[data-testid="status-comment"]', 'ステータス変更のコメント');
      await page.click('[data-testid="confirm-status-change"]');
      
      // ステータス変更の確認
      await expect(page.locator('[data-testid="current-status"]')).toContainText('進行中');
    });
  });

  test.describe('設定・管理機能', () => {
    test.beforeEach(async () => {
      await pageObjects.login();
    });

    test('ユーザー設定変更', async ({ page }) => {
      await page.goto('/settings/profile');
      
      // プロフィール更新
      await page.fill('[data-testid="display-name"]', 'E2Eテストユーザー');
      await page.click('[data-testid="save-profile"]');
      
      // 成功メッセージの確認
      await expect(page.locator('[data-testid="profile-updated"]')).toBeVisible();
    });

    test('システム設定確認', async ({ page }) => {
      await page.goto('/settings/system');
      
      // システム情報が表示されることを確認
      await expect(page.locator('[data-testid="system-version"]')).toBeVisible();
      await expect(page.locator('[data-testid="database-status"]')).toBeVisible();
    });
  });

  test.describe('エラーハンドリング', () => {
    test('ネットワークエラー時の動作', async ({ page }) => {
      await pageObjects.login();
      
      // ネットワークを無効化
      await page.route('**/api/**', route => route.abort());
      
      await page.goto('/incidents');
      
      // エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      
      // リトライボタンの動作確認
      await page.unroute('**/api/**');
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="incidents-table"]')).toBeVisible();
    });

    test('404ページの表示', async ({ page }) => {
      await pageObjects.login();
      await page.goto('/nonexistent-page');
      
      // 404ページが表示されることを確認
      await expect(page.locator('[data-testid="not-found"]')).toBeVisible();
      await expect(page.locator('[data-testid="home-link"]')).toBeVisible();
    });
  });

  test.describe('パフォーマンステスト', () => {
    test('ページ読み込み時間測定', async ({ page }) => {
      await pageObjects.login();
      
      // ダッシュボード読み込み時間測定
      const startTime = Date.now();
      await pageObjects.navigateToDashboard();
      const loadTime = Date.now() - startTime;
      
      // 2秒以内での読み込みを期待
      expect(loadTime).toBeLessThan(2000);
    });

    test('大量データ表示性能', async ({ page }) => {
      await pageObjects.login();
      await page.goto('/incidents?limit=100');
      
      // 大量データ読み込み完了確認
      await page.waitForSelector('[data-testid="incidents-table"]');
      const rows = await page.locator('[data-testid="incident-row"]').count();
      expect(rows).toBeGreaterThan(10);
    });
  });

  test.describe('アクセシビリティテスト', () => {
    test('キーボードナビゲーション', async ({ page }) => {
      await pageObjects.login();
      await pageObjects.navigateToDashboard();
      
      // Tabキーでのナビゲーション確認
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // フォーカス状態の確認
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('スクリーンリーダー対応', async ({ page }) => {
      await pageObjects.login();
      await pageObjects.navigateToDashboard();
      
      // aria-labelの存在確認
      const buttons = page.locator('button');
      const count = await buttons.count();
      
      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        // ボタンにはaria-labelまたはテキストが必要
        expect(ariaLabel || textContent?.trim()).toBeTruthy();
      }
    });
  });

  test.describe('モバイル対応テスト', () => {
    test('スマートフォン表示', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await pageObjects.login();
      await pageObjects.navigateToDashboard();
      
      // モバイルメニューの表示確認
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // メニュー開閉の動作確認
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });

    test('タブレット表示', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await pageObjects.login();
      await pageObjects.navigateToDashboard();
      
      // タブレット向けレイアウトの確認
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      const sidebarWidth = await page.locator('[data-testid="sidebar"]').boundingBox();
      expect(sidebarWidth?.width).toBeGreaterThan(200);
    });
  });
});

test.describe('セキュリティテスト', () => {
  test('XSS攻撃耐性', async ({ page }) => {
    const pageObjects = new ITSMPageObjects(page);
    await pageObjects.login();
    
    // XSSペイロードでインシデント作成を試行
    const xssPayload = '<script>alert("XSS")</script>';
    await pageObjects.createIncident(xssPayload, 'XSSテスト');
    
    // スクリプトが実行されずにエスケープされることを確認
    await pageObjects.verifyIncidentInList(xssPayload);
    const titleElement = page.locator('[data-testid="incident-title"]');
    const innerHTML = await titleElement.innerHTML();
    expect(innerHTML).not.toContain('<script>');
  });

  test('CSRF保護', async ({ page }) => {
    const pageObjects = new ITSMPageObjects(page);
    await pageObjects.login();
    
    // CSRFトークンの存在確認
    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    expect(csrfToken).toBeTruthy();
  });
});

test.describe('API統合テスト', () => {
  test('バックエンドAPI通信確認', async ({ page }) => {
    const pageObjects = new ITSMPageObjects(page);
    await pageObjects.login();
    
    // API レスポンス監視
    const apiResponses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        });
      }
    });
    
    await pageObjects.navigateToDashboard();
    
    // APIが正常に呼び出されることを確認
    expect(apiResponses.length).toBeGreaterThan(0);
    const successfulRequests = apiResponses.filter(r => r.status < 400);
    expect(successfulRequests.length).toBeGreaterThan(0);
  });

  test('WebSocket接続テスト', async ({ page }) => {
    const pageObjects = new ITSMPageObjects(page);
    await pageObjects.login();
    
    // WebSocket接続の確認
    const wsConnections: string[] = [];
    page.on('websocket', ws => {
      wsConnections.push(ws.url());
    });
    
    await pageObjects.navigateToDashboard();
    await page.waitForTimeout(3000); // WebSocket接続待機
    
    // WebSocket接続が確立されることを確認
    expect(wsConnections.length).toBeGreaterThan(0);
  });
});