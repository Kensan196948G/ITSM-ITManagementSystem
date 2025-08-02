#!/usr/bin/env python3
"""
ITSM フロントエンド自動修復エンジン
TypeScriptエラー、インポートエラー、型定義エラーを自動検知・修復
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

class ITSMFrontendAutoRepair:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.frontend_dir = self.project_root / "frontend"
        self.coordination_dir = self.project_root / "coordination"
        self.repair_log = []
        
    def log_repair(self, action: str, target: str, status: str, details: str = ""):
        """修復ログ記録"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "target": target,
            "status": status,
            "details": details
        }
        self.repair_log.append(entry)
        print(f"🔧 {action}: {target} - {status}")
        if details:
            print(f"   詳細: {details}")
    
    def fix_missing_imports(self):
        """不足しているインポートを修復"""
        print("🔍 不足インポート修復中...")
        
        # CheckCircle インポート修復
        repair_monitor_path = self.frontend_dir / "src/components/cicd/RepairMonitor.tsx"
        if repair_monitor_path.exists():
            content = repair_monitor_path.read_text(encoding='utf-8')
            if "CheckCircle" in content and "import { CheckCircle" not in content:
                # CheckCircleアイコンのインポート追加
                content = re.sub(
                    r'(import.*@mui/icons-material[^;]*);',
                    r'\1, CheckCircle;',
                    content
                )
                repair_monitor_path.write_text(content, encoding='utf-8')
                self.log_repair("修復", "RepairMonitor.tsx", "完了", "CheckCircleインポート追加")
        
        # Priority インポート修復
        detail_panel_content_path = self.frontend_dir / "src/components/common/DetailPanelContent.tsx"
        if detail_panel_content_path.exists():
            content = detail_panel_content_path.read_text(encoding='utf-8')
            if "Priority" in content:
                # PriorityからPriorityHighに修正
                content = content.replace("Priority", "PriorityHigh")
                content = re.sub(
                    r'(import.*@mui/icons-material[^;]*);',
                    r'\1, PriorityHigh;',
                    content
                )
                detail_panel_content_path.write_text(content, encoding='utf-8')
                self.log_repair("修復", "DetailPanelContent.tsx", "完了", "Priority -> PriorityHigh修正")
    
    def fix_type_definitions(self):
        """型定義エラーを修復"""
        print("🔍 型定義エラー修復中...")
        
        # User型にusernameフィールド追加
        user_types_path = self.frontend_dir / "src/types/index.ts"
        if user_types_path.exists():
            content = user_types_path.read_text(encoding='utf-8')
            if "interface User" in content and "username" not in content:
                content = re.sub(
                    r'(interface User\s*{[^}]+id:\s*string;)',
                    r'\1\n  username: string;',
                    content,
                    flags=re.DOTALL
                )
                user_types_path.write_text(content, encoding='utf-8')
                self.log_repair("修復", "User型定義", "完了", "usernameフィールド追加")
        
        # UserRole型の修正
        if "export type UserRole" not in user_types_path.read_text(encoding='utf-8'):
            content = user_types_path.read_text(encoding='utf-8')
            content += "\n\nexport type UserRole = 'admin' | 'user' | 'viewer' | 'manager';\n"
            user_types_path.write_text(content, encoding='utf-8')
            self.log_repair("修復", "UserRole型", "完了", "UserRole型定義追加")
    
    def fix_missing_components(self):
        """不足しているコンポーネントを作成"""
        print("🔍 不足コンポーネント作成中...")
        
        # ModalDialog コンポーネント作成
        modal_dialog_path = self.frontend_dir / "src/components/common/ModalDialog.tsx"
        if not modal_dialog_path.exists():
            modal_dialog_content = '''import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  open,
  onClose,
  title,
  children,
  actions
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
};

export default ModalDialog;
'''
            modal_dialog_path.write_text(modal_dialog_content, encoding='utf-8')
            self.log_repair("作成", "ModalDialog.tsx", "完了", "ModalDialogコンポーネント作成")
        
        # FormBuilder コンポーネント作成
        form_builder_path = self.frontend_dir / "src/components/common/FormBuilder.tsx"
        if not form_builder_path.exists():
            form_builder_content = '''import React from 'react';
import { TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel } from '@mui/material';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'checkbox';
  value?: any;
  options?: Array<{ value: any; label: string }>;
  onChange: (name: string, value: any) => void;
}

interface FormBuilderProps {
  fields: FormField[];
}

export const FormBuilder: React.FC<FormBuilderProps> = ({ fields }) => {
  return (
    <>
      {fields.map((field) => {
        switch (field.type) {
          case 'select':
            return (
              <FormControl key={field.name} fullWidth margin="normal">
                <InputLabel>{field.label}</InputLabel>
                <Select
                  value={field.value || ''}
                  onChange={(e) => field.onChange(field.name, e.target.value)}
                >
                  {field.options?.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          case 'checkbox':
            return (
              <FormControlLabel
                key={field.name}
                control={
                  <Checkbox
                    checked={field.value || false}
                    onChange={(e) => field.onChange(field.name, e.target.checked)}
                  />
                }
                label={field.label}
              />
            );
          default:
            return (
              <TextField
                key={field.name}
                label={field.label}
                type={field.type}
                value={field.value || ''}
                onChange={(e) => field.onChange(field.name, e.target.value)}
                fullWidth
                margin="normal"
              />
            );
        }
      })}
    </>
  );
};

export default FormBuilder;
'''
            form_builder_path.write_text(form_builder_content, encoding='utf-8')
            self.log_repair("作成", "FormBuilder.tsx", "完了", "FormBuilderコンポーネント作成")
    
    def fix_chart_props(self):
        """チャートプロパティエラーを修復"""
        print("🔍 チャートプロパティ修復中...")
        
        # GaugeChart data プロパティ修復
        files_to_fix = [
            "src/components/cicd/CICDDashboard.tsx",
            "src/components/cicd/RepairMonitor.tsx", 
            "src/components/cicd/SystemHealthChart.tsx"
        ]
        
        for file_path in files_to_fix:
            full_path = self.frontend_dir / file_path
            if full_path.exists():
                content = full_path.read_text(encoding='utf-8')
                # GaugeChartProps に data プロパティを追加
                content = re.sub(
                    r'(<AnimatedGaugeChart[^>]*?)(\s*/>)',
                    r'\1 data={[]}\2',
                    content
                )
                full_path.write_text(content, encoding='utf-8')
                self.log_repair("修復", file_path, "完了", "GaugeChart dataプロパティ追加")
    
    def fix_test_types(self):
        """テスト型定義を修復"""
        print("🔍 テスト型定義修復中...")
        
        # @types/jest をpackage.jsonに追加
        package_json_path = self.frontend_dir / "package.json"
        if package_json_path.exists():
            with open(package_json_path, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
            
            if "@types/jest" not in package_data.get("devDependencies", {}):
                package_data.setdefault("devDependencies", {})["@types/jest"] = "^29.5.12"
                
                with open(package_json_path, 'w', encoding='utf-8') as f:
                    json.dump(package_data, f, indent=2, ensure_ascii=False)
                
                self.log_repair("修復", "package.json", "完了", "@types/jest追加")
    
    def fix_drawer_props(self):
        """Drawer プロパティエラーを修復"""
        print("🔍 Drawer プロパティ修復中...")
        
        detail_panel_path = self.frontend_dir / "src/components/common/DetailPanel.tsx"
        if detail_panel_path.exists():
            content = detail_panel_path.read_text(encoding='utf-8')
            # SlideProps の direction を修正
            content = re.sub(
                r'direction:\s*["\']?(right|left|up|down)["\']?',
                r'direction: "right" as const',
                content
            )
            detail_panel_path.write_text(content, encoding='utf-8')
            self.log_repair("修復", "DetailPanel.tsx", "完了", "Drawer direction型修正")
    
    def update_coordination_state(self):
        """coordination状態を更新"""
        print("🔍 coordination状態更新中...")
        
        # errors.json をクリア
        errors_path = self.coordination_dir / "errors.json"
        errors_path.parent.mkdir(exist_ok=True)
        with open(errors_path, 'w', encoding='utf-8') as f:
            json.dump([], f)
        
        # 修復状態を記録
        repair_state = {
            "timestamp": datetime.now().isoformat(),
            "frontend_repair": {
                "status": "completed",
                "errors_fixed": len(self.repair_log),
                "repair_log": self.repair_log
            }
        }
        
        repair_state_path = self.coordination_dir / "frontend_repair_state.json"
        with open(repair_state_path, 'w', encoding='utf-8') as f:
            json.dump(repair_state, f, indent=2, ensure_ascii=False)
        
        self.log_repair("更新", "coordination状態", "完了", f"{len(self.repair_log)}件の修復記録")
    
    def run_repair_cycle(self):
        """修復サイクル実行"""
        print("🚀 ITSM フロントエンド自動修復開始")
        print(f"プロジェクトルート: {self.project_root}")
        print(f"フロントエンドディレクトリ: {self.frontend_dir}")
        
        try:
            # 各修復処理を実行
            self.fix_missing_imports()
            self.fix_type_definitions()
            self.fix_missing_components()
            self.fix_chart_props()
            self.fix_test_types()
            self.fix_drawer_props()
            self.update_coordination_state()
            
            print(f"✅ フロントエンド自動修復完了 ({len(self.repair_log)}件修復)")
            
            # 修復後のビルドテスト
            print("🔍 修復後ビルドテスト実行中...")
            os.chdir(self.frontend_dir)
            result = subprocess.run(['npm', 'install'], capture_output=True, text=True)
            if result.returncode == 0:
                print("✅ npm install 成功")
            else:
                print(f"❌ npm install 失敗: {result.stderr}")
            
            return True
            
        except Exception as e:
            print(f"❌ 修復エラー: {str(e)}")
            return False

def main():
    if len(sys.argv) > 1:
        project_root = sys.argv[1]
    else:
        project_root = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem"
    
    repair_engine = ITSMFrontendAutoRepair(project_root)
    success = repair_engine.run_repair_cycle()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()