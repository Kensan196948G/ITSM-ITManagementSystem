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
  IconButton,
  LinearProgress,
  Autocomplete,
  FormHelperText,
} from '@mui/material'
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { priorityColors } from '../../theme/theme'
import type { CreateTicketForm, Priority } from '../../types'

const CreateTicket: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<CreateTicketForm>({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    assigneeId: '',
    attachments: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])

  // Mock data - 実際の実装ではAPIから取得
  const categories = [
    'Infrastructure',
    'Network',
    'Hardware',
    'Software',
    'Email',
    'Security',
    'License',
    'Database',
    'Application',
    'Other',
  ]

  const assignees = [
    { id: '1', name: '山田太郎', department: 'IT部' },
    { id: '2', name: '佐藤花子', department: 'IT部' },
    { id: '3', name: '田中一郎', department: 'IT部' },
    { id: '4', name: '高橋三郎', department: 'セキュリティ部' },
  ]

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です'
    } else if (formData.title.length > 200) {
      newErrors.title = 'タイトルは200文字以内で入力してください'
    }

    if (!formData.description.trim()) {
      newErrors.description = '説明は必須です'
    } else if (formData.description.length > 5000) {
      newErrors.description = '説明は5000文字以内で入力してください'
    }

    if (!formData.category) {
      newErrors.category = 'カテゴリは必須です'
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
      
      // Success - redirect to ticket list
      navigate('/tickets', {
        state: { message: 'チケットが正常に作成されました' }
      })
    } catch (error) {
      console.error('Error creating ticket:', error)
      setErrors({ submit: 'チケットの作成に失敗しました。もう一度お試しください。' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setErrors(prev => ({ ...prev, attachments: 'ファイルサイズは10MB以下にしてください' }))
        return false
      }
      return true
    })
    
    setAttachments(prev => [...prev, ...validFiles])
    setErrors(prev => ({ ...prev, attachments: '' }))
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getPriorityInfo = (priority: Priority) => {
    const info = {
      critical: {
        label: '緊急',
        description: '業務に重大な影響を与える問題（2時間以内の対応が必要）',
        color: priorityColors.critical,
      },
      high: {
        label: '高',
        description: '業務に影響を与える問題（8時間以内の対応が必要）',
        color: priorityColors.high,
      },
      medium: {
        label: '中',
        description: '通常の問題（24時間以内の対応が必要）',
        color: priorityColors.medium,
      },
      low: {
        label: '低',
        description: '軽微な問題（72時間以内の対応が必要）',
        color: priorityColors.low,
      },
    }
    return info[priority]
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          新規チケット作成
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/tickets')}
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
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                基本情報
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="タイトル *"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    error={!!errors.title}
                    helperText={errors.title}
                    placeholder="問題の概要を簡潔に記載してください"
                    inputProps={{ maxLength: 200 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="説明 *"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    error={!!errors.description}
                    helperText={errors.description || `${formData.description.length}/5000文字`}
                    placeholder="問題の詳細な説明、発生状況、エラーメッセージなどを記載してください"
                    inputProps={{ maxLength: 5000 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.category}>
                    <InputLabel>カテゴリ *</InputLabel>
                    <Select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      label="カテゴリ *"
                    >
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={assignees}
                    getOptionLabel={(option) => `${option.name} (${option.department})`}
                    value={assignees.find(a => a.id === formData.assigneeId) || null}
                    onChange={(_, value) => setFormData(prev => ({ ...prev, assigneeId: value?.id || '' }))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="担当者"
                        placeholder="担当者を選択（空白の場合は自動割当）"
                      />
                    )}
                  />
                </Grid>

                {/* File upload */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    添付ファイル
                  </Typography>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="file-upload"
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.log"
                  />
                  <label htmlFor="file-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<UploadIcon />}
                      sx={{ mb: 2 }}
                    >
                      ファイルを選択
                    </Button>
                  </label>
                  
                  {errors.attachments && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {errors.attachments}
                    </Alert>
                  )}

                  {attachments.length > 0 && (
                    <Box>
                      {attachments.map((file, index) => (
                        <Chip
                          key={index}
                          label={`${file.name} (${formatFileSize(file.size)})`}
                          onDelete={() => removeAttachment(index)}
                          deleteIcon={<DeleteIcon />}
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}
                  
                  <Typography variant="caption" color="text.secondary" display="block">
                    最大5ファイル、各ファイル10MB以下。対応形式: JPG, PNG, PDF, DOC, TXT, LOG
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Priority selection */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  優先度 *
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                  >
                    {(['critical', 'high', 'medium', 'low'] as Priority[]).map((priority) => {
                      const info = getPriorityInfo(priority)
                      return (
                        <MenuItem key={priority} value={priority}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: info.color,
                                mr: 1,
                              }}
                            />
                            {info.label}
                          </Box>
                        </MenuItem>
                      )
                    })}
                  </Select>
                </FormControl>
                
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <InfoIcon sx={{ fontSize: 16, color: 'info.main', mr: 0.5 }} />
                    <Typography variant="subtitle2">
                      {getPriorityInfo(formData.priority).label} 優先度
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {getPriorityInfo(formData.priority).description}
                  </Typography>
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
                  チケット作成時のポイント：
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div">
                  • 問題を再現する手順を詳しく記載
                  • エラーメッセージがあれば正確に記載
                  • スクリーンショットがあると解決が早くなります
                  • 影響範囲（何人くらいが困っているか）を記載
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/tickets')}
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
            {isSubmitting ? '作成中...' : 'チケットを作成'}
          </Button>
        </Box>
      </form>
    </Box>
  )
}

export default CreateTicket