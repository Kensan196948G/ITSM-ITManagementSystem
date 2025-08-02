import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Box, Grid, Typography, Card, CardContent, Avatar, IconButton, Chip, LinearProgress, Button, Stack, Skeleton, FormControl, Select, MenuItem, Paper, Switch, FormControlLabel } from '@mui/material';
import { Computer as ComputerIcon, Storage as StorageIcon, Memory as MemoryIcon, Speed as SpeedIcon, NetworkCheck as NetworkIcon, Security as SecurityIcon, Cloud as CloudIcon, MonitorHeart as MonitorIcon, Analytics as AnalyticsIcon, Warning as WarningIcon, Error as ErrorIcon, Notifications as NotificationsIcon, Group as GroupIcon, Assignment as AssignmentIcon, Refresh as RefreshIcon, Settings as SettingsIcon, Timeline as TimelineIcon, Build as BuildIcon, Apps as AppsIcon, Person as PersonIcon, Schedule as ScheduleIcon, SystemUpdate as SystemIcon, Lock as LockIcon, Description as DescriptionIcon, Activity as ActivityIcon } from '@mui/icons-material';
import StatusIndicator from '../../components/dashboard/StatusIndicator';
const IconRichMetricCard = React.memo(({ title, value, unit, status, icon, subtitle, isLive = false }) => {
    const statusColors = {
        good: { primary: '#10B981', secondary: '#059669', bg: '#F0FDF4' },
        warning: { primary: '#F59E0B', secondary: '#D97706', bg: '#FFFBEB' },
        critical: { primary: '#EF4444', secondary: '#DC2626', bg: '#FEF2F2' }
    };
    const colors = statusColors[status];
    return (_jsxs(Card, { sx: {
            height: '100%',
            background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(255,255,255,0.9) 100%)`,
            border: `2px solid ${colors.primary}30`,
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'visible',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 12px 30px ${colors.primary}25`,
                border: `2px solid ${colors.primary}60`
            }
        }, children: [isLive && (_jsx(Box, { sx: {
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 12,
                    height: 12,
                    bgcolor: 'success.main',
                    borderRadius: '50%',
                    animation: 'ping 2s infinite',
                    zIndex: 1
                } })), _jsxs(CardContent, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, mb: 2 }, children: [_jsx(Avatar, { sx: {
                                    bgcolor: colors.primary,
                                    width: 56,
                                    height: 56,
                                    boxShadow: `0 6px 15px ${colors.primary}40`
                                }, children: icon }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color: colors.primary, mb: 0.5 }, children: title }), subtitle && (_jsx(Typography, { variant: "caption", color: "text.secondary", children: subtitle }))] })] }), _jsxs(Typography, { variant: "h3", sx: {
                            fontWeight: 900,
                            color: colors.primary,
                            mb: 1,
                            textShadow: `0 2px 4px ${colors.primary}20`
                        }, children: [value, unit && _jsx("span", { style: { fontSize: '0.6em', marginLeft: '4px' }, children: unit })] }), _jsx(Typography, { variant: "body2", sx: {
                            fontWeight: 600,
                            color: colors.primary,
                            opacity: 0.8
                        }, children: status === 'good' ? '正常稼働中' : status === 'warning' ? '要注意' : '緊急対応要' })] })] }));
});
// Rich chart card component
const RichChartCard = ({ title, subtitle, icon, children, className, actions, isLive = false }) => (_jsxs(Card, { sx: {
        height: '100%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        transition: 'all 0.3s ease',
        position: 'relative',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 8
        }
    }, children: [isLive && (_jsxs(Box, { sx: {
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                bgcolor: 'success.main',
                borderRadius: 2,
                color: 'white'
            }, children: [_jsx(Box, { sx: { width: 6, height: 6, bgcolor: 'white', borderRadius: '50%', animation: 'pulse 2s infinite' } }), _jsx(Typography, { variant: "caption", sx: { fontSize: '10px', fontWeight: 600 }, children: "LIVE" })] })), _jsxs(CardContent, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [icon && (_jsx(Avatar, { sx: { bgcolor: 'primary.main', width: 40, height: 40 }, children: icon })), _jsxs(Box, { children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700 }, children: title }), subtitle && (_jsx(Typography, { variant: "body2", color: "text.secondary", children: subtitle }))] })] }), actions] }), children] })] }));
