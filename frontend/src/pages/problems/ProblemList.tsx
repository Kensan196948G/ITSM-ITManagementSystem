/**
 * 問題管理一覧ページ（レガシー）
 * 新しいProblemManagementコンポーネントにリダイレクト
 */

import React from 'react'
import ProblemManagement from './ProblemManagement'

const ProblemList: React.FC = () => {
  // 新しいProblemManagementコンポーネントを使用
  return <ProblemManagement />
}

export default ProblemList