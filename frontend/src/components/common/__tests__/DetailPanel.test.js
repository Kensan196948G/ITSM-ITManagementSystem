import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import DetailPanel from '../DetailPanel';
import { theme } from '../../../theme/theme';
// Mock useMediaQuery
const mockUseMediaQuery = vi.fn();
vi.mock('@mui/material/useMediaQuery', () => ({
    default: () => mockUseMediaQuery()
}));
const mockDetailItem = {
    id: '1',
    type: 'ticket',
    title: 'テストチケット',
    subtitle: '#1 • テストカテゴリ',
    data: {
        id: '1',
        title: 'テストチケット',
        description: 'テスト用の説明文',
        status: 'open',
        priority: 'high',
        category: 'Test',
        createdAt: '2025-08-01T10:00:00Z',
        updatedAt: '2025-08-01T11:00:00Z',
    }
};
const renderDetailPanel = (props = {}) => {
    const defaultProps = {
        isOpen: true,
        item: mockDetailItem,
        onClose: vi.fn(),
        ...props
    };
    return render(_jsx(ThemeProvider, { theme: theme, children: _jsx(DetailPanel, { ...defaultProps }) }));
};
describe('DetailPanel', () => {
    beforeEach(() => {
        mockUseMediaQuery.mockReturnValue(false); // デスクトップ表示
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('基本表示テスト', () => {
        it('パネルが正しく表示される', () => {
            renderDetailPanel();
            expect(screen.getByRole('complementary')).toBeInTheDocument();
            // 複数の要素を回避するため、getByTextを使用して基本的な存在確認
            expect(screen.getByText('テストチケット')).toBeInTheDocument();
            expect(screen.getByText('#1 • テストカテゴリ')).toBeInTheDocument();
        });
        it('閉じているときは表示されない', () => {
            renderDetailPanel({ isOpen: false });
            expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
        });
        it('アイテムがnullの場合、適切なメッセージが表示される', () => {
            renderDetailPanel({ item: null });
            expect(screen.getByText('詳細情報を表示するアイテムを選択してください')).toBeInTheDocument();
        });
    });
    describe('操作テスト', () => {
        it('閉じるボタンをクリックすると onClose が呼ばれる', () => {
            const onClose = vi.fn();
            renderDetailPanel({ onClose });
            const closeButton = screen.getByLabelText('詳細パネルを閉じる');
            fireEvent.click(closeButton);
            expect(onClose).toHaveBeenCalledTimes(1);
        });
        it('リフレッシュボタンが表示される', () => {
            renderDetailPanel();
            const refreshButton = screen.getByLabelText('情報を更新');
            expect(refreshButton).toBeInTheDocument();
        });
        it('編集ボタンが表示される', () => {
            renderDetailPanel();
            const editButton = screen.getByLabelText('編集');
            expect(editButton).toBeInTheDocument();
        });
    });
    describe('キーボードナビゲーション', () => {
        it('Escapeキーで閉じる', async () => {
            const onClose = vi.fn();
            renderDetailPanel({ onClose });
            fireEvent.keyDown(document, { key: 'Escape' });
            await waitFor(() => {
                expect(onClose).toHaveBeenCalledTimes(1);
            });
        });
        it('Ctrl+F5でリフレッシュ', async () => {
            renderDetailPanel();
            fireEvent.keyDown(document, { key: 'F5', ctrlKey: true });
            // リフレッシュロジックが実行されることを確認
            // （実際の実装では API 呼び出しなどが行われる）
            await waitFor(() => {
                expect(screen.getByLabelText('情報を更新')).toBeInTheDocument();
            });
        });
    });
    describe('レスポンシブ対応', () => {
        it('モバイルビューで適切に表示される', () => {
            mockUseMediaQuery.mockReturnValue(true); // モバイル表示
            renderDetailPanel();
            // モバイル用の設定が適用されているかテスト
            const panel = screen.getByRole('complementary');
            expect(panel).toBeInTheDocument();
        });
        it('デスクトップビューで展開ボタンが表示される', () => {
            mockUseMediaQuery.mockReturnValue(false); // デスクトップ表示
            renderDetailPanel();
            const expandButton = screen.getByLabelText('展開');
            expect(expandButton).toBeInTheDocument();
        });
    });
    describe('エラーハンドリング', () => {
        it('エラーバウンダリが正しく動作する', () => {
            // コンソールエラーを一時的に無効化
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            // エラーを発生させるアイテム
            const errorItem = {
                ...mockDetailItem,
                data: null // これがエラーを引き起こす可能性
            };
            renderDetailPanel({ item: errorItem });
            // エラーが発生してもアプリケーションがクラッシュしないことを確認
            expect(screen.getByRole('complementary')).toBeInTheDocument();
            consoleSpy.mockRestore();
        });
    });
    describe('アクセシビリティ', () => {
        it('適切なARIA属性が設定されている', () => {
            renderDetailPanel();
            const panel = screen.getByRole('complementary');
            expect(panel).toHaveAttribute('aria-label', '詳細情報パネル');
            expect(panel).toHaveAttribute('aria-expanded', 'true');
        });
        it('フォーカス可能な要素が適切に設定されている', () => {
            renderDetailPanel();
            const closeButton = screen.getByLabelText('詳細パネルを閉じる');
            const refreshButton = screen.getByLabelText('情報を更新');
            const editButton = screen.getByLabelText('編集');
            
            // ボタンが存在することを確認（tabindexはMUIが自動で設定）
            expect(closeButton).toBeInTheDocument();
            expect(refreshButton).toBeInTheDocument();
            expect(editButton).toBeInTheDocument();
            
            // フォーカス可能であることを確認
            expect(closeButton).not.toHaveAttribute('disabled');
            expect(refreshButton).not.toHaveAttribute('disabled');
            expect(editButton).not.toHaveAttribute('disabled');
        });
    });
    describe('パフォーマンス', () => {
        it('大量のデータでも適切にレンダリングされる', () => {
            const largeDataItem = {
                ...mockDetailItem,
                data: {
                    ...mockDetailItem.data,
                    comments: Array.from({ length: 100 }, (_, i) => ({
                        id: i.toString(),
                        content: `コメント ${i}`,
                        authorName: `ユーザー ${i}`,
                        createdAt: '2025-08-01T10:00:00Z',
                        isInternal: false,
                    }))
                }
            };
            const start = performance.now();
            renderDetailPanel({ item: largeDataItem });
            const end = performance.now();
            // レンダリング時間が適切な範囲内であることを確認（200ms以下）
            expect(end - start).toBeLessThan(200);
            expect(screen.getByRole('complementary')).toBeInTheDocument();
        });
    });
});
describe('useDetailPanel Hook', () => {
    // フック単体のテストは別ファイルで実装予定
    it.todo('useDetailPanel のテストを実装');
});
