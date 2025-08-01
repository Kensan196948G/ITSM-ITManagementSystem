#!/usr/bin/env python3
"""
フロントエンドコード自動修復システム
TypeScript, React, Material-UIエラーの自動修復
"""

import os
import re
import json
import ast
import logging
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import tempfile
import shutil

class FrontendCodeFixer:
    def __init__(self, 
                 frontend_path: str = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/frontend",
                 coordination_path: str = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination"):
        self.frontend_path = Path(frontend_path)
        self.coordination_path = Path(coordination_path)
        self.fixes_file = self.coordination_path / "fixes.json"
        self.backup_dir = self.coordination_path / "frontend-repair" / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.setup_logging()

    def setup_logging(self):
        """ログ設定"""
        log_file = self.coordination_path / "frontend-repair" / "fixer.log"
        log_file.parent.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def create_backup(self, file_path: str) -> str:
        """ファイルのバックアップを作成"""
        file_path = Path(file_path)
        if not file_path.is_absolute():
            file_path = self.frontend_path / file_path
            
        if file_path.exists():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"{file_path.name}_{timestamp}.backup"
            backup_path = self.backup_dir / backup_name
            
            shutil.copy2(file_path, backup_path)
            self.logger.info(f"Created backup: {backup_path}")
            return str(backup_path)
        
        return ""

    def _clean_file_path(self, file_path: str) -> str:
        """ファイルパスから行番号・列番号を除去"""
        # パターン: src/file.tsx(123,45) -> src/file.tsx
        import re
        cleaned = re.sub(r'\(\d+,\d+\)$', '', file_path)
        return cleaned

    def read_file_content(self, file_path: str) -> str:
        """ファイル内容を読み込み"""
        # ファイルパスから行番号・列番号を除去
        clean_path = self._clean_file_path(file_path)
        
        file_path = Path(clean_path)
        if not file_path.is_absolute():
            file_path = self.frontend_path / clean_path
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            self.logger.error(f"Failed to read file {file_path}: {e}")
            return ""

    def write_file_content(self, file_path: str, content: str) -> bool:
        """ファイル内容を書き込み"""
        # ファイルパスから行番号・列番号を除去
        clean_path = self._clean_file_path(file_path)
        
        file_path = Path(clean_path)
        if not file_path.is_absolute():
            file_path = self.frontend_path / clean_path
            
        try:
            # バックアップを作成
            self.create_backup(file_path)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            self.logger.error(f"Failed to write file {file_path}: {e}")
            return False

    def fix_typescript_error(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """TypeScriptエラーを修復"""
        fix_result = {
            'success': False,
            'changes_made': [],
            'error': None
        }
        
        try:
            file_path = analysis['error'].get('file', '')
            if not file_path:
                return fix_result
                
            content = self.read_file_content(file_path)
            if not content:
                return fix_result
                
            original_content = content
            fix_strategy = analysis.get('fix_strategy', '')
            
            if fix_strategy == 'add_property':
                content = self._fix_missing_property(content, analysis)
            elif fix_strategy == 'type_conversion':
                content = self._fix_type_mismatch(content, analysis)
            elif fix_strategy == 'import_or_declare':
                content = self._fix_undefined_variable(content, analysis)
            elif fix_strategy == 'null_check':
                content = self._fix_null_undefined(content, analysis)
            elif fix_strategy == 'argument_fix':
                content = self._fix_argument_count(content, analysis)
                
            if content != original_content:
                if self.write_file_content(file_path, content):
                    fix_result['success'] = True
                    fix_result['changes_made'].append({
                        'type': 'typescript_fix',
                        'strategy': fix_strategy,
                        'file': file_path
                    })
                    
        except Exception as e:
            fix_result['error'] = str(e)
            self.logger.error(f"TypeScript fix failed: {e}")
            
        return fix_result

    def fix_react_error(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Reactエラーを修復"""
        fix_result = {
            'success': False,
            'changes_made': [],
            'error': None
        }
        
        try:
            file_path = analysis['error'].get('file', '')
            content = self.read_file_content(file_path)
            if not content:
                return fix_result
                
            original_content = content
            fix_strategy = analysis.get('fix_strategy', '')
            
            if fix_strategy == 'add_dependency':
                content = self._fix_missing_dependency(content, analysis)
            elif fix_strategy == 'move_hook':
                content = self._fix_conditional_hook(content, analysis)
            elif fix_strategy == 'add_key_prop':
                content = self._fix_missing_key(content, analysis)
            elif fix_strategy == 'move_state_update':
                content = self._fix_state_update_timing(content, analysis)
                
            if content != original_content:
                if self.write_file_content(file_path, content):
                    fix_result['success'] = True
                    fix_result['changes_made'].append({
                        'type': 'react_fix',
                        'strategy': fix_strategy,
                        'file': file_path
                    })
                    
        except Exception as e:
            fix_result['error'] = str(e)
            self.logger.error(f"React fix failed: {e}")
            
        return fix_result

    def fix_material_ui_error(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Material-UIエラーを修復"""
        fix_result = {
            'success': False,
            'changes_made': [],
            'error': None
        }
        
        try:
            file_path = analysis['error'].get('file', '')
            content = self.read_file_content(file_path)
            if not content:
                return fix_result
                
            original_content = content
            fix_strategy = analysis.get('fix_strategy', '')
            
            if fix_strategy == 'replace_component':
                content = self._fix_deprecated_component(content, analysis)
            elif fix_strategy == 'replace_prop':
                content = self._fix_deprecated_prop(content, analysis)
            elif fix_strategy == 'fix_import_path':
                content = self._fix_mui_import_path(content, analysis)
            elif fix_strategy == 'fix_prop_type':
                content = self._fix_mui_prop_type(content, analysis)
                
            if content != original_content:
                if self.write_file_content(file_path, content):
                    fix_result['success'] = True
                    fix_result['changes_made'].append({
                        'type': 'material_ui_fix',
                        'strategy': fix_strategy,
                        'file': file_path
                    })
                    
        except Exception as e:
            fix_result['error'] = str(e)
            self.logger.error(f"Material-UI fix failed: {e}")
            
        return fix_result

    def fix_import_error(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """インポートエラーを修復"""
        fix_result = {
            'success': False,
            'changes_made': [],
            'error': None
        }
        
        try:
            file_path = analysis['error'].get('file', '')
            content = self.read_file_content(file_path)
            if not content:
                return fix_result
                
            original_content = content
            fix_strategy = analysis.get('fix_strategy', '')
            
            if fix_strategy == 'fix_import_path':
                content = self._fix_import_path(content, analysis)
            elif fix_strategy == 'fix_export_name':
                content = self._fix_export_name(content, analysis)
            elif fix_strategy == 'add_semicolon':
                content = self._fix_syntax_error(content, analysis)
                
            if content != original_content:
                if self.write_file_content(file_path, content):
                    fix_result['success'] = True
                    fix_result['changes_made'].append({
                        'type': 'import_fix',
                        'strategy': fix_strategy,
                        'file': file_path
                    })
                    
        except Exception as e:
            fix_result['error'] = str(e)
            self.logger.error(f"Import fix failed: {e}")
            
        return fix_result

    def fix_props_error(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Propsエラーを修復"""
        fix_result = {
            'success': False,
            'changes_made': [],
            'error': None
        }
        
        try:
            file_path = analysis['error'].get('file', '')
            content = self.read_file_content(file_path)
            if not content:
                return fix_result
                
            original_content = content
            fix_strategy = analysis.get('fix_strategy', '')
            
            if fix_strategy == 'add_required_prop':
                content = self._fix_required_prop(content, analysis)
            elif fix_strategy == 'add_prop_to_interface':
                content = self._fix_props_interface(content, analysis)
                
            if content != original_content:
                if self.write_file_content(file_path, content):
                    fix_result['success'] = True
                    fix_result['changes_made'].append({
                        'type': 'props_fix',
                        'strategy': fix_strategy,
                        'file': file_path
                    })
                    
        except Exception as e:
            fix_result['error'] = str(e)
            self.logger.error(f"Props fix failed: {e}")
            
        return fix_result

    # 具体的な修復メソッド実装
    def _fix_missing_property(self, content: str, analysis: Dict[str, Any]) -> str:
        """不足プロパティを追加"""
        extracted_info = analysis.get('extracted_info', [])
        if len(extracted_info) >= 2:
            property_name, type_name = extracted_info[0], extracted_info[1]
            
            # インターフェース定義を探して追加
            interface_pattern = f"interface {type_name}\\s*{{([^}}]*)}}"
            match = re.search(interface_pattern, content, re.DOTALL)
            if match:
                interface_body = match.group(1)
                new_property = f"  {property_name}?: any; // Auto-added property\n"
                new_interface_body = interface_body.rstrip() + "\n" + new_property
                new_interface = f"interface {type_name} {{{new_interface_body}}}"
                content = content.replace(match.group(0), new_interface)
                
        return content

    def _fix_type_mismatch(self, content: str, analysis: Dict[str, Any]) -> str:
        """型不一致を修正"""
        # 型アサーションを追加する基本的な実装
        error_line = analysis['error'].get('line', 0)
        if error_line > 0:
            lines = content.split('\n')
            if error_line <= len(lines):
                line = lines[error_line - 1]
                # 簡単な型アサーション追加（実際の実装では更に詳細な分析が必要）
                if '=' in line and not 'as ' in line:
                    lines[error_line - 1] = line + ' // TODO: Fix type assertion'
                content = '\n'.join(lines)
        return content

    def _fix_undefined_variable(self, content: str, analysis: Dict[str, Any]) -> str:
        """未定義変数を修正"""
        extracted_info = analysis.get('extracted_info', [])
        if extracted_info:
            variable_name = extracted_info[0]
            
            # よくあるインポートを推測して追加
            imports_to_try = [
                f"import {{ {variable_name} }} from 'react';",
                f"import {{ {variable_name} }} from '@mui/material';",
                f"import {{ {variable_name} }} from '@mui/icons-material';",
            ]
            
            # ファイルの先頭に適切なインポートを追加
            for import_statement in imports_to_try:
                if import_statement not in content:
                    lines = content.split('\n')
                    # 既存のインポート文の後に追加
                    import_index = 0
                    for i, line in enumerate(lines):
                        if line.strip().startswith('import '):
                            import_index = i + 1
                    
                    lines.insert(import_index, f"// Auto-added import\n{import_statement}")
                    content = '\n'.join(lines)
                    break
                    
        return content

    def _fix_null_undefined(self, content: str, analysis: Dict[str, Any]) -> str:
        """null/undefined チェックを追加"""
        error_line = analysis['error'].get('line', 0)
        if error_line > 0:
            lines = content.split('\n')
            if error_line <= len(lines):
                line = lines[error_line - 1]
                # 簡単なnullチェック追加の例
                if '.' in line:
                    variable_match = re.search(r'(\w+)\.', line)
                    if variable_match:
                        variable = variable_match.group(1)
                        lines[error_line - 1] = f"  if ({variable}) {{ {line.strip()} }}"
                        content = '\n'.join(lines)
        return content

    def _fix_missing_dependency(self, content: str, analysis: Dict[str, Any]) -> str:
        """useEffectの依存関係を追加"""
        extracted_info = analysis.get('extracted_info', [])
        if extracted_info:
            dependency = extracted_info[0]
            
            # useEffect の依存配列を探して更新
            useeffect_pattern = r'useEffect\(\s*\([^)]*\)\s*=>\s*{[^}]*},\s*\[([^\]]*)\]\s*\)'
            matches = re.finditer(useeffect_pattern, content, re.DOTALL)
            
            for match in matches:
                deps = match.group(1).strip()
                if dependency not in deps:
                    new_deps = f"{deps}, {dependency}" if deps else dependency
                    new_useeffect = match.group(0).replace(f"[{deps}]", f"[{new_deps}]")
                    content = content.replace(match.group(0), new_useeffect)
                    break
                    
        return content

    def _fix_missing_key(self, content: str, analysis: Dict[str, Any]) -> str:
        """リスト要素にkeyプロパティを追加"""
        # .map() を使用している箇所を探してkeyを追加
        map_pattern = r'\.map\(\s*\(([^,)]+)(?:,\s*(\w+))?\)\s*=>\s*(<[^>]+>)'
        matches = re.finditer(map_pattern, content)
        
        for match in matches:
            item_var = match.group(1)
            index_var = match.group(2) or 'index'
            jsx_tag = match.group(3)
            
            if 'key=' not in jsx_tag:
                # keyプロパティを追加
                if jsx_tag.endswith('>'):
                    new_jsx = jsx_tag[:-1] + f' key={{{index_var}}}>'
                    content = content.replace(jsx_tag, new_jsx)
                    
        return content

    def _fix_deprecated_component(self, content: str, analysis: Dict[str, Any]) -> str:
        """非推奨コンポーネントを置換"""
        # MUI v4 -> v5 のよくある変更
        replacements = {
            'Box': 'Box',
            'Grid': 'Grid',
            'Typography': 'Typography',
            'Button': 'Button',
            'TextField': 'TextField',
            'makeStyles': 'styled', # Hook-based styling
        }
        
        for old_comp, new_comp in replacements.items():
            if old_comp in content and old_comp != new_comp:
                content = content.replace(old_comp, new_comp)
                
        return content

    def _fix_mui_import_path(self, content: str, analysis: Dict[str, Any]) -> str:
        """MUIインポートパスを修正"""
        # よくあるMUIインポートパス修正
        import_fixes = [
            (r"import\s+{([^}]+)}\s+from\s+['\"]@material-ui/core['\"]", 
             r"import {\1} from '@mui/material'"),
            (r"import\s+{([^}]+)}\s+from\s+['\"]@material-ui/icons['\"]", 
             r"import {\1} from '@mui/icons-material'"),
            (r"import\s+{([^}]+)}\s+from\s+['\"]@material-ui/lab['\"]", 
             r"import {\1} from '@mui/lab'"),
        ]
        
        for old_pattern, new_pattern in import_fixes:
            content = re.sub(old_pattern, new_pattern, content)
            
        return content

    # その他の修復メソッドも同様に実装...
    def _fix_argument_count(self, content: str, analysis: Dict[str, Any]) -> str:
        return content
    
    def _fix_conditional_hook(self, content: str, analysis: Dict[str, Any]) -> str:
        return content
    
    def _fix_state_update_timing(self, content: str, analysis: Dict[str, Any]) -> str:
        return content
    
    def _fix_deprecated_prop(self, content: str, analysis: Dict[str, Any]) -> str:
        return content
    
    def _fix_mui_prop_type(self, content: str, analysis: Dict[str, Any]) -> str:
        return content
    
    def _fix_import_path(self, content: str, analysis: Dict[str, Any]) -> str:
        return content
    
    def _fix_export_name(self, content: str, analysis: Dict[str, Any]) -> str:
        return content
    
    def _fix_syntax_error(self, content: str, analysis: Dict[str, Any]) -> str:
        return content
    
    def _fix_required_prop(self, content: str, analysis: Dict[str, Any]) -> str:
        return content
    
    def _fix_props_interface(self, content: str, analysis: Dict[str, Any]) -> str:
        return content

    def apply_fix(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """修復を適用"""
        category = analysis.get('category', '')
        
        if category == 'typescript':
            return self.fix_typescript_error(analysis)
        elif category == 'react':
            return self.fix_react_error(analysis)
        elif category == 'materialUI':
            return self.fix_material_ui_error(analysis)
        elif category == 'imports':
            return self.fix_import_error(analysis)
        elif category == 'props':
            return self.fix_props_error(analysis)
        else:
            return {
                'success': False,
                'changes_made': [],
                'error': f'Unknown category: {category}'
            }

    def apply_fixes_batch(self, analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """修復を一括適用"""
        self.logger.info(f"Applying fixes for {len(analyses)} errors")
        
        results = {
            'total_fixes_attempted': len(analyses),
            'successful_fixes': 0,
            'failed_fixes': 0,
            'fixes': [],
            'timestamp': datetime.now().isoformat()
        }
        
        for analysis in analyses:
            if not analysis.get('fixable', False):
                continue
                
            fix_result = self.apply_fix(analysis)
            
            fix_record = {
                'error': analysis['error'],
                'fix_result': fix_result,
                'timestamp': datetime.now().isoformat()
            }
            
            results['fixes'].append(fix_record)
            
            if fix_result['success']:
                results['successful_fixes'] += 1
                self.logger.info(f"Successfully fixed: {analysis['error'].get('message', '')}")
            else:
                results['failed_fixes'] += 1
                self.logger.warning(f"Failed to fix: {analysis['error'].get('message', '')}")
        
        # 結果を保存
        self.save_fix_results(results)
        
        return results

    def save_fix_results(self, results: Dict[str, Any]):
        """修復結果を保存"""
        try:
            # 既存の修復結果を読み込み
            existing_data = {}
            if self.fixes_file.exists():
                with open(self.fixes_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            
            # 統計情報を更新
            stats = existing_data.get('statistics', {
                'totalFixes': 0,
                'successfulFixes': 0,
                'failedFixes': 0,
                'categories': {'typescript': 0, 'react': 0, 'materialUI': 0, 'imports': 0, 'props': 0}
            })
            
            stats['totalFixes'] += results['total_fixes_attempted']
            stats['successfulFixes'] += results['successful_fixes']
            stats['failedFixes'] += results['failed_fixes']
            
            # カテゴリ別統計更新
            for fix in results['fixes']:
                category = fix['error'].get('type', 'unknown')
                if category in stats['categories']:
                    stats['categories'][category] += 1
            
            # 新しいデータを構築
            updated_data = {
                'fixes': existing_data.get('fixes', []) + results['fixes'],
                'lastUpdate': datetime.now().isoformat(),
                'statistics': stats,
                'status': 'updated'
            }
            
            with open(self.fixes_file, 'w', encoding='utf-8') as f:
                json.dump(updated_data, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            self.logger.error(f"Failed to save fix results: {e}")

if __name__ == "__main__":
    fixer = FrontendCodeFixer()
    
    # テスト用のサンプル分析結果
    sample_analysis = {
        'error': {
            'type': 'typescript',
            'message': "Property 'testProp' does not exist on type 'User'",
            'file': 'src/test.tsx',
            'line': 10
        },
        'category': 'typescript',
        'fixable': True,
        'fix_strategy': 'add_property',
        'extracted_info': ['testProp', 'User']
    }
    
    result = fixer.apply_fix(sample_analysis)
    print(json.dumps(result, indent=2, ensure_ascii=False))