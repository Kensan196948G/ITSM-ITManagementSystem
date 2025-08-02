import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API統合テスト
 * DetailPanelが依存するAPIエンドポイントのテスト
 */

test.describe('API Integration Tests', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    // API専用のコンテキストを作成
    apiContext = await playwright.request.newContext({
      baseURL: 'http://192.168.3.135:3001', // バックエンドAPI URL
      extraHTTPHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('チケットAPI', () => {
    test('チケット一覧取得', async () => {
      const response = await apiContext.get('/api/tickets');
      
      expect(response.status()).toBe(200);
      
      const tickets = await response.json();
      expect(Array.isArray(tickets)).toBeTruthy();
      
      if (tickets.length > 0) {
        const ticket = tickets[0];
        expect(ticket).toHaveProperty('id');
        expect(ticket).toHaveProperty('title');
        expect(ticket).toHaveProperty('status');
        expect(ticket).toHaveProperty('priority');
      }
    });

    test('特定チケット詳細取得', async () => {
      // まず一覧を取得してIDを取得
      const listResponse = await apiContext.get('/api/tickets');
      const tickets = await listResponse.json();
      
      if (tickets.length > 0) {
        const ticketId = tickets[0].id;
        
        const response = await apiContext.get(`/api/tickets/${ticketId}`);
        expect(response.status()).toBe(200);
        
        const ticket = await response.json();
        expect(ticket.id).toBe(ticketId);
        expect(ticket).toHaveProperty('title');
        expect(ticket).toHaveProperty('description');
        expect(ticket).toHaveProperty('status');
        expect(ticket).toHaveProperty('priority');
        expect(ticket).toHaveProperty('createdAt');
        expect(ticket).toHaveProperty('updatedAt');
      }
    });

    test('チケット更新', async () => {
      // テスト用のチケットを作成
      const createResponse = await apiContext.post('/api/tickets', {
        data: {
          title: 'テスト更新チケット',
          description: 'テスト用の説明',
          status: 'open',
          priority: 'medium',
          category: 'Test'
        }
      });
      
      expect(createResponse.status()).toBe(201);
      const createdTicket = await createResponse.json();
      
      // チケットを更新
      const updateData = {
        title: '更新されたテストチケット',
        description: '更新されたテスト用の説明',
        status: 'in_progress',
        priority: 'high'
      };
      
      const updateResponse = await apiContext.put(`/api/tickets/${createdTicket.id}`, {
        data: updateData
      });
      
      expect(updateResponse.status()).toBe(200);
      
      const updatedTicket = await updateResponse.json();
      expect(updatedTicket.title).toBe(updateData.title);
      expect(updatedTicket.description).toBe(updateData.description);
      expect(updatedTicket.status).toBe(updateData.status);
      expect(updatedTicket.priority).toBe(updateData.priority);
      
      // クリーンアップ
      await apiContext.delete(`/api/tickets/${createdTicket.id}`);
    });

    test('エラーハンドリング - 存在しないチケット', async () => {
      const response = await apiContext.get('/api/tickets/non-existent-id');
      expect(response.status()).toBe(404);
      
      const error = await response.json();
      expect(error).toHaveProperty('error');
      expect(error.error).toContain('not found');
    });

    test('バリデーションエラー - 不正なデータ', async () => {
      const response = await apiContext.post('/api/tickets', {
        data: {
          // titleが欠落している無効なデータ
          description: 'テスト用の説明',
          status: 'invalid_status',
          priority: 'invalid_priority'
        }
      });
      
      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty('error');
      expect(error).toHaveProperty('validationErrors');
    });
  });

  test.describe('ユーザーAPI', () => {
    test('ユーザー一覧取得', async () => {
      const response = await apiContext.get('/api/users');
      
      expect(response.status()).toBe(200);
      
      const users = await response.json();
      expect(Array.isArray(users)).toBeTruthy();
      
      if (users.length > 0) {
        const user = users[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
      }
    });

    test('特定ユーザー詳細取得', async () => {
      const listResponse = await apiContext.get('/api/users');
      const users = await listResponse.json();
      
      if (users.length > 0) {
        const userId = users[0].id;
        
        const response = await apiContext.get(`/api/users/${userId}`);
        expect(response.status()).toBe(200);
        
        const user = await response.json();
        expect(user.id).toBe(userId);
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('profile');
      }
    });
  });

  test.describe('コメントAPI', () => {
    test('チケットのコメント取得', async () => {
      // 既存のチケットIDを取得
      const ticketsResponse = await apiContext.get('/api/tickets');
      const tickets = await ticketsResponse.json();
      
      if (tickets.length > 0) {
        const ticketId = tickets[0].id;
        
        const response = await apiContext.get(`/api/tickets/${ticketId}/comments`);
        expect(response.status()).toBe(200);
        
        const comments = await response.json();
        expect(Array.isArray(comments)).toBeTruthy();
        
        if (comments.length > 0) {
          const comment = comments[0];
          expect(comment).toHaveProperty('id');
          expect(comment).toHaveProperty('content');
          expect(comment).toHaveProperty('authorName');
          expect(comment).toHaveProperty('createdAt');
        }
      }
    });

    test('コメント作成', async () => {
      // テスト用のチケットを作成
      const ticketResponse = await apiContext.post('/api/tickets', {
        data: {
          title: 'コメントテスト用チケット',
          description: 'テスト用',
          status: 'open',
          priority: 'medium',
          category: 'Test'
        }
      });
      
      const ticket = await ticketResponse.json();
      
      // コメントを作成
      const commentData = {
        content: 'テストコメント',
        isInternal: false
      };
      
      const response = await apiContext.post(`/api/tickets/${ticket.id}/comments`, {
        data: commentData
      });
      
      expect(response.status()).toBe(201);
      
      const comment = await response.json();
      expect(comment.content).toBe(commentData.content);
      expect(comment.isInternal).toBe(commentData.isInternal);
      expect(comment).toHaveProperty('authorName');
      expect(comment).toHaveProperty('createdAt');
      
      // クリーンアップ
      await apiContext.delete(`/api/tickets/${ticket.id}`);
    });
  });

  test.describe('パフォーマンステスト', () => {
    test('API応答時間テスト', async () => {
      const startTime = Date.now();
      
      const response = await apiContext.get('/api/tickets');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(1000); // 1秒以内での応答
    });

    test('大量データ処理テスト', async () => {
      // ページネーション付きで大量データを取得
      const response = await apiContext.get('/api/tickets?limit=100&offset=0');
      
      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty('tickets');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('offset');
      
      // データ量の確認
      expect(Array.isArray(result.tickets)).toBeTruthy();
      expect(result.tickets.length).toBeLessThanOrEqual(100);
    });

    test('同時リクエスト処理テスト', async () => {
      const promises = [];
      
      // 10個の同時リクエストを送信
      for (let i = 0; i < 10; i++) {
        promises.push(apiContext.get('/api/tickets'));
      }
      
      const responses = await Promise.all(promises);
      
      // すべてのリクエストが成功することを確認
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
    });
  });

  test.describe('エラー処理とレジリエンス', () => {
    test('レート制限テスト', async () => {
      const promises = [];
      
      // 短時間で大量リクエストを送信
      for (let i = 0; i < 100; i++) {
        promises.push(apiContext.get('/api/tickets'));
      }
      
      const responses = await Promise.allSettled(promises);
      
      // 一部のリクエストがレート制限でブロックされる可能性がある
      const successfulResponses = responses.filter(result => 
        result.status === 'fulfilled' && result.value.status() === 200
      );
      
      const rateLimitedResponses = responses.filter(result => 
        result.status === 'fulfilled' && result.value.status() === 429
      );
      
      // 少なくとも一部のリクエストは成功する
      expect(successfulResponses.length).toBeGreaterThan(0);
      
      // レート制限が適用される場合の確認
      if (rateLimitedResponses.length > 0) {
        console.log(`Rate limited responses: ${rateLimitedResponses.length}`);
      }
    });

    test('タイムアウト処理テスト', async () => {
      // タイムアウトを短く設定してテスト
      const shortTimeoutContext = await test.info().project.use.context!.request.newContext({
        baseURL: 'http://192.168.3.135:3001',
        timeout: 100 // 100ms のタイムアウト
      });
      
      try {
        // 時間のかかる処理をシミュレート
        const response = await shortTimeoutContext.get('/api/tickets?delay=200');
        
        // タイムアウトが発生するはず
        expect(response.status()).toBe(408);
      } catch (error) {
        // タイムアウトエラーが発生することを確認
        expect(error.message).toContain('timeout');
      } finally {
        await shortTimeoutContext.dispose();
      }
    });

    test('認証エラー処理', async () => {
      // 無効な認証情報でリクエスト
      const unauthorizedContext = await test.info().project.use.context!.request.newContext({
        baseURL: 'http://192.168.3.135:3001',
        extraHTTPHeaders: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      
      try {
        const response = await unauthorizedContext.get('/api/tickets');
        expect(response.status()).toBe(401);
        
        const error = await response.json();
        expect(error).toHaveProperty('error');
        expect(error.error).toContain('Unauthorized');
      } finally {
        await unauthorizedContext.dispose();
      }
    });
  });

  test.describe('データ整合性テスト', () => {
    test('CRUD操作の整合性', async () => {
      // 作成
      const createData = {
        title: 'データ整合性テストチケット',
        description: 'テスト用の説明',
        status: 'open',
        priority: 'medium',
        category: 'Test'
      };
      
      const createResponse = await apiContext.post('/api/tickets', {
        data: createData
      });
      
      expect(createResponse.status()).toBe(201);
      const createdTicket = await createResponse.json();
      
      // 読み取り
      const readResponse = await apiContext.get(`/api/tickets/${createdTicket.id}`);
      expect(readResponse.status()).toBe(200);
      const readTicket = await readResponse.json();
      
      expect(readTicket.title).toBe(createData.title);
      expect(readTicket.description).toBe(createData.description);
      
      // 更新
      const updateData = {
        title: '更新されたタイトル',
        status: 'in_progress'
      };
      
      const updateResponse = await apiContext.put(`/api/tickets/${createdTicket.id}`, {
        data: updateData
      });
      
      expect(updateResponse.status()).toBe(200);
      const updatedTicket = await updateResponse.json();
      
      expect(updatedTicket.title).toBe(updateData.title);
      expect(updatedTicket.status).toBe(updateData.status);
      
      // 削除
      const deleteResponse = await apiContext.delete(`/api/tickets/${createdTicket.id}`);
      expect(deleteResponse.status()).toBe(204);
      
      // 削除確認
      const verifyDeleteResponse = await apiContext.get(`/api/tickets/${createdTicket.id}`);
      expect(verifyDeleteResponse.status()).toBe(404);
    });
  });
});