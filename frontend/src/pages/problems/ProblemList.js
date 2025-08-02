import { jsx as _jsx } from "react/jsx-runtime";
/**
 * 問題管理一覧ページ（レガシー）
 * 新しいProblemManagementコンポーネントにリダイレクト
 */
import React from 'react';
import ProblemManagement from './ProblemManagement';
const ProblemList = () => {
    // 新しいProblemManagementコンポーネントを使用
    return _jsx(ProblemManagement, {});
};
export default ProblemList;
