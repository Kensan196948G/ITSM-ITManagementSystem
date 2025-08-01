/**
 * システム設定管理フック
 * システム設定の取得、保存、リセット機能を提供
 */

import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';

export interface SystemInfo {
  systemName: string;
  version: string;
  organization: string;
  contactEmail: string;
  description: string;
}

export interface TimezoneSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  firstDayOfWeek: 'monday' | 'sunday';
}

export interface LocaleSettings {
  language: string;
  country: string;
  currency: string;
  numberFormat: string;
}

export interface ThemeSettings {
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  darkMode: boolean;
  customCss: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number;
  historyCount: number;
  lockoutAttempts: number;
  lockoutDuration: number;
}

export interface SessionSettings {
  maxSessionTime: number;
  inactivityTimeout: number;
  multipleSessionsAllowed: boolean;
  requireReauthentication: boolean;
}

export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  useSSL: boolean;
  useTLS: boolean;
  fromAddress: string;
  fromName: string;
  replyToAddress: string;
}

export interface SLASettings {
  priorities: Array<{
    id: string;
    name: string;
    responseTime: number;
    resolutionTime: number;
    color: string;
  }>;
  businessHours: {
    timezone: string;
    workdays: string[];
    startTime: string;
    endTime: string;
    holidays: string[];
  };
  escalationRules: Array<{
    id: string;
    priority: string;
    escalationLevels: Array<{
      level: number;
      timeMinutes: number;
      assignTo: string;
      notifyUsers: string[];
    }>;
  }>;
}

export interface SystemSettings {
  general: {
    systemInfo: SystemInfo;
    timezone: TimezoneSettings;
    locale: LocaleSettings;
    theme: ThemeSettings;
  };
  security: {
    passwordPolicy: PasswordPolicy;
    session: SessionSettings;
    twoFactorAuth: {
      enabled: boolean;
      required: boolean;
      methods: string[];
    };
    ipAccess: {
      enabled: boolean;
      whitelist: string[];
      blacklist: string[];
    };
  };
  notifications: {
    email: EmailSettings;
    sms: {
      provider: string;
      apiKey: string;
      fromNumber: string;
    };
    webhook: {
      endpoints: Array<{
        id: string;
        name: string;
        url: string;
        events: string[];
        active: boolean;
      }>;
    };
    templates: Array<{
      id: string;
      name: string;
      subject: string;
      body: string;
      type: 'email' | 'sms' | 'webhook';
    }>;
  };
  sla: SLASettings;
  workflows: {
    incident: any;
    problem: any;
    change: any;
    approval: any;
  };
  data: {
    database: {
      backupEnabled: boolean;
      backupFrequency: string;
      retentionDays: number;
    };
    retention: {
      incidents: number;
      problems: number;
      changes: number;
      logs: number;
    };
  };
  integrations: {
    api: {
      enabled: boolean;
      rateLimiting: boolean;
      authentication: string;
    };
    ldap: {
      enabled: boolean;
      host: string;
      port: number;
      baseDN: string;
      userFilter: string;
    };
    external: Array<{
      id: string;
      name: string;
      type: string;
      config: any;
    }>;
  };
  monitoring: {
    logs: {
      level: string;
      retention: number;
      maxSize: string;
    };
    performance: {
      enabled: boolean;
      thresholds: {
        cpu: number;
        memory: number;
        disk: number;
        response: number;
      };
    };
    alerts: Array<{
      id: string;
      name: string;
      condition: string;
      severity: string;
      recipients: string[];
    }>;
  };
}

export interface SettingHistory {
  id: string;
  category: string;
  setting: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  changedAt: string;
  reason: string;
}

export const useSystemSettings = () => {
  const { request } = useApi();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [history, setHistory] = useState<SettingHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [request]);

  // 設定の保存
  const saveSettings = useCallback(async (
    category: keyof SystemSettings,
    data: any,
    reason?: string
  ) => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [request]);

  // 設定のリセット
  const resetSettings = useCallback(async (category: keyof SystemSettings) => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定のリセットに失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [request]);

  // 設定履歴の読み込み
  const loadHistory = useCallback(async (category?: string, limit = 50) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      params.append('limit', limit.toString());
      
      const response = await request(`/api/v1/settings/history?${params}`, {
        method: 'GET',
      });
      setHistory(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '履歴の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [request]);

  // 設定のバリデーション
  const validateSettings = useCallback((category: keyof SystemSettings, data: any): string[] => {
    const errors: string[] = [];

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
  const updateSetting = useCallback((category: keyof SystemSettings, path: string, value: any) => {
    setSettings(prev => {
      if (!prev) return null;
      
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current: any = newSettings[category];
      
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
  const exportSettings = useCallback(async (categories?: (keyof SystemSettings)[]) => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定のエクスポートに失敗しました');
      throw err;
    }
  }, [request]);

  // 設定のインポート
  const importSettings = useCallback(async (file: File, merge = true) => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定のインポートに失敗しました');
      throw err;
    } finally {
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