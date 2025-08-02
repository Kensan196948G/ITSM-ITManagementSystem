/**
 * システム設定管理フック
 * システム設定の取得、保存、リセット機能を提供
 */
import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
export const useSystemSettings = () => {
    const { request } = useApi();
    const [settings, setSettings] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isDirty, setIsDirty] = useState(false);
    // 設定の読み込み
    const loadSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await request('/api/v1/settings', {
                method: 'GET',
            });
            setSettings(response);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '設定の読み込みに失敗しました');
        }
        finally {
            setLoading(false);
        }
    }, [request]);
    // 設定の保存
    const saveSettings = useCallback(async (category, data, reason) => {
        setLoading(true);
        setError(null);
        try {
            const response = await request(`/api/v1/settings/${category}`, {
                method: 'PUT',
                body: JSON.stringify({ data, reason }),
            });
            // 設定を更新
            setSettings(prev => prev ? {
                ...prev,
                [category]: { ...prev[category], ...data }
            } : null);
            setIsDirty(false);
            return response;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '設定の保存に失敗しました');
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, [request]);
    // 設定のリセット
    const resetSettings = useCallback(async (category) => {
        setLoading(true);
        setError(null);
        try {
            const response = await request(`/api/v1/settings/${category}/reset`, {
                method: 'POST',
            });
            // 設定を更新
            setSettings(prev => prev ? {
                ...prev,
                [category]: response.data
            } : null);
            setIsDirty(false);
            return response;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '設定のリセットに失敗しました');
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, [request]);
    // 設定履歴の読み込み
    const loadHistory = useCallback(async (category, limit = 50) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (category)
                params.append('category', category);
            params.append('limit', limit.toString());
            const response = await request(`/api/v1/settings/history?${params}`, {
                method: 'GET',
            });
            setHistory(response);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '履歴の読み込みに失敗しました');
        }
        finally {
            setLoading(false);
        }
    }, [request]);
    // 設定のバリデーション
    const validateSettings = useCallback((category, data) => {
        const errors = [];
        switch (category) {
            case 'general':
                if (data.systemInfo) {
                    if (!data.systemInfo.systemName?.trim()) {
                        errors.push('システム名は必須です');
                    }
                    if (!data.systemInfo.contactEmail?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                        errors.push('有効なメールアドレスを入力してください');
                    }
                }
                break;
            case 'security':
                if (data.passwordPolicy) {
                    if (data.passwordPolicy.minLength < 4 || data.passwordPolicy.minLength > 128) {
                        errors.push('パスワード最小文字数は4-128文字の範囲で設定してください');
                    }
                    if (data.passwordPolicy.maxAge < 0) {
                        errors.push('パスワード有効期限は0以上で設定してください');
                    }
                }
                break;
            case 'notifications':
                if (data.email) {
                    if (!data.email.smtpHost?.trim()) {
                        errors.push('SMTPホストは必須です');
                    }
                    if (data.email.smtpPort < 1 || data.email.smtpPort > 65535) {
                        errors.push('SMTPポートは1-65535の範囲で設定してください');
                    }
                }
                break;
        }
        return errors;
    }, []);
    // 設定の変更検知
    const updateSetting = useCallback((category, path, value) => {
        setSettings(prev => {
            if (!prev)
                return null;
            const keys = path.split('.');
            const newSettings = { ...prev };
            let current = newSettings[category];
            // 深い階層まで更新
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]] = { ...current[keys[i]] };
            }
            current[keys[keys.length - 1]] = value;
            setIsDirty(true);
            return newSettings;
        });
    }, []);
    // 設定のエクスポート
    const exportSettings = useCallback(async (categories) => {
        try {
            const params = new URLSearchParams();
            if (categories) {
                categories.forEach(cat => params.append('categories', cat));
            }
            const response = await request(`/api/v1/settings/export?${params}`, {
                method: 'GET',
            });
            // ファイルダウンロード
            const blob = new Blob([JSON.stringify(response, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `system-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return response;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '設定のエクスポートに失敗しました');
            throw err;
        }
    }, [request]);
    // 設定のインポート
    const importSettings = useCallback(async (file, merge = true) => {
        setLoading(true);
        setError(null);
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            const formData = new FormData();
            formData.append('settings', JSON.stringify(importData));
            formData.append('merge', merge.toString());
            const response = await request('/api/v1/settings/import', {
                method: 'POST',
                body: formData,
            });
            // 設定を再読み込み
            await loadSettings();
            return response;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '設定のインポートに失敗しました');
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, [request, loadSettings]);
    // 初期読み込み
    useEffect(() => {
        loadSettings();
    }, [loadSettings]);
    return {
        settings,
        history,
        loading,
        error,
        isDirty,
        loadSettings,
        saveSettings,
        resetSettings,
        loadHistory,
        validateSettings,
        updateSetting,
        exportSettings,
        importSettings,
    };
};
export default useSystemSettings;