const RealTimeMonitoring = React.memo(() => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(300000); // 5分
    const [systemLoadHistory, setSystemLoadHistory] = useState([]);
    // ダミーデータ生成をuseCallbackでメモ化
    const generateMockData = useCallback(() => {
        const currentTime = new Date();
        const servers = [
            {
                id: 'srv-web-01',
                name: 'Webサーバー01',
                status: Math.random() > 0.1 ? 'online' : 'warning',
                cpu: Math.round(20 + Math.random() * 60),
                memory: Math.round(30 + Math.random() * 50),
                disk: Math.round(40 + Math.random() * 40),
                uptime: '15日 3時間 45分'
            },
            {
                id: 'srv-web-02',
                name: 'Webサーバー02',
                status: Math.random() > 0.1 ? 'online' : 'offline',
                cpu: Math.round(25 + Math.random() * 55),
                memory: Math.round(35 + Math.random() * 45),
                disk: Math.round(45 + Math.random() * 35),
                uptime: '12日 8時間 22分'
            },
            {
                id: 'srv-db-01',
                name: 'データベースサーバー',
                status: 'online',
                cpu: Math.round(40 + Math.random() * 40),
                memory: Math.round(60 + Math.random() * 30),
                disk: Math.round(70 + Math.random() * 20),
                uptime: '45日 12時間 18分'
            },
            {
                id: 'srv-app-01',
                name: 'アプリケーションサーバー',
                status: Math.random() > 0.05 ? 'online' : 'warning',
                cpu: Math.round(30 + Math.random() * 50),
                memory: Math.round(40 + Math.random() * 40),
                disk: Math.round(50 + Math.random() * 30),
                uptime: '8日 16時間 5分'
            }
        ];
        const services = [
            {
                id: 'svc-web',
                name: 'Webサービス',
                status: Math.random() > 0.1 ? 'operational' : 'degraded',
                responseTime: Math.round(150 + Math.random() * 200),
                uptime: 99.8,
                lastCheck: currentTime.toISOString()
            },
            {
                id: 'svc-api',
                name: 'APIサービス',
                status: 'operational',
                responseTime: Math.round(80 + Math.random() * 100),
                uptime: 99.9,
                lastCheck: currentTime.toISOString()
            },
            {
                id: 'svc-auth',
                name: '認証サービス',
                status: Math.random() > 0.05 ? 'operational' : 'outage',
                responseTime: Math.round(100 + Math.random() * 150),
                uptime: 99.7,
                lastCheck: currentTime.toISOString()
            },
            {
                id: 'svc-email',
                name: 'メールサービス',
                status: 'operational',
                responseTime: Math.round(200 + Math.random() * 300),
                uptime: 99.5,
                lastCheck: currentTime.toISOString()
            }
        ];
        const alerts = [
            {
                id: 'alert-001',
                type: Math.random() > 0.7 ? 'critical' : Math.random() > 0.5 ? 'warning' : 'info',
                message: 'CPUリソース使用率が高くなっています',
                timestamp: new Date(currentTime.getTime() - Math.random() * 300000).toISOString(),
                source: 'システム監視'
            },
            {
                id: 'alert-002',
                type: 'warning',
                message: 'ディスク容量が80%を超過しました',
                timestamp: new Date(currentTime.getTime() - Math.random() * 600000).toISOString(),
                source: 'インフラ監視'
            },
            {
                id: 'alert-003',
                type: 'info',
                message: '定期メンテナンスが完了しました',
                timestamp: new Date(currentTime.getTime() - Math.random() * 900000).toISOString(),
                source: 'メンテナンス'
            }
        ];
        const recentTickets = [
            {
                id: 'INC-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
                title: 'ネットワーク接続の不具合',
                priority: Math.random() > 0.7 ? 'high' : 'medium',
                status: 'open',
                assignee: '田中 太郎',
                created: new Date(currentTime.getTime() - Math.random() * 3600000).toISOString(),
                category: 'Network'
            },
            {
                id: 'INC-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
                title: 'アプリケーションエラー',
                priority: 'critical',
                status: 'in_progress',
                assignee: '佐藤 花子',
                created: new Date(currentTime.getTime() - Math.random() * 1800000).toISOString(),
                category: 'Application'
            }
        ];
        const statusChanges = [
            {
                id: 'change-001',
                ticketId: 'INC-123',
                from: 'open',
                to: 'in_progress',
                timestamp: new Date(currentTime.getTime() - Math.random() * 900000).toISOString(),
                user: '鈴木 次郎'
            },
            {
                id: 'change-002',
                ticketId: 'INC-124',
                from: 'in_progress',
                to: 'resolved',
                timestamp: new Date(currentTime.getTime() - Math.random() * 1200000).toISOString(),
                user: '高橋 美咲'
            }
        ];
        const systemEvents = [
            {
                id: 'event-001',
                type: 'system',
                message: 'サーバー再起動が完了しました',
                timestamp: new Date(currentTime.getTime() - Math.random() * 600000).toISOString(),
                severity: 'low'
            },
            {
                id: 'event-002',
                type: 'security',
                message: '不正アクセス試行を検出',
                timestamp: new Date(currentTime.getTime() - Math.random() * 300000).toISOString(),
                severity: 'high'
            }
        ];
        const userActivity = [
            {
                id: 'activity-001',
                user: '山田 花子',
                action: 'ログイン',
                target: 'システム',
                timestamp: new Date(currentTime.getTime() - Math.random() * 300000).toISOString()
            },
            {
                id: 'activity-002',
                user: '伊藤 太郎',
                action: 'チケット更新',
                target: 'INC-125',
                timestamp: new Date(currentTime.getTime() - Math.random() * 600000).toISOString()
            }
        ];
        return {
            systemStatus: {
                servers,
                services,
                network: {
                    status: Math.random() > 0.1 ? 'healthy' : 'degraded',
                    latency: Math.round(20 + Math.random() * 30),
                    packetLoss: Math.round(Math.random() * 2 * 100) / 100,
                    bandwidth: Math.round(800 + Math.random() * 200)
                },
                database: {
                    status: Math.random() > 0.05 ? 'connected' : 'slow',
                    connections: Math.round(15 + Math.random() * 35),
                    queryTime: Math.round(50 + Math.random() * 100),
                    size: '2.5GB'
                }
            },
            liveMetrics: {
                activeUsers: Math.round(45 + Math.random() * 20),
                activeTickets: Math.round(120 + Math.random() * 30),
                systemLoad: Math.round(30 + Math.random() * 40),
                alerts
            },
            liveFeed: {
                recentTickets,
                statusChanges,
                systemEvents,
                userActivity
            }
        };
    }, []);
    // データ取得関数をuseCallbackでメモ化 - 安定化
    const fetchData = useCallback(() => {
        if (!autoRefresh)
            return;
        // loadingステートを直接操作しないで安定化
        const newData = generateMockData();
        setData(prevData => {
            // データが変わった場合のみ更新
            if (!prevData || JSON.stringify(prevData.liveMetrics.systemLoad) !== JSON.stringify(newData.liveMetrics.systemLoad)) {
                return newData;
            }
            return prevData;
        });
        // システム負荷履歴を更新 - 安定化
        const currentTime = new Date().toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });
        setSystemLoadHistory(prev => {
            const newHistory = [...prev, { time: currentTime, load: newData.liveMetrics.systemLoad }];
            return newHistory.length > 20 ? newHistory.slice(-20) : newHistory;
        });
    }, [autoRefresh, generateMockData]);
    // 初期ロード用のuseEffect
    useEffect(() => {
        const initialLoad = () => {
            setLoading(true);
            setTimeout(() => {
                setData(generateMockData());
                setLoading(false);
            }, 500);
        };
        initialLoad();
    }, [generateMockData]);
    // リフレッシュ用のuseEffect - 分離して安定化
    useEffect(() => {
        if (autoRefresh && data) {
            const interval = setInterval(fetchData, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, refreshInterval, fetchData, data]);
    // アイコンとカラー関数をuseMemoでメモ化
    const getAlertIcon = useMemo(() => (type) => {
        switch (type) {
            case 'critical': return '🚨';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            default: return 'ℹ️';
        }
    }, []);
    const getAlertColor = useMemo(() => (type) => {
        switch (type) {
            case 'critical': return 'border-red-500 bg-red-50 text-red-800';
            case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
            case 'error': return 'border-red-500 bg-red-50 text-red-800';
            default: return 'border-blue-500 bg-blue-50 text-blue-800';
        }
    }, []);
    const getEventIcon = useMemo(() => (type) => {
        switch (type) {
            case 'system': return '⚙️';
            case 'security': return '🔒';
            case 'maintenance': return '🔧';
            case 'error': return '❌';
            default: return '📝';
        }
    }, []);
    if (loading || !data) {
        return (_jsx(Box, { sx: { p: 3 }, children: _jsx(Grid, { container: true, spacing: 3, children: Array.from({ length: 8 }).map((_, i) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Skeleton, { variant: "circular", width: 56, height: 56, sx: { mb: 2 } }), _jsx(Skeleton, { variant: "text", height: 24, sx: { mb: 1 } }), _jsx(Skeleton, { variant: "text", height: 40, sx: { mb: 1 } }), _jsx(Skeleton, { variant: "text", width: "60%" })] }) }) }, i))) }) }));
    }
    return (_jsxs(Box, { sx: { p: 3 }, children: [_jsxs(Box, { sx: {
                    mb: 4,
                    p: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden'
                }, children: [_jsx(Box, { sx: {
                            position: 'absolute',
                            top: -20,
                            right: -20,
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)',
                            animation: 'pulse 3s infinite'
                        } }), _jsxs(Grid, { container: true, spacing: 2, alignItems: "center", justifyContent: "space-between", children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, mb: 1 }, children: [_jsx(Avatar, { sx: { bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }, children: _jsx(MonitorIcon, { sx: { fontSize: 32 } }) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 800, mb: 0.5 }, children: "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u76E3\u8996\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9" }), _jsx(Typography, { variant: "body1", sx: { opacity: 0.9 }, children: "\u30B7\u30B9\u30C6\u30E0\u72B6\u614B\u3068\u30E9\u30A4\u30D6\u30E1\u30C8\u30EA\u30AF\u30B9\u306E\u76E3\u8996" })] })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Stack, { direction: "row", spacing: 2, justifyContent: "flex-end", flexWrap: "wrap", children: [_jsx(FormControlLabel, { control: _jsx(Switch, { checked: autoRefresh, onChange: (e) => setAutoRefresh(e.target.checked), sx: {
                                                    '& .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.3)' },
                                                    '& .MuiSwitch-thumb': { bgcolor: 'white' }
                                                } }), label: "\u81EA\u52D5\u66F4\u65B0", sx: { color: 'white', '& .MuiFormControlLabel-label': { fontWeight: 600 } } }), _jsx(FormControl, { size: "small", sx: { minWidth: 120 }, children: _jsxs(Select, { value: refreshInterval, onChange: (e) => setRefreshInterval(parseInt(e.target.value)), disabled: !autoRefresh, sx: {
                                                    color: 'white',
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                                                    '& .MuiSvgIcon-root': { color: 'white' }
                                                }, children: [_jsx(MenuItem, { value: 30000, children: "30\u79D2" }), _jsx(MenuItem, { value: 60000, children: "1\u5206" }), _jsx(MenuItem, { value: 300000, children: "5\u5206" }), _jsx(MenuItem, { value: 600000, children: "10\u5206" })] }) }), _jsx(Chip, { icon: _jsx(Box, { sx: { width: 8, height: 8, bgcolor: 'success.main', borderRadius: '50%', animation: 'pulse 2s infinite' } }), label: "LIVE", variant: "outlined", sx: {
                                                color: 'white',
                                                borderColor: 'rgba(255,255,255,0.3)',
                                                fontWeight: 600
                                            } })] }) })] })] }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 4 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(IconRichMetricCard, { title: "\u30A2\u30AF\u30C6\u30A3\u30D6\u30E6\u30FC\u30B6\u30FC", value: data.liveMetrics.activeUsers, unit: "\u4EBA", status: "good", icon: _jsx(GroupIcon, {}), subtitle: "\u73FE\u5728\u30AA\u30F3\u30E9\u30A4\u30F3", isLive: true }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(IconRichMetricCard, { title: "\u30A2\u30AF\u30C6\u30A3\u30D6\u30C1\u30B1\u30C3\u30C8", value: data.liveMetrics.activeTickets, unit: "\u4EF6", status: "good", icon: _jsx(AssignmentIcon, {}), subtitle: "\u5BFE\u5FDC\u4E2D\u306E\u30C1\u30B1\u30C3\u30C8", isLive: true }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(IconRichMetricCard, { title: "\u30B7\u30B9\u30C6\u30E0\u8CA0\u8377", value: data.liveMetrics.systemLoad, unit: "%", status: data.liveMetrics.systemLoad > 80 ? 'critical' : data.liveMetrics.systemLoad > 60 ? 'warning' : 'good', icon: _jsx(SpeedIcon, {}), subtitle: "CPU\u30FB\u30E1\u30E2\u30EA\u7DCF\u5408", isLive: true }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(IconRichMetricCard, { title: "\u30A2\u30AF\u30C6\u30A3\u30D6\u30A2\u30E9\u30FC\u30C8", value: data.liveMetrics.alerts.filter(a => a.type === 'critical' || a.type === 'warning').length, unit: "\u4EF6", status: data.liveMetrics.alerts.filter(a => a.type === 'critical').length > 0 ? 'critical' :
                                data.liveMetrics.alerts.filter(a => a.type === 'warning').length > 0 ? 'warning' : 'good', icon: _jsx(NotificationsIcon, {}), subtitle: "\u8981\u5BFE\u5FDC\u30A2\u30E9\u30FC\u30C8", isLive: true }) })] }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 4 }, children: [_jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(RichChartCard, { title: "\u30B5\u30FC\u30D0\u30FC\u72B6\u614B", subtitle: "\u5404\u30B5\u30FC\u30D0\u30FC\u306E\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u76E3\u8996", icon: _jsx(ComputerIcon, {}), isLive: true, actions: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(IconButton, { size: "small", children: _jsx(RefreshIcon, {}) }), _jsx(IconButton, { size: "small", children: _jsx(SettingsIcon, {}) })] }), children: _jsx(Stack, { spacing: 3, children: data.systemStatus.servers.map((server) => {
                                    const getServerIcon = (name) => {
                                        if (name.includes('Web'))
                                            return _jsx(NetworkIcon, {});
                                        if (name.includes('データベース'))
                                            return _jsx(StorageIcon, {});
                                        if (name.includes('アプリケーション'))
                                            return _jsx(AppsIcon, {});
                                        return _jsx(ComputerIcon, {});
                                    };
                                    const getStatusColor = (status) => {
                                        if (status === 'online')
                                            return { color: '#10B981', bg: '#F0FDF4' };
                                        if (status === 'warning')
                                            return { color: '#F59E0B', bg: '#FFFBEB' };
                                        return { color: '#EF4444', bg: '#FEF2F2' };
                                    };
                                    const statusColor = getStatusColor(server.status);
                                    return (_jsxs(Paper, { sx: {
                                            p: 3,
                                            background: `linear-gradient(135deg, ${statusColor.bg} 0%, rgba(255,255,255,0.9) 100%)`,
                                            border: `1px solid ${statusColor.color}30`,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: `0 8px 20px ${statusColor.color}25`
                                            }
                                        }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: statusColor.color, width: 40, height: 40 }, children: getServerIcon(server.name) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color: statusColor.color }, children: server.name }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: server.status === 'online' ? 'オンライン' : server.status === 'warning' ? '警告' : 'オフライン' })] })] }), _jsx(Chip, { label: `稼働時間: ${server.uptime}`, size: "small", variant: "outlined", sx: {
                                                            borderColor: statusColor.color,
                                                            color: statusColor.color,
                                                            fontWeight: 600
                                                        } })] }), _jsx(Grid, { container: true, spacing: 2, children: [
                                                    { label: 'CPU', value: server.cpu, icon: _jsx(SpeedIcon, {}) },
                                                    { label: 'メモリ', value: server.memory, icon: _jsx(MemoryIcon, {}) },
                                                    { label: 'ディスク', value: server.disk, icon: _jsx(StorageIcon, {}) }
                                                ].map((metric, index) => {
                                                    const getMetricColor = (value) => {
                                                        if (value > 80)
                                                            return '#EF4444';
                                                        if (value > 60)
                                                            return '#F59E0B';
                                                        return '#10B981';
                                                    };
                                                    const metricColor = getMetricColor(metric.value);
                                                    return (_jsx(Grid, { item: true, xs: 4, children: _jsxs(Box, { sx: { textAlign: 'center', p: 2, bgcolor: 'background.paper', borderRadius: 1 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }, children: [_jsx(Avatar, { sx: { bgcolor: metricColor, width: 24, height: 24 }, children: React.cloneElement(metric.icon, { sx: { fontSize: 14 } }) }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: metric.label })] }), _jsxs(Typography, { variant: "h6", sx: { fontWeight: 700, color: metricColor, mb: 1 }, children: [metric.value, "%"] }), _jsx(LinearProgress, { variant: "determinate", value: metric.value, sx: {
                                                                        height: 6,
                                                                        borderRadius: 3,
                                                                        bgcolor: 'grey.200',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            bgcolor: metricColor,
                                                                            borderRadius: 3
                                                                        }
                                                                    } })] }) }, index));
                                                }) })] }, server.id));
                                }) }) }) }), _jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(RichChartCard, { title: "\u30B5\u30FC\u30D3\u30B9\u72B6\u614B", subtitle: "\u5404\u30B5\u30FC\u30D3\u30B9\u306E\u7A3C\u50CD\u72B6\u6CC1", icon: _jsx(AppsIcon, {}), isLive: true, actions: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(IconButton, { size: "small", children: _jsx(AnalyticsIcon, {}) }), _jsx(IconButton, { size: "small", children: _jsx(RefreshIcon, {}) })] }), children: _jsx(Stack, { spacing: 3, children: data.systemStatus.services.map((service) => {
                                    const getServiceIcon = (name) => {
                                        if (name.includes('Web'))
                                            return _jsx(NetworkIcon, {});
                                        if (name.includes('API'))
                                            return _jsx(AppsIcon, {});
                                        if (name.includes('認証'))
                                            return _jsx(SecurityIcon, {});
                                        if (name.includes('メール'))
                                            return _jsx(DescriptionIcon, {});
                                        return _jsx(CloudIcon, {});
                                    };
                                    const getServiceStatusColor = (status) => {
                                        if (status === 'operational')
                                            return { color: '#10B981', bg: '#F0FDF4', label: '正常稼働' };
                                        if (status === 'degraded')
                                            return { color: '#F59E0B', bg: '#FFFBEB', label: '性能低下' };
                                        return { color: '#EF4444', bg: '#FEF2F2', label: 'サービス停止' };
                                    };
                                    const statusInfo = getServiceStatusColor(service.status);
                                    return (_jsxs(Paper, { sx: {
                                            p: 3,
                                            background: `linear-gradient(135deg, ${statusInfo.bg} 0%, rgba(255,255,255,0.9) 100%)`,
                                            border: `1px solid ${statusInfo.color}30`,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: `0 6px 15px ${statusInfo.color}25`
                                            }
                                        }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: statusInfo.color, width: 36, height: 36 }, children: getServiceIcon(service.name) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color: statusInfo.color }, children: service.name }), _jsx(Typography, { variant: "caption", sx: { color: statusInfo.color, fontWeight: 600 }, children: statusInfo.label })] })] }), _jsxs(Box, { sx: { textAlign: 'right' }, children: [_jsxs(Typography, { variant: "h6", sx: { fontWeight: 700, color: statusInfo.color }, children: [service.uptime, "%"] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u7A3C\u50CD\u7387" })] })] }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 6, children: _jsxs(Box, { sx: { textAlign: 'center', p: 1.5, bgcolor: 'background.paper', borderRadius: 1 }, children: [_jsxs(Typography, { variant: "h6", sx: { fontWeight: 700, color: 'primary.main' }, children: [service.responseTime, "ms"] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u5FDC\u7B54\u6642\u9593" })] }) }), _jsx(Grid, { item: true, xs: 6, children: _jsxs(Box, { sx: { textAlign: 'center', p: 1.5, bgcolor: 'background.paper', borderRadius: 1 }, children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: new Date(service.lastCheck).toLocaleTimeString('ja-JP', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    }) }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u6700\u7D42\u78BA\u8A8D" })] }) })] })] }, service.id));
                                }) }) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(RichChartCard, { title: "\u30B7\u30B9\u30C6\u30E0\u8CA0\u8377\u5C65\u6B74", subtitle: "\u904E\u53BB20\u56DE\u306E\u8CA0\u8377\u63A8\u79FB - \u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u66F4\u65B0", icon: _jsx(TimelineIcon, {}), isLive: true, actions: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { size: "small", variant: "outlined", startIcon: _jsx(AnalyticsIcon, {}), children: "\u8A73\u7D30\u5206\u6790" }), _jsx(IconButton, { size: "small", children: _jsx(RefreshIcon, {}) })] }), children: _jsx(Box, { sx: { height: 250, width: '100%' }, children: _jsx(ResponsiveContainer, { width: "100%", height: 250, children: _jsxs(AreaChart, { data: systemLoadHistory, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f0f0f0" }), _jsx(XAxis, { dataKey: "time", tick: { fontSize: 12 }, stroke: "#666" }), _jsx(YAxis, { domain: [0, 100], unit: "%", tick: { fontSize: 12 }, stroke: "#666" }), _jsx(Tooltip, { formatter: (value) => [`${value}%`, 'システム負荷'], contentStyle: {
                                                    backgroundColor: 'rgba(255,255,255,0.95)',
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                } }), _jsx(Area, { type: "monotone", dataKey: "load", stroke: "#3b82f6", fill: "url(#areaGradient)", fillOpacity: 0.8, strokeWidth: 3 }), _jsx("defs", { children: _jsxs("linearGradient", { id: "areaGradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#3b82f6", stopOpacity: 0.8 }), _jsx("stop", { offset: "95%", stopColor: "#3b82f6", stopOpacity: 0.1 })] }) })] }) }) }) }) })] }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 4 }, children: [_jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(RichChartCard, { title: "\u30A2\u30AF\u30C6\u30A3\u30D6\u30A2\u30E9\u30FC\u30C8", subtitle: "\u73FE\u5728\u306E\u30B7\u30B9\u30C6\u30E0\u30A2\u30E9\u30FC\u30C8", icon: _jsx(NotificationsIcon, {}), isLive: true, actions: _jsx(IconButton, { size: "small", children: _jsx(SettingsIcon, {}) }), children: _jsx(Box, { sx: { maxHeight: 400, overflow: 'auto' }, children: _jsx(Stack, { spacing: 2, children: data.liveMetrics.alerts.map((alert) => {
                                        const getAlertIconComponent = (type) => {
                                            switch (type) {
                                                case 'critical': return _jsx(ErrorIcon, {});
                                                case 'warning': return _jsx(WarningIcon, {});
                                                default: return _jsx(NotificationsIcon, {});
                                            }
                                        };
                                        const getAlertSeverity = (type) => {
                                            switch (type) {
                                                case 'critical': return { color: '#EF4444', bg: '#FEF2F2', severity: 'error' };
                                                case 'warning': return { color: '#F59E0B', bg: '#FFFBEB', severity: 'warning' };
                                                default: return { color: '#3B82F6', bg: '#EFF6FF', severity: 'info' };
                                            }
                                        };
                                        const alertSeverity = getAlertSeverity(alert.type);
                                        return (_jsx(Paper, { sx: {
                                                p: 2,
                                                background: `linear-gradient(135deg, ${alertSeverity.bg} 0%, rgba(255,255,255,0.9) 100%)`,
                                                border: `1px solid ${alertSeverity.color}30`,
                                                borderLeft: `4px solid ${alertSeverity.color}`,
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    transform: 'translateX(4px)',
                                                    boxShadow: `0 4px 12px ${alertSeverity.color}25`
                                                }
                                            }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'start', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: alertSeverity.color, width: 32, height: 32 }, children: getAlertIconComponent(alert.type) }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 600, mb: 1 }, children: alert.message }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Chip, { label: alert.source, size: "small", variant: "outlined", sx: {
                                                                            borderColor: alertSeverity.color,
                                                                            color: alertSeverity.color,
                                                                            fontSize: '11px'
                                                                        } }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: new Date(alert.timestamp).toLocaleString('ja-JP', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        }) })] })] })] }) }, alert.id));
                                    }) }) }) }) }), _jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(RichChartCard, { title: "\u6700\u65B0\u30C1\u30B1\u30C3\u30C8", subtitle: "\u6700\u8FD1\u4F5C\u6210\u3055\u308C\u305F\u30C1\u30B1\u30C3\u30C8", icon: _jsx(AssignmentIcon, {}), isLive: true, actions: _jsx(Button, { size: "small", variant: "outlined", startIcon: _jsx(AssignmentIcon, {}), children: "\u5168\u4EF6\u8868\u793A" }), children: _jsx(Box, { sx: { maxHeight: 400, overflow: 'auto' }, children: _jsx(Stack, { spacing: 2, children: data.liveFeed.recentTickets.map((ticket) => {
                                        const getPriorityColor = (priority) => {
                                            switch (priority) {
                                                case 'critical': return { color: '#EF4444', bg: '#FEF2F2', label: '緊急' };
                                                case 'high': return { color: '#F59E0B', bg: '#FFFBEB', label: '高' };
                                                case 'medium': return { color: '#3B82F6', bg: '#EFF6FF', label: '中' };
                                                default: return { color: '#10B981', bg: '#F0FDF4', label: '低' };
                                            }
                                        };
                                        const priorityInfo = getPriorityColor(ticket.priority);
                                        return (_jsxs(Paper, { sx: {
                                                p: 3,
                                                background: `linear-gradient(135deg, ${priorityInfo.bg} 0%, rgba(255,255,255,0.9) 100%)`,
                                                border: `1px solid ${priorityInfo.color}30`,
                                                transition: 'all 0.3s ease',
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: `0 6px 15px ${priorityInfo.color}25`
                                                }
                                            }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: priorityInfo.color, width: 32, height: 32 }, children: _jsx(AssignmentIcon, { sx: { fontSize: 18 } }) }), _jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color: priorityInfo.color }, children: ticket.id })] }), _jsx(Chip, { label: priorityInfo.label, size: "small", sx: {
                                                                bgcolor: priorityInfo.color,
                                                                color: 'white',
                                                                fontWeight: 600
                                                            } })] }), _jsx(Typography, { variant: "body2", sx: { fontWeight: 600, mb: 2 }, children: ticket.title }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(PersonIcon, { color: "action", sx: { fontSize: 16 } }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: ticket.assignee })] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: new Date(ticket.created).toLocaleString('ja-JP', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) })] })] }, ticket.id));
                                    }) }) }) }) }), _jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(RichChartCard, { title: "\u30B7\u30B9\u30C6\u30E0\u30A4\u30D9\u30F3\u30C8", subtitle: "\u6700\u65B0\u306E\u30B7\u30B9\u30C6\u30E0\u30A4\u30D9\u30F3\u30C8", icon: _jsx(SystemIcon, {}), isLive: true, actions: _jsx(IconButton, { size: "small", children: _jsx(ActivityIcon, {}) }), children: _jsx(Box, { sx: { maxHeight: 400, overflow: 'auto' }, children: _jsx(Stack, { spacing: 2, children: data.liveFeed.systemEvents.map((event) => {
                                        const getEventIconComponent = (type) => {
                                            switch (type) {
                                                case 'system': return _jsx(SystemIcon, {});
                                                case 'security': return _jsx(LockIcon, {});
                                                case 'maintenance': return _jsx(BuildIcon, {});
                                                case 'error': return _jsx(ErrorIcon, {});
                                                default: return _jsx(DescriptionIcon, {});
                                            }
                                        };
                                        const getSeverityInfo = (severity) => {
                                            switch (severity) {
                                                case 'critical': return { color: '#EF4444', bg: '#FEF2F2', label: '重大' };
                                                case 'high': return { color: '#F59E0B', bg: '#FFFBEB', label: '高' };
                                                case 'medium': return { color: '#F59E0B', bg: '#FFFBEB', label: '中' };
                                                default: return { color: '#10B981', bg: '#F0FDF4', label: '低' };
                                            }
                                        };
                                        const severityInfo = getSeverityInfo(event.severity);
                                        return (_jsx(Paper, { sx: {
                                                p: 2,
                                                borderLeft: `4px solid ${severityInfo.color}`,
                                                background: `linear-gradient(135deg, ${severityInfo.bg} 0%, rgba(255,255,255,0.9) 100%)`,
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    transform: 'translateX(4px)',
                                                    boxShadow: `0 4px 12px ${severityInfo.color}25`
                                                }
                                            }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'start', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: severityInfo.color, width: 32, height: 32 }, children: getEventIconComponent(event.type) }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 600, mb: 1 }, children: event.message }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Chip, { label: severityInfo.label, size: "small", sx: {
                                                                            bgcolor: severityInfo.color,
                                                                            color: 'white',
                                                                            fontWeight: 600,
                                                                            fontSize: '11px'
                                                                        } }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: new Date(event.timestamp).toLocaleString('ja-JP', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        }) })] })] })] }) }, event.id));
                                    }) }) }) }) }), _jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(RichChartCard, { title: "\u30E6\u30FC\u30B6\u30FC\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3", subtitle: "\u6700\u65B0\u306E\u30E6\u30FC\u30B6\u30FC\u64CD\u4F5C", icon: _jsx(PersonIcon, {}), isLive: true, actions: _jsx(IconButton, { size: "small", children: _jsx(ActivityIcon, {}) }), children: _jsx(Box, { sx: { maxHeight: 400, overflow: 'auto' }, children: _jsx(Stack, { spacing: 2, children: data.liveFeed.userActivity.map((activity) => (_jsx(Paper, { sx: {
                                            p: 2,
                                            background: 'linear-gradient(135deg, #F8FAFC 0%, rgba(255,255,255,0.9) 100%)',
                                            border: '1px solid #E2E8F0',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-1px)',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                bgcolor: '#F1F5F9'
                                            }
                                        }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: {
                                                                bgcolor: 'primary.main',
                                                                width: 36,
                                                                height: 36,
                                                                fontSize: '14px',
                                                                fontWeight: 700
                                                            }, children: activity.user.split(' ')[0][0] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: activity.user }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [activity.action, ": ", activity.target] })] })] }), _jsx(Typography, { variant: "caption", color: "text.secondary", sx: { fontWeight: 600 }, children: new Date(activity.timestamp).toLocaleTimeString('ja-JP', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) })] }) }, activity.id))) }) }) }) })] }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(RichChartCard, { title: "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u72B6\u614B", subtitle: "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u63A5\u7D9A\u3068\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9", icon: _jsx(NetworkIcon, {}), isLive: true, actions: _jsx(IconButton, { size: "small", children: _jsx(MonitorIcon, {}) }), children: _jsxs(Stack, { spacing: 3, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700 }, children: "\u5168\u4F53\u72B6\u614B" }), _jsx(StatusIndicator, { status: data.systemStatus.network.status })] }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 6, children: _jsxs(Paper, { sx: { p: 2, textAlign: 'center', bgcolor: '#F8FAFC' }, children: [_jsx(Avatar, { sx: { bgcolor: 'info.main', width: 32, height: 32, mx: 'auto', mb: 1 }, children: _jsx(NetworkIcon, { sx: { fontSize: 18 } }) }), _jsxs(Typography, { variant: "h5", sx: { fontWeight: 700, color: 'info.main' }, children: [data.systemStatus.network.latency, "ms"] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u30EC\u30A4\u30C6\u30F3\u30B7" })] }) }), _jsx(Grid, { item: true, xs: 6, children: _jsxs(Paper, { sx: { p: 2, textAlign: 'center', bgcolor: '#F8FAFC' }, children: [_jsx(Avatar, { sx: { bgcolor: 'warning.main', width: 32, height: 32, mx: 'auto', mb: 1 }, children: _jsx(ErrorIcon, { sx: { fontSize: 18 } }) }), _jsxs(Typography, { variant: "h5", sx: { fontWeight: 700, color: 'warning.main' }, children: [data.systemStatus.network.packetLoss, "%"] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u30D1\u30B1\u30C3\u30C8\u30ED\u30B9" })] }) })] }), _jsxs(Paper, { sx: { p: 3, textAlign: 'center', bgcolor: '#F0FDF4' }, children: [_jsx(Avatar, { sx: { bgcolor: 'success.main', width: 40, height: 40, mx: 'auto', mb: 1 }, children: _jsx(SpeedIcon, { sx: { fontSize: 20 } }) }), _jsxs(Typography, { variant: "h4", sx: { fontWeight: 800, color: 'success.main' }, children: [data.systemStatus.network.bandwidth, " Mbps"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5E2F\u57DF\u5E45\u4F7F\u7528\u91CF" })] })] }) }) }), _jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(RichChartCard, { title: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u72B6\u614B", subtitle: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u63A5\u7D9A\u3068\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9", icon: _jsx(StorageIcon, {}), isLive: true, actions: _jsx(IconButton, { size: "small", children: _jsx(AnalyticsIcon, {}) }), children: _jsxs(Stack, { spacing: 3, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700 }, children: "\u63A5\u7D9A\u72B6\u614B" }), _jsx(StatusIndicator, { status: data.systemStatus.database.status })] }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 6, children: _jsxs(Paper, { sx: { p: 2, textAlign: 'center', bgcolor: '#F8FAFC' }, children: [_jsx(Avatar, { sx: { bgcolor: 'primary.main', width: 32, height: 32, mx: 'auto', mb: 1 }, children: _jsx(GroupIcon, { sx: { fontSize: 18 } }) }), _jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: 'primary.main' }, children: data.systemStatus.database.connections }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u30A2\u30AF\u30C6\u30A3\u30D6\u63A5\u7D9A" })] }) }), _jsx(Grid, { item: true, xs: 6, children: _jsxs(Paper, { sx: { p: 2, textAlign: 'center', bgcolor: '#F8FAFC' }, children: [_jsx(Avatar, { sx: { bgcolor: 'secondary.main', width: 32, height: 32, mx: 'auto', mb: 1 }, children: _jsx(ScheduleIcon, { sx: { fontSize: 18 } }) }), _jsxs(Typography, { variant: "h5", sx: { fontWeight: 700, color: 'secondary.main' }, children: [data.systemStatus.database.queryTime, "ms"] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u30AF\u30A8\u30EA\u6642\u9593" })] }) })] }), _jsxs(Paper, { sx: { p: 3, textAlign: 'center', bgcolor: '#EFF6FF' }, children: [_jsx(Avatar, { sx: { bgcolor: 'info.main', width: 40, height: 40, mx: 'auto', mb: 1 }, children: _jsx(StorageIcon, { sx: { fontSize: 20 } }) }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 800, color: 'info.main' }, children: data.systemStatus.database.size }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u30B5\u30A4\u30BA" })] })] }) }) })] })] }));
});
export default RealTimeMonitoring;
