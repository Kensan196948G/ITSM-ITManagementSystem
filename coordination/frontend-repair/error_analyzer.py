#!/usr/bin/env python3
"""
フロントエンドエラー分析システム
TypeScript, React, Material-UIエラーの詳細分析と解決策提案
"""

import re
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

class FrontendErrorAnalyzer:
    def __init__(self, 
                 frontend_path: str = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/frontend",
                 coordination_path: str = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination"):
        self.frontend_path = Path(frontend_path)
        self.coordination_path = Path(coordination_path)
        self.setup_logging()
        
        # 修復パターン定義
        self.fix_patterns = {
            'typescript': {
                # 型エラー修復パターン
                'missing_property': {
                    'pattern': r"Property '([^']+)' does not exist on type '([^']+)'",
                    'fix_type': 'add_property',
                    'description': 'Missing property on type'
                },
                'type_mismatch': {
                    'pattern': r"Type '([^']+)' is not assignable to type '([^']+)'",
                    'fix_type': 'type_conversion',
                    'description': 'Type assignment mismatch'
                },
                'undefined_variable': {
                    'pattern': r"Cannot find name '([^']+)'",
                    'fix_type': 'import_or_declare',
                    'description': 'Undefined variable or missing import'
                },
                'null_undefined': {
                    'pattern': r"Object is possibly '(null|undefined)'",
                    'fix_type': 'null_check',
                    'description': 'Null/undefined safety check needed'
                },
                'argument_count': {
                    'pattern': r"Expected (\d+) arguments, but got (\d+)",
                    'fix_type': 'argument_fix',
                    'description': 'Function argument count mismatch'
                }
            },
            'react': {
                # React Hooks エラー
                'missing_dependency': {
                    'pattern': r"React Hook .* has a missing dependency: '([^']+)'",
                    'fix_type': 'add_dependency',
                    'description': 'Missing dependency in React Hook'
                },
                'conditional_hook': {
                    'pattern': r"React Hook .* cannot be called conditionally",
                    'fix_type': 'move_hook',
                    'description': 'Hook called conditionally'
                },
                'missing_key': {
                    'pattern': r'Each child in a list should have a unique "key" prop',
                    'fix_type': 'add_key_prop',
                    'description': 'Missing key prop in list items'
                },
                'component_update': {
                    'pattern': r"Warning: Cannot update a component .* while rendering a different component",
                    'fix_type': 'move_state_update',
                    'description': 'State update during render'
                }
            },
            'materialUI': {
                # Material-UI API変更対応
                'deprecated_component': {
                    'pattern': r"MUI: .* component is deprecated.*use (.*) instead",
                    'fix_type': 'replace_component',
                    'description': 'Deprecated MUI component'
                },
                'deprecated_prop': {
                    'pattern': r"MUI: .* prop is deprecated.*use (.*) instead",
                    'fix_type': 'replace_prop',
                    'description': 'Deprecated MUI prop'
                },
                'import_path': {
                    'pattern': r"Module not found: Error: Can't resolve '@mui/(.*)'",
                    'fix_type': 'fix_import_path',
                    'description': 'Incorrect MUI import path'
                },
                'failed_prop_type': {
                    'pattern': r"Warning: Failed prop type: Invalid prop (.*) supplied to",
                    'fix_type': 'fix_prop_type',
                    'description': 'Invalid prop type for MUI component'
                }
            },
            'imports': {
                # インポート/エクスポートエラー
                'module_not_found': {
                    'pattern': r"Module not found: Error: Can't resolve '([^']+)'",
                    'fix_type': 'fix_import_path',
                    'description': 'Module resolution error'
                },
                'missing_export': {
                    'pattern': r"The requested module '([^']+)' does not provide an export named '([^']+)'",
                    'fix_type': 'fix_export_name',
                    'description': 'Named export not found'
                },
                'syntax_error': {
                    'pattern': r"';' expected",
                    'fix_type': 'add_semicolon',
                    'description': 'Missing semicolon'
                }
            },
            'props': {
                # Props 型エラー
                'required_prop': {
                    'pattern': r"Warning: Failed prop type: Required prop (.*) was not specified",
                    'fix_type': 'add_required_prop',
                    'description': 'Missing required prop'
                },
                'prop_type_mismatch': {
                    'pattern': r"Property '([^']+)' is missing in type '([^']+)' but required in type '([^']+)'",
                    'fix_type': 'add_prop_to_interface',
                    'description': 'Props interface missing property'
                }
            }
        }

    def setup_logging(self):
        """ログ設定"""
        log_file = self.coordination_path / "frontend-repair" / "analyzer.log"
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

    def analyze_error(self, error: Dict[str, Any]) -> Dict[str, Any]:
        """個別エラーを分析"""
        error_type = error.get('type', 'unknown')
        error_message = error.get('message', '')
        file_path = error.get('file', '')
        
        analysis = {
            'error': error,
            'category': error_type,
            'severity': error.get('severity', 'warning'),
            'fixable': False,
            'fix_strategy': None,
            'confidence': 0.0,
            'suggested_fixes': [],
            'affected_files': [file_path] if file_path else []
        }
        
        # エラーパターンをマッチング
        if error_type in self.fix_patterns:
            for pattern_name, pattern_info in self.fix_patterns[error_type].items():
                pattern = pattern_info['pattern']
                match = re.search(pattern, error_message)
                
                if match:
                    analysis.update({
                        'fixable': True,
                        'fix_strategy': pattern_info['fix_type'],
                        'confidence': 0.8,
                        'pattern_matched': pattern_name,
                        'extracted_info': match.groups()
                    })
                    
                    # 修復提案を生成
                    fix_suggestion = self.generate_fix_suggestion(
                        error_type, pattern_name, match.groups(), file_path, error_message
                    )
                    analysis['suggested_fixes'].append(fix_suggestion)
                    break
        
        return analysis

    def generate_fix_suggestion(self, 
                              error_type: str, 
                              pattern_name: str, 
                              match_groups: Tuple, 
                              file_path: str, 
                              error_message: str) -> Dict[str, Any]:
        """修復提案を生成"""
        suggestion = {
            'fix_type': self.fix_patterns[error_type][pattern_name]['fix_type'],
            'description': self.fix_patterns[error_type][pattern_name]['description'],
            'file_path': file_path,
            'changes': []
        }
        
        # エラータイプ別の修復提案
        if error_type == 'typescript':
            suggestion = self._generate_typescript_fix(pattern_name, match_groups, file_path, suggestion)
        elif error_type == 'react':
            suggestion = self._generate_react_fix(pattern_name, match_groups, file_path, suggestion)
        elif error_type == 'materialUI':
            suggestion = self._generate_mui_fix(pattern_name, match_groups, file_path, suggestion)
        elif error_type == 'imports':
            suggestion = self._generate_import_fix(pattern_name, match_groups, file_path, suggestion)
        elif error_type == 'props':
            suggestion = self._generate_props_fix(pattern_name, match_groups, file_path, suggestion)
            
        return suggestion

    def _generate_typescript_fix(self, pattern_name: str, match_groups: Tuple, 
                               file_path: str, suggestion: Dict[str, Any]) -> Dict[str, Any]:
        """TypeScript修復提案"""
        if pattern_name == 'missing_property':
            property_name, type_name = match_groups
            suggestion['changes'].append({
                'type': 'add_interface_property',
                'property': property_name,
                'interface': type_name,
                'code': f"{property_name}: any; // TODO: Define proper type"
            })
        
        elif pattern_name == 'type_mismatch':
            from_type, to_type = match_groups
            suggestion['changes'].append({
                'type': 'type_assertion',
                'from_type': from_type,
                'to_type': to_type,
                'code': f"as {to_type}"
            })
        
        elif pattern_name == 'undefined_variable':
            variable_name = match_groups[0]
            suggestion['changes'].append({
                'type': 'add_import_or_declare',
                'variable': variable_name,
                'code': f"// Add import: import {{ {variable_name} }} from '...'"
            })
        
        elif pattern_name == 'null_undefined':
            null_type = match_groups[0]
            suggestion['changes'].append({
                'type': 'add_null_check',
                'check_type': null_type,
                'code': f"if (variable !== {null_type}) {{ /* safe code */ }}"
            })
            
        return suggestion

    def _generate_react_fix(self, pattern_name: str, match_groups: Tuple, 
                          file_path: str, suggestion: Dict[str, Any]) -> Dict[str, Any]:
        """React修復提案"""
        if pattern_name == 'missing_dependency':
            dependency = match_groups[0]
            suggestion['changes'].append({
                'type': 'add_hook_dependency',
                'dependency': dependency,
                'code': f"// Add to dependency array: [{dependency}]"
            })
        
        elif pattern_name == 'conditional_hook':
            suggestion['changes'].append({
                'type': 'move_hook_to_top',
                'code': "// Move hook call to component top level"
            })
        
        elif pattern_name == 'missing_key':
            suggestion['changes'].append({
                'type': 'add_key_prop',
                'code': "key={index} // or unique identifier"
            })
            
        return suggestion

    def _generate_mui_fix(self, pattern_name: str, match_groups: Tuple, 
                         file_path: str, suggestion: Dict[str, Any]) -> Dict[str, Any]:
        """Material-UI修復提案"""
        if pattern_name == 'deprecated_component':
            new_component = match_groups[0]
            suggestion['changes'].append({
                'type': 'replace_component',
                'new_component': new_component,
                'code': f"// Replace with: {new_component}"
            })
        
        elif pattern_name == 'import_path':
            module_name = match_groups[0]
            suggestion['changes'].append({
                'type': 'fix_import',
                'module': module_name,
                'code': f"import {{ ... }} from '@mui/{module_name}'"
            })
            
        return suggestion

    def _generate_import_fix(self, pattern_name: str, match_groups: Tuple, 
                           file_path: str, suggestion: Dict[str, Any]) -> Dict[str, Any]:
        """インポート修復提案"""
        if pattern_name == 'module_not_found':
            module_name = match_groups[0]
            suggestion['changes'].append({
                'type': 'fix_import_path',
                'module': module_name,
                'code': f"// Check import path: {module_name}"
            })
            
        return suggestion

    def _generate_props_fix(self, pattern_name: str, match_groups: Tuple, 
                          file_path: str, suggestion: Dict[str, Any]) -> Dict[str, Any]:
        """Props修復提案"""
        if pattern_name == 'required_prop':
            prop_name = match_groups[0]
            suggestion['changes'].append({
                'type': 'add_required_prop',
                'prop': prop_name,
                'code': f"{prop_name}={{/* provide value */}}"
            })
            
        return suggestion

    def analyze_errors_batch(self, errors: List[Dict[str, Any]]) -> Dict[str, Any]:
        """エラーバッチ分析"""
        self.logger.info(f"Analyzing {len(errors)} errors")
        
        analyses = []
        fixable_count = 0
        categories = {'typescript': 0, 'react': 0, 'materialUI': 0, 'imports': 0, 'props': 0}
        
        for error in errors:
            analysis = self.analyze_error(error)
            analyses.append(analysis)
            
            if analysis['fixable']:
                fixable_count += 1
                
            category = analysis['category']
            if category in categories:
                categories[category] += 1
        
        # 修復可能性評価
        fixability_score = fixable_count / len(errors) if errors else 0
        
        result = {
            'analyses': analyses,
            'summary': {
                'total_errors': len(errors),
                'fixable_errors': fixable_count,
                'fixability_score': fixability_score,
                'categories': categories
            },
            'recommendations': self._generate_recommendations(analyses),
            'timestamp': datetime.now().isoformat()
        }
        
        self.logger.info(f"Analysis completed. {fixable_count}/{len(errors)} errors fixable")
        return result

    def _generate_recommendations(self, analyses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """修復推奨事項を生成"""
        recommendations = []
        
        # 修復可能なエラーを優先度順にソート
        fixable_analyses = [a for a in analyses if a['fixable']]
        fixable_analyses.sort(key=lambda x: (
            x['severity'] == 'error' and 1 or 0,  # エラーを優先
            x['confidence']  # 確信度が高いものを優先
        ), reverse=True)
        
        for analysis in fixable_analyses[:10]:  # 上位10件
            recommendations.append({
                'priority': 'high' if analysis['severity'] == 'error' else 'medium',
                'file': analysis['error'].get('file', ''),
                'error_message': analysis['error'].get('message', ''),
                'fix_strategy': analysis['fix_strategy'],
                'confidence': analysis['confidence'],
                'suggested_fixes': analysis['suggested_fixes']
            })
        
        return recommendations

if __name__ == "__main__":
    analyzer = FrontendErrorAnalyzer()
    
    # テスト用のサンプルエラー分析
    sample_errors = [
        {
            'type': 'typescript',
            'message': "Property 'nonExistentProp' does not exist on type 'User'",
            'file': 'src/components/UserProfile.tsx',
            'line': 45,
            'severity': 'error'
        }
    ]
    
    result = analyzer.analyze_errors_batch(sample_errors)
    print(json.dumps(result, indent=2, ensure_ascii=False))