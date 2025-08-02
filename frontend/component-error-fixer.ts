/**
 * Reactコンポーネントエラー自動修復システム
 * TypeScript、useState、useEffect、イベントハンドリング等のエラーを自動検出・修復
 */

import * as fs from 'fs';
import * as path from 'path';

interface ComponentFix {
  filePath: string;
  errorType: string;
  originalContent: string;
  fixedContent: string;
  description: string;
  applied: boolean;
  timestamp: string;
}

class ComponentErrorFixer {
  private readonly sourceDir: string;
  private fixes: ComponentFix[] = [];

  constructor(sourceDir: string = './src') {
    this.sourceDir = path.resolve(sourceDir);
  }

  async scanAndFixComponents(): Promise<ComponentFix[]> {
    console.log('🔍 Reactコンポーネントのエラーをスキャン中...');
    
    const componentFiles = await this.findComponentFiles();
    
    for (const filePath of componentFiles) {
      await this.analyzeAndFixFile(filePath);
    }
    
    return this.fixes;
  }

  private async findComponentFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = (dir: string) => {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (entry.endsWith('.tsx') || entry.endsWith('.ts'))) {
          files.push(fullPath);
        }
      }
    };
    
    scanDirectory(this.sourceDir);
    return files;
  }

  private async analyzeAndFixFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let fixedContent = content;
      let hasChanges = false;

      // 1. TypeScript型エラーの修復
      const typeScriptFixes = this.fixTypeScriptErrors(fixedContent);
      if (typeScriptFixes.fixed !== fixedContent) {
        fixedContent = typeScriptFixes.fixed;
        hasChanges = true;
        this.addFix(filePath, 'typescript-error', content, fixedContent, typeScriptFixes.description);
      }

      // 2. React Hooks エラーの修復
      const hooksFixes = this.fixReactHooksErrors(fixedContent);
      if (hooksFixes.fixed !== fixedContent) {
        fixedContent = hooksFixes.fixed;
        hasChanges = true;
        this.addFix(filePath, 'react-hooks-error', content, fixedContent, hooksFixes.description);
      }

      // 3. イベントハンドリングエラーの修復
      const eventFixes = this.fixEventHandlingErrors(fixedContent);
      if (eventFixes.fixed !== fixedContent) {
        fixedContent = eventFixes.fixed;
        hasChanges = true;
        this.addFix(filePath, 'event-handling-error', content, fixedContent, eventFixes.description);
      }

      // 4. Props 型エラーの修復
      const propsFixes = this.fixPropsTypeErrors(fixedContent);
      if (propsFixes.fixed !== fixedContent) {
        fixedContent = propsFixes.fixed;
        hasChanges = true;
        this.addFix(filePath, 'props-type-error', content, fixedContent, propsFixes.description);
      }

      // 5. State 管理エラーの修復
      const stateFixes = this.fixStateManagementErrors(fixedContent);
      if (stateFixes.fixed !== fixedContent) {
        fixedContent = stateFixes.fixed;
        hasChanges = true;
        this.addFix(filePath, 'state-management-error', content, fixedContent, stateFixes.description);
      }

      // 6. アクセシビリティエラーの修復
      const a11yFixes = this.fixAccessibilityErrors(fixedContent);
      if (a11yFixes.fixed !== fixedContent) {
        fixedContent = a11yFixes.fixed;
        hasChanges = true;
        this.addFix(filePath, 'accessibility-error', content, fixedContent, a11yFixes.description);
      }

      // 修正を適用
      if (hasChanges) {
        // バックアップを作成
        const backupPath = `${filePath}.backup.${Date.now()}`;
        fs.writeFileSync(backupPath, content);
        
        // 修正されたコンテンツを書き込み
        fs.writeFileSync(filePath, fixedContent);
        
        console.log(`✅ 修正適用: ${path.relative(this.sourceDir, filePath)}`);
      }

    } catch (error) {
      console.error(`❌ ファイル解析エラー: ${filePath}`, error);
    }
  }

  private fixTypeScriptErrors(content: string): { fixed: string; description: string } {
    let fixed = content;
    const descriptions: string[] = [];

    // undefined/null チェックの追加
    fixed = fixed.replace(
      /(\w+)\.(\w+)(?!\?)/g,
      (match, obj, prop) => {
        if (obj.match(/^(props|state|data|result|response)$/)) {
          descriptions.push(`Added safe property access for ${obj}.${prop}`);
          return `${obj}?.${prop}`;
        }
        return match;
      }
    );

    // 配列アクセスの安全化
    fixed = fixed.replace(
      /(\w+)\[(\d+|'[^']*'|"[^"]*")\](?!\?)/g,
      (match, arr, index) => {
        if (arr.match(/^(items|data|list|array|results)$/)) {
          descriptions.push(`Added safe array access for ${arr}[${index}]`);
          return `${arr}?.[${index}]`;
        }
        return match;
      }
    );

    // 型アサーションの追加
    fixed = fixed.replace(
      /as any/g,
      () => {
        descriptions.push('Replaced "as any" with proper type assertion');
        return 'as unknown';
      }
    );

    // 暗黙的なany型の修正
    fixed = fixed.replace(
      /\bfunction\s+(\w+)\s*\(([^)]*)\)/g,
      (match, funcName, params) => {
        if (!params.includes(':') && params.trim()) {
          descriptions.push(`Added type annotations to function ${funcName}`);
          const typedParams = params.split(',').map((p: string) => {
            const param = p.trim();
            return param ? `${param}: any` : param;
          }).join(', ');
          return `function ${funcName}(${typedParams})`;
        }
        return match;
      }
    );

    return {
      fixed,
      description: descriptions.length > 0 ? descriptions.join('; ') : 'No TypeScript errors found'
    };
  }

  private fixReactHooksErrors(content: string): { fixed: string; description: string } {
    let fixed = content;
    const descriptions: string[] = [];

    // useEffect の依存配列の修正
    fixed = fixed.replace(
      /useEffect\s*\(\s*\(\s*\)\s*=>\s*{([^}]*)},\s*\[\]\s*\)/g,
      (match, effectBody) => {
        const dependencies = this.extractDependencies(effectBody);
        if (dependencies.length > 0) {
          descriptions.push(`Added missing dependencies to useEffect: ${dependencies.join(', ')}`);
          return `useEffect(() => {${effectBody}}, [${dependencies.join(', ')}])`;
        }
        return match;
      }
    );

    // useState の初期値型の修正
    fixed = fixed.replace(
      /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState\(\)/g,
      (match, state, setter) => {
        descriptions.push(`Added initial value to useState for ${state}`);
        return `const [${state}, ${setter}] = useState<any>(null)`;
      }
    );

    // useCallback の依存配列の修正
    fixed = fixed.replace(
      /useCallback\s*\(\s*([^,]+),\s*\[\]\s*\)/g,
      (match, callback) => {
        const dependencies = this.extractDependencies(callback);
        if (dependencies.length > 0) {
          descriptions.push(`Added missing dependencies to useCallback: ${dependencies.join(', ')}`);
          return `useCallback(${callback}, [${dependencies.join(', ')}])`;
        }
        return match;
      }
    );

    return {
      fixed,
      description: descriptions.length > 0 ? descriptions.join('; ') : 'No React Hooks errors found'
    };
  }

  private extractDependencies(code: string): string[] {
    const dependencies: string[] = [];
    const variablePattern = /\b(\w+)\b/g;
    let match;

    while ((match = variablePattern.exec(code)) !== null) {
      const variable = match[1];
      if (
        !['const', 'let', 'var', 'function', 'if', 'else', 'for', 'while', 'return', 'true', 'false', 'null', 'undefined'].includes(variable) &&
        !dependencies.includes(variable)
      ) {
        dependencies.push(variable);
      }
    }

    return dependencies;
  }

  private fixEventHandlingErrors(content: string): { fixed: string; description: string } {
    let fixed = content;
    const descriptions: string[] = [];

    // イベントハンドラーの型注釈を追加
    fixed = fixed.replace(
      /on\w+\s*=\s*{\s*\(\s*(\w+)\s*\)\s*=>/g,
      (match, param) => {
        if (!param.includes(':')) {
          descriptions.push(`Added event type annotation for ${param}`);
          return match.replace(`(${param})`, `(${param}: React.MouseEvent)`);
        }
        return match;
      }
    );

    // preventDefault の追加
    fixed = fixed.replace(
      /onClick\s*=\s*{\s*\(\s*(\w+)\s*\)\s*=>\s*{([^}]*)}/g,
      (match, param, body) => {
        if (!body.includes('preventDefault')) {
          descriptions.push('Added preventDefault to onClick handler');
          return `onClick={(${param}) => {${param}.preventDefault();${body}}`;
        }
        return match;
      }
    );

    return {
      fixed,
      description: descriptions.length > 0 ? descriptions.join('; ') : 'No event handling errors found'
    };
  }

  private fixPropsTypeErrors(content: string): { fixed: string; description: string } {
    let fixed = content;
    const descriptions: string[] = [];

    // Props インターフェースの追加
    if (fixed.includes('props') && !fixed.includes('interface') && !fixed.includes('type Props')) {
      const propsInterface = `
interface Props {
  [key: string]: any;
}

`;
      fixed = propsInterface + fixed;
      descriptions.push('Added Props interface');
    }

    // コンポーネント関数の型注釈
    fixed = fixed.replace(
      /export default function\s+(\w+)\s*\(\s*([^)]*)\s*\)/g,
      (match, componentName, params) => {
        if (params && !params.includes(':')) {
          descriptions.push(`Added type annotation to component ${componentName}`);
          return `export default function ${componentName}(${params}: Props)`;
        }
        return match;
      }
    );

    return {
      fixed,
      description: descriptions.length > 0 ? descriptions.join('; ') : 'No props type errors found'
    };
  }

  private fixStateManagementErrors(content: string): { fixed: string; description: string } {
    let fixed = content;
    const descriptions: string[] = [];

    // state の初期化チェック
    fixed = fixed.replace(
      /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState\s*\(\s*\)/g,
      (match, state, setter) => {
        descriptions.push(`Added initial state value for ${state}`);
        return `const [${state}, ${setter}] = useState(null)`;
      }
    );

    // state更新の安全化
    fixed = fixed.replace(
      /(\w+)\(\s*(\w+)\s*\+\s*1\s*\)/g,
      (match, setter, state) => {
        descriptions.push(`Made state update safe for ${state}`);
        return `${setter}(prev => prev + 1)`;
      }
    );

    return {
      fixed,
      description: descriptions.length > 0 ? descriptions.join('; ') : 'No state management errors found'
    };
  }

  private fixAccessibilityErrors(content: string): { fixed: string; description: string } {
    let fixed = content;
    const descriptions: string[] = [];

    // img要素にalt属性を追加
    fixed = fixed.replace(
      /<img\s+src={[^}]+}\s*(?!.*alt=)/g,
      (match) => {
        descriptions.push('Added alt attribute to img element');
        return match.replace('/>', ' alt="" />');
      }
    );

    // button要素にaria-labelを追加
    fixed = fixed.replace(
      /<button\s+([^>]*?)(?!.*aria-label)([^>]*?)>/g,
      (match, before, after) => {
        if (!match.includes('aria-label')) {
          descriptions.push('Added aria-label to button element');
          return `<button ${before} aria-label="Button" ${after}>`;
        }
        return match;
      }
    );

    // form要素にrole属性を追加
    fixed = fixed.replace(
      /<form(?!.*role=)/g,
      () => {
        descriptions.push('Added role attribute to form element');
        return '<form role="form"';
      }
    );

    return {
      fixed,
      description: descriptions.length > 0 ? descriptions.join('; ') : 'No accessibility errors found'
    };
  }

  private addFix(filePath: string, errorType: string, originalContent: string, fixedContent: string, description: string): void {
    this.fixes.push({
      filePath: path.relative(this.sourceDir, filePath),
      errorType,
      originalContent,
      fixedContent,
      description,
      applied: true,
      timestamp: new Date().toISOString()
    });
  }

  async generateFixReport(): Promise<void> {
    const reportPath = path.join(path.dirname(this.sourceDir), 'component-fix-report.json');
    const htmlReportPath = path.join(path.dirname(this.sourceDir), 'component-fix-report.html');

    // JSON レポート
    const report = {
      summary: {
        totalFixes: this.fixes.length,
        timestamp: new Date().toISOString(),
        sourceDirectory: this.sourceDir
      },
      fixes: this.fixes
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // HTML レポート
    const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reactコンポーネント修復レポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .fix-item { background: #fff; margin: 15px 0; padding: 20px; border-radius: 6px; border-left: 4px solid #28a745; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .error-type { background: #007acc; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .file-path { font-family: monospace; background: #f1f3f4; padding: 5px; border-radius: 3px; }
        .description { margin: 10px 0; color: #333; }
        .timestamp { color: #6c757d; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 Reactコンポーネント修復レポート</h1>
            <p>実行時刻: ${new Date().toLocaleString('ja-JP')}</p>
        </div>

        <div class="summary">
            <h3>📊 修復サマリー</h3>
            <p><strong>総修復数:</strong> ${this.fixes.length}</p>
            <p><strong>対象ディレクトリ:</strong> ${this.sourceDir}</p>
        </div>

        <div class="fixes">
            <h3>🔧 適用された修復</h3>
            ${this.fixes.map(fix => `
                <div class="fix-item">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span class="error-type">${fix.errorType}</span>
                        <span class="timestamp">${new Date(fix.timestamp).toLocaleString('ja-JP')}</span>
                    </div>
                    <div class="file-path">${fix.filePath}</div>
                    <div class="description">${fix.description}</div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
    `;

    fs.writeFileSync(htmlReportPath, htmlContent);

    console.log(`📊 修復レポートを生成しました:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
  }
}

export { ComponentErrorFixer, ComponentFix };

// スクリプトとして直接実行された場合
if (require.main === module) {
  const fixer = new ComponentErrorFixer();
  
  const runFixer = async () => {
    try {
      console.log('🚀 Reactコンポーネントエラー修復システムを開始...');
      
      const fixes = await fixer.scanAndFixComponents();
      await fixer.generateFixReport();
      
      console.log(`✅ 修復完了: ${fixes.length}個の修正を適用しました`);
      
    } catch (error) {
      console.error('❌ 修復システム実行中にエラー:', error);
      process.exit(1);
    }
  };

  runFixer();
}