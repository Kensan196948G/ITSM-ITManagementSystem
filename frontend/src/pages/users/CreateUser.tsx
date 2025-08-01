import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Divider,
  Chip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Switch,
  LinearProgress,
  Autocomplete,
  FormHelperText,
} from '@mui/material'
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
} from '@mui/icons-material'
import type { CreateUserForm, UserRole } from '../../types'

const CreateUser: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<CreateUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'viewer',
    department: '',
    manager: '',
    permissions: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Mock data - 実際の実装ではAPIから取得
  const departments = [
    'IT部',
    'サポート部',
    '営業部',
    '人事部',
    '経理部',
    'マーケティング部',
    '開発部',
    '品質管理部',
  ]

  const managers = [
    '佐藤花子',
    '田中一郎',
    '高橋三郎',
    '渡辺四郎',
    '伊藤五郎',
  ]

  const permissionGroups = {
    user: {
      label: 'ユーザー管理',
      permissions: [
        { id: 'user:view', label: 'ユーザー閲覧' },
        { id: 'user:create', label: 'ユーザー作成' },
        { id: 'user:update', label: 'ユーザー編集' },
        { id: 'user:delete', label: 'ユーザー削除' },
      ],
    },
    ticket: {
      label: 'チケット管理',
      permissions: [
        { id: 'ticket:view', label: 'チケット閲覧' },
        { id: 'ticket:create', label: 'チケット作成' },
        { id: 'ticket:update', label: 'チケット編集' },
        { id: 'ticket:delete', label: 'チケット削除' },
        { id: 'ticket:assign', label: 'チケット割当' },
      ],
    },
    report: {
      label: 'レポート',
      permissions: [
        { id: 'report:view', label: 'レポート閲覧' },
        { id: 'report:create', label: 'レポート作成' },
        { id: 'report:export', label: 'レポートエクスポート' },
      ],
    },
    system: {
      label: 'システム設定',
      permissions: [
        { id: 'system:config', label: 'システム設定' },
        { id: 'system:backup', label: 'バックアップ管理' },
        { id: 'system:audit', label: '監査ログ' },
      ],
    },
  }

  const rolePermissionDefaults = {
    admin: Object.values(permissionGroups).flatMap(group => group.permissions.map(p => p.id)),
    manager: ['user:view', 'ticket:view', 'ticket:create', 'ticket:update', 'ticket:assign', 'report:view'],
    operator: ['ticket:view', 'ticket:create', 'ticket:update'],
    viewer: ['ticket:view'],
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = '名前（名）は必須です'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = '名前（姓）は必須です'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスは必須です'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください'
    }

    if (formData.phone && !/^[\d\-\+\(\)\\s]+$/.test(formData.phone)) {
      newErrors.phone = '有効な電話番号を入力してください'
    }

    if (!formData.department) {
      newErrors.department = '部署は必須です'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      // API call simulation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Success - redirect to user list
      navigate('/users', {
        state: { message: 'ユーザーが正常に作成されました' }
      })
    } catch (error) {
      console.error('Error creating user:', error)
      setErrors({ submit: 'ユーザーの作成に失敗しました。もう一度お試しください。' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: rolePermissionDefaults[role] || [],
    }))
  }

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...(prev.permissions || []), permissionId]
        : (prev.permissions || []).filter(p => p !== permissionId),
    }))
  }

  const getRoleDescription = (role: UserRole) => {
    const descriptions = {
      admin: 'システム全体の管理権限を持ちます',
      manager: 'チーム管理とレポート閲覧が可能です',
      operator: 'チケットの作成・更新が可能です',
      viewer: 'チケットの閲覧のみ可能です',
    }
    return descriptions[role]
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          新規ユーザー作成
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/users')}
        >
          キャンセル
        </Button>
      </Box>

      {/* Progress indicator */}
      {isSubmitting && <LinearProgress sx={{ mb: 2 }} />}

      {/* Form error alert */}
      {errors.submit && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>エラー</AlertTitle>
          {errors.submit}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Main form */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                基本情報
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="姓 *"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    error={!!errors.lastName}
                    helperText={errors.lastName}
                    placeholder="山田"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="名 *"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    error={!!errors.firstName}
                    helperText={errors.firstName}
                    placeholder="太郎"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="メールアドレス *"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    error={!!errors.email}
                    helperText={errors.email}
                    placeholder="user@example.com"
                    InputProps={{
                      startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="電話番号"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    error={!!errors.phone}
                    helperText={errors.phone}
                    placeholder="090-1234-5678"
                    InputProps={{
                      startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.department}>
                    <InputLabel>部署 *</InputLabel>
                    <Select
                      value={formData.department}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      label="部署 *"
                      startAdornment={<BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                    >
                      {departments.map((dept) => (
                        <MenuItem key={dept} value={dept}>
                          {dept}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.department && <FormHelperText>{errors.department}</FormHelperText>}
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Autocomplete
                    options={managers}
                    value={formData.manager || null}
                    onChange={(_, value) => setFormData(prev => ({ ...prev, manager: value || '' }))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="上司・マネージャー"
                        placeholder="上司を選択（オプション）"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Permissions */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                権限設定
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {Object.entries(permissionGroups).map(([groupKey, group]) => (
                <Box key={groupKey} sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    {group.label}
                  </Typography>
                  <FormGroup>
                    <Grid container spacing={1}>
                      {group.permissions.map((permission) => (
                        <Grid item xs={12} sm={6} md={4} key={permission.id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.permissions?.includes(permission.id) || false}
                                onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                              />
                            }
                            label={permission.label}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </FormGroup>
                </Box>
              ))}
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Role selection */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  役割 *
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <Select
                    value={formData.role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    startAdornment={<SecurityIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                  >
                    <MenuItem value="admin">管理者</MenuItem>
                    <MenuItem value="manager">マネージャー</MenuItem>
                    <MenuItem value="operator">オペレーター</MenuItem>
                    <MenuItem value="viewer">閲覧者</MenuItem>
                  </Select>
                </FormControl>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    {getRoleDescription(formData.role)}
                  </Typography>
                </Alert>

                <Typography variant="subtitle2" gutterBottom>
                  選択した役割の権限:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {formData.permissions?.map((permission) => {
                    const permissionObj = Object.values(permissionGroups)
                      .flatMap(group => group.permissions)
                      .find(p => p.id === permission)
                    return (
                      <Chip
                        key={permission}
                        label={permissionObj?.label || permission}
                        size="small"
                        variant="outlined"
                      />
                    )
                  })}
                </Box>
              </CardContent>
            </Card>

            {/* Help information */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ヘルプ
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  ユーザー作成時のポイント：
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div">
                  • メールアドレスは一意である必要があります<br />
                  • 役割に応じて適切な権限が自動設定されます<br />
                  • 必要に応じて個別に権限をカスタマイズできます<br />
                  • 初回ログイン時にパスワード設定メールが送信されます
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/users')}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={isSubmitting}
            size="large"
          >
            {isSubmitting ? '作成中...' : 'ユーザーを作成'}
          </Button>
        </Box>
      </form>
    </Box>
  )
}

export default CreateUser