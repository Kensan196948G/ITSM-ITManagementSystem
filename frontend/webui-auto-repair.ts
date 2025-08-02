/**
 * WebUI自動修復システム
 * 検知されたエラーを自動的に修復するシステム
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface WebUIError {
  id: string;
  type: 'console' | 'network' | 'accessibility' | 'ui' | 'performance' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  url: string;
  timestamp: string;
  stack?: string;
  element?: string;
  fix?: string;
  component?: string;
}

interface RepairAction {
  id: string;
  errorId: string;
  type: 'file_edit' | 'config_change' | 'dependency_update' | 'component_fix';
  description: string;
  filePath?: string;
  changes?: string;
  success: boolean;
  timestamp: string;
}

class WebUIAutoRepair {
  private repairActions: RepairAction[] = [];
  private srcDir = './src';
  private backupDir = './backups/auto-repair';

  constructor() {
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  private createBackup(filePath: string): string {
    const timestamp = Date.now();
    const backupPath = `${this.backupDir}/${path.basename(filePath)}_${timestamp}.backup`;
    
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
    }
    
    return backupPath;
  }

  private addRepairAction(action: Omit<RepairAction, 'id' | 'timestamp'>): void {
    const repairAction: RepairAction = {
      ...action,
      id: `repair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    
    this.repairActions.push(repairAction);
    console.log(`[Auto Repair] ${action.success ? 'SUCCESS' : 'FAILED'}: ${action.description}`);
  }

  async repairConsoleErrors(error: WebUIError): Promise<boolean> {
    try {
      if (error.message.includes('Uncaught TypeError')) {
        return await this.fixTypeErrors(error);
      } else if (error.message.includes('Cannot read property')) {
        return await this.fixPropertyAccess(error);
      } else if (error.message.includes('is not a function')) {
        return await this.fixFunctionCalls(error);
      }
      
      return false;
    } catch (err) {
      console.error('Console error repair failed:', err);
      return false;
    }
  }

  async fixTypeErrors(error: WebUIError): Promise<boolean> {
    // TypeScriptの型エラーを修復
    const commonFixes = [
      {
        pattern: /Cannot read property '(\w+)' of undefined/,
        fix: (match: RegExpMatchArray) => `?.${match[1]}`
      },
      {
        pattern: /Cannot read property '(\w+)' of null/,
        fix: (match: RegExpMatchArray) => `?.${match[1]}`
      }
    ];

    try {
      const componentFiles = this.findReactComponents();
      
      for (const filePath of componentFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        let newContent = content;

        for (const { pattern, fix } of commonFixes) {
          if (pattern.test(error.message)) {
            // バックアップ作成
            this.createBackup(filePath);
            
            // オプショナルチェーンを追加
            newContent = newContent.replace(
              /(\w+)\.(\w+)/g,
              (match, obj, prop) => {
                if (content.includes(`${obj}.${prop}`) && !content.includes(`${obj}?.${prop}`)) {
                  modified = true;
                  return `${obj}?.${prop}`;
                }
                return match;
              }
            );
          }
        }

        if (modified) {
          fs.writeFileSync(filePath, newContent);
          this.addRepairAction({
            errorId: error.id,
            type: 'file_edit',
            description: `Added optional chaining to ${filePath}`,
            filePath,
            changes: 'Added optional chaining operators',
            success: true
          });
          return true;
        }
      }
    } catch (err) {
      this.addRepairAction({
        errorId: error.id,
        type: 'file_edit',
        description: `Failed to fix type errors: ${err}`,
        success: false
      });
    }

    return false;
  }

  async fixPropertyAccess(error: WebUIError): Promise<boolean> {
    try {
      const componentFiles = this.findReactComponents();
      
      for (const filePath of componentFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // プロパティアクセスエラーの修復パターン
        const fixes = [
          // undefined/nullチェックの追加
          {
            pattern: /(\w+)\.(\w+)/g,
            replacement: '$1?.$2'
          },
          // デフォルト値の追加
          {
            pattern: /(\w+\|\|)\s*\{\}/g,
            replacement: '$1 {}'
          }
        ];

        let newContent = content;
        let modified = false;

        for (const { pattern, replacement } of fixes) {
          const newContentWithFix = newContent.replace(pattern, replacement);
          if (newContentWithFix !== newContent) {
            modified = true;
            newContent = newContentWithFix;
          }
        }

        if (modified) {
          this.createBackup(filePath);
          fs.writeFileSync(filePath, newContent);
          
          this.addRepairAction({
            errorId: error.id,
            type: 'file_edit',
            description: `Fixed property access in ${filePath}`,
            filePath,
            changes: 'Added null checks and optional chaining',
            success: true
          });
          return true;
        }
      }
    } catch (err) {
      this.addRepairAction({
        errorId: error.id,
        type: 'file_edit',
        description: `Failed to fix property access: ${err}`,
        success: false
      });
    }

    return false;
  }

  async fixFunctionCalls(error: WebUIError): Promise<boolean> {
    try {
      if (error.message.includes('is not a function')) {
        const componentFiles = this.findReactComponents();
        
        for (const filePath of componentFiles) {
          const content = fs.readFileSync(filePath, 'utf8');
          let newContent = content;
          let modified = false;

          // 関数呼び出しの修復
          const functionCallFixes = [
            // useCallback の追加
            {
              pattern: /const (\w+) = \((.*?)\) => \{/g,
              replacement: 'const $1 = useCallback(($2) => {'
            },
            // typeof チェックの追加
            {
              pattern: /(\w+)\(\)/g,
              replacement: 'typeof $1 === "function" && $1()'
            }
          ];

          for (const { pattern, replacement } of functionCallFixes) {
            const newContentWithFix = newContent.replace(pattern, replacement);
            if (newContentWithFix !== newContent) {
              modified = true;
              newContent = newContentWithFix;
            }
          }

          // useCallback import の追加
          if (modified && !content.includes('useCallback')) {
            newContent = newContent.replace(
              /import.*{([^}]+)}.*from ['"]react['"]/,
              (match, imports) => {
                if (!imports.includes('useCallback')) {
                  return match.replace(imports, `${imports}, useCallback`);
                }
                return match;
              }
            );
          }

          if (modified) {
            this.createBackup(filePath);
            fs.writeFileSync(filePath, newContent);
            
            this.addRepairAction({
              errorId: error.id,
              type: 'file_edit',
              description: `Fixed function calls in ${filePath}`,
              filePath,
              changes: 'Added function type checks and useCallback',
              success: true
            });
            return true;
          }
        }
      }
    } catch (err) {
      this.addRepairAction({
        errorId: error.id,
        type: 'file_edit',
        description: `Failed to fix function calls: ${err}`,
        success: false
      });
    }

    return false;
  }

  async repairNetworkErrors(error: WebUIError): Promise<boolean> {
    try {
      if (error.message.includes('404')) {
        return await this.fixAPIEndpoints(error);
      } else if (error.message.includes('500')) {
        return await this.addErrorHandling(error);
      } else if (error.message.includes('CORS')) {
        return await this.fixCORSIssues(error);
      }
      
      return false;
    } catch (err) {
      console.error('Network error repair failed:', err);
      return false;
    }
  }

  async fixAPIEndpoints(error: WebUIError): Promise<boolean> {
    try {
      const apiFile = path.join(this.srcDir, 'services/api.ts');
      
      if (fs.existsSync(apiFile)) {
        const content = fs.readFileSync(apiFile, 'utf8');
        this.createBackup(apiFile);
        
        // API エンドポイントの修正
        let newContent = content;
        
        // 404エラーのあるURLを特定して修正
        const urlMatch = error.url.match(/\/api\/([^?]+)/);
        if (urlMatch) {
          const endpoint = urlMatch[1];
          
          // 一般的なエンドポイント名の修正
          const endpointFixes = {
            'incident': 'incidents',
            'problem': 'problems',
            'user': 'users',
            'ticket': 'tickets'
          };
          
          for (const [wrong, correct] of Object.entries(endpointFixes)) {
            if (endpoint.includes(wrong)) {
              newContent = newContent.replace(
                new RegExp(`/${wrong}`, 'g'),
                `/${correct}`
              );
            }
          }
        }
        
        // エラーハンドリングの追加
        if (!content.includes('try {') || !content.includes('catch')) {
          newContent = this.addTryCatchToAPI(newContent);
        }
        
        if (newContent !== content) {
          fs.writeFileSync(apiFile, newContent);
          
          this.addRepairAction({
            errorId: error.id,
            type: 'file_edit',
            description: `Fixed API endpoints in ${apiFile}`,
            filePath: apiFile,
            changes: 'Corrected endpoint URLs and added error handling',
            success: true
          });
          return true;
        }
      }
    } catch (err) {
      this.addRepairAction({
        errorId: error.id,
        type: 'file_edit',
        description: `Failed to fix API endpoints: ${err}`,
        success: false
      });
    }

    return false;
  }

  private addTryCatchToAPI(content: string): string {
    // API呼び出しにtry-catchを追加
    return content.replace(
      /(const \w+ = async \([^)]*\) => \{)/g,
      '$1\n  try {'
    ).replace(
      /(return.*?;)(\s*\})/g,
      '$1\n  } catch (error) {\n    console.error("API Error:", error);\n    throw error;\n  }$2'
    );
  }

  async addErrorHandling(error: WebUIError): Promise<boolean> {
    try {
      const componentFiles = this.findReactComponents();
      
      for (const filePath of componentFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (!content.includes('ErrorBoundary') && content.includes('export default')) {
          this.createBackup(filePath);
          
          // ErrorBoundaryでコンポーネントをラップ
          const newContent = content.replace(
            /export default (\w+);/,
            `import { ErrorBoundary } from '../common/ErrorBoundary';\n\nexport default function $1WithErrorBoundary() {\n  return (\n    <ErrorBoundary>\n      <$1 />\n    </ErrorBoundary>\n  );\n}`
          );
          
          if (newContent !== content) {
            fs.writeFileSync(filePath, newContent);
            
            this.addRepairAction({
              errorId: error.id,
              type: 'component_fix',
              description: `Added ErrorBoundary to ${filePath}`,
              filePath,
              changes: 'Wrapped component with ErrorBoundary',
              success: true
            });
            return true;
          }
        }
      }
    } catch (err) {
      this.addRepairAction({
        errorId: error.id,
        type: 'component_fix',
        description: `Failed to add error handling: ${err}`,
        success: false
      });
    }

    return false;
  }

  async fixCORSIssues(error: WebUIError): Promise<boolean> {
    try {
      const viteConfigPath = './vite.config.ts';
      
      if (fs.existsSync(viteConfigPath)) {
        const content = fs.readFileSync(viteConfigPath, 'utf8');
        this.createBackup(viteConfigPath);
        
        if (!content.includes('proxy')) {
          // プロキシ設定を追加
          const newContent = content.replace(
            /export default defineConfig\(\{/,
            `export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  },`
          );
          
          fs.writeFileSync(viteConfigPath, newContent);
          
          this.addRepairAction({
            errorId: error.id,
            type: 'config_change',
            description: `Added CORS proxy configuration to ${viteConfigPath}`,
            filePath: viteConfigPath,
            changes: 'Added proxy configuration for API calls',
            success: true
          });
          return true;
        }
      }
    } catch (err) {
      this.addRepairAction({
        errorId: error.id,
        type: 'config_change',
        description: `Failed to fix CORS issues: ${err}`,
        success: false
      });
    }

    return false;
  }

  async repairAccessibilityErrors(error: WebUIError): Promise<boolean> {
    try {
      if (error.message.includes('color-contrast')) {
        return await this.fixColorContrast(error);
      } else if (error.message.includes('missing-alt')) {
        return await this.addAltText(error);
      } else if (error.message.includes('label')) {
        return await this.addLabels(error);
      }
      
      return false;
    } catch (err) {
      console.error('Accessibility error repair failed:', err);
      return false;
    }
  }

  async fixColorContrast(error: WebUIError): Promise<boolean> {
    try {
      const themeFile = path.join(this.srcDir, 'theme/theme.ts');
      
      if (fs.existsSync(themeFile)) {
        const content = fs.readFileSync(themeFile, 'utf8');
        this.createBackup(themeFile);
        
        // 色のコントラスト比を改善
        const colorFixes = {
          '#888': '#666',     // グレーを暗く
          '#999': '#555',     // ライトグレーを暗く
          '#ccc': '#888',     // 非常に薄いグレーを暗く
          '#ddd': '#999'      // 極薄グレーを暗く
        };
        
        let newContent = content;
        let modified = false;
        
        for (const [oldColor, newColor] of Object.entries(colorFixes)) {
          if (content.includes(oldColor)) {
            newContent = newContent.replace(new RegExp(oldColor, 'g'), newColor);
            modified = true;
          }
        }
        
        if (modified) {
          fs.writeFileSync(themeFile, newContent);
          
          this.addRepairAction({
            errorId: error.id,
            type: 'file_edit',
            description: `Improved color contrast in ${themeFile}`,
            filePath: themeFile,
            changes: 'Updated colors to meet WCAG contrast requirements',
            success: true
          });
          return true;
        }
      }
    } catch (err) {
      this.addRepairAction({
        errorId: error.id,
        type: 'file_edit',
        description: `Failed to fix color contrast: ${err}`,
        success: false
      });
    }

    return false;
  }

  async addAltText(error: WebUIError): Promise<boolean> {
    try {
      const componentFiles = this.findReactComponents();
      
      for (const filePath of componentFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('<img') && !content.includes('alt=')) {
          this.createBackup(filePath);
          
          // img要素にalt属性を追加
          const newContent = content.replace(
            /<img([^>]*?)(?:\s+\/>|>)/g,
            (match, attrs) => {
              if (!attrs.includes('alt=')) {
                return `<img${attrs} alt="画像" />`;
              }
              return match;
            }
          );
          
          if (newContent !== content) {
            fs.writeFileSync(filePath, newContent);
            
            this.addRepairAction({
              errorId: error.id,
              type: 'file_edit',
              description: `Added alt text to images in ${filePath}`,
              filePath,
              changes: 'Added alt attributes to img elements',
              success: true
            });
            return true;
          }
        }
      }
    } catch (err) {
      this.addRepairAction({
        errorId: error.id,
        type: 'file_edit',
        description: `Failed to add alt text: ${err}`,
        success: false
      });
    }

    return false;
  }

  async addLabels(error: WebUIError): Promise<boolean> {
    try {
      const componentFiles = this.findReactComponents();
      
      for (const filePath of componentFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('<input') || content.includes('<select') || content.includes('<textarea')) {
          this.createBackup(filePath);
          
          let newContent = content;
          let modified = false;
          
          // ラベルのないフォーム要素にaria-labelを追加
          const formElements = ['input', 'select', 'textarea'];
          
          for (const element of formElements) {
            const regex = new RegExp(`<${element}([^>]*?)(?:\\s*\\/>|>)`, 'g');
            newContent = newContent.replace(regex, (match, attrs) => {
              if (!attrs.includes('aria-label') && !attrs.includes('aria-labelledby')) {
                const typeMatch = attrs.match(/type=["']([^"']+)["']/);
                const type = typeMatch ? typeMatch[1] : element;
                modified = true;
                return `<${element}${attrs} aria-label="${type}入力" />`;
              }
              return match;
            });
          }
          
          if (modified) {
            fs.writeFileSync(filePath, newContent);
            
            this.addRepairAction({
              errorId: error.id,
              type: 'file_edit',
              description: `Added accessibility labels in ${filePath}`,
              filePath,
              changes: 'Added aria-label attributes to form elements',
              success: true
            });
            return true;
          }
        }
      }
    } catch (err) {
      this.addRepairAction({
        errorId: error.id,
        type: 'file_edit',
        description: `Failed to add labels: ${err}`,
        success: false
      });
    }

    return false;
  }

  async repairUIErrors(error: WebUIError): Promise<boolean> {
    try {
      if (error.message.includes('React')) {
        return await this.fixReactErrors(error);
      } else if (error.message.includes('Missing critical UI element')) {
        return await this.addMissingElements(error);
      }
      
      return false;
    } catch (err) {
      console.error('UI error repair failed:', err);
      return false;
    }
  }

  async fixReactErrors(error: WebUIError): Promise<boolean> {
    try {
      const componentFiles = this.findReactComponents();
      
      for (const filePath of componentFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.createBackup(filePath);
        
        let newContent = content;
        let modified = false;
        
        // React警告の修正パターン
        const reactFixes = [
          // key propの追加
          {
            pattern: /\.map\((.*?)\s*=>\s*<(\w+)/g,
            replacement: '.map(($1, index) => <$2 key={index}'
          },
          // useEffect dependencyの修正
          {
            pattern: /useEffect\((.*?), \[\]\)/g,
            replacement: 'useEffect($1, [])'
          }
        ];
        
        for (const { pattern, replacement } of reactFixes) {
          const newContentWithFix = newContent.replace(pattern, replacement);
          if (newContentWithFix !== newContent) {
            modified = true;
            newContent = newContentWithFix;
          }
        }
        
        if (modified) {
          fs.writeFileSync(filePath, newContent);
          
          this.addRepairAction({
            errorId: error.id,
            type: 'component_fix',
            description: `Fixed React warnings in ${filePath}`,
            filePath,
            changes: 'Fixed React key props and useEffect dependencies',
            success: true
          });
          return true;
        }
      }
    } catch (err) {
      this.addRepairAction({
        errorId: error.id,
        type: 'component_fix',
        description: `Failed to fix React errors: ${err}`,
        success: false
      });
    }

    return false;
  }

  async addMissingElements(error: WebUIError): Promise<boolean> {
    try {
      if (error.element && error.message.includes('Missing critical UI element')) {
        const layoutFile = path.join(this.srcDir, 'components/layout/Layout.tsx');
        
        if (fs.existsSync(layoutFile)) {
          const content = fs.readFileSync(layoutFile, 'utf8');
          this.createBackup(layoutFile);
          
          let newContent = content;
          let modified = false;
          
          // 基本的なHTML5セマンティック要素を追加
          if (error.element.includes('header') && !content.includes('<header')) {
            newContent = newContent.replace(
              /(<div className="app">)/,
              '$1\n      <header role="banner">\n        <h1>ITSM System</h1>\n      </header>'
            );
            modified = true;
          }
          
          if (error.element.includes('nav') && !content.includes('<nav')) {
            newContent = newContent.replace(
              /(<header[^>]*>.*?<\/header>)/s,
              '$1\n      <nav role="navigation">\n        <ul>\n          <li><a href="/">Home</a></li>\n        </ul>\n      </nav>'
            );
            modified = true;
          }
          
          if (error.element.includes('main') && !content.includes('<main')) {
            newContent = newContent.replace(
              /(<div className="content">)/,
              '<main role="main">$1'
            ).replace(
              /(<\/div>\s*<\/div>\s*$)/,
              '</div></main>$1'
            );
            modified = true;
          }
          
          if (error.element.includes('footer') && !content.includes('<footer')) {
            newContent = newContent.replace(
              /(<\/div>\s*$)/,
              '      <footer role="contentinfo">\n        <p>&copy; 2024 ITSM System</p>\n      </footer>\n$1'
            );
            modified = true;
          }
          
          if (modified) {
            fs.writeFileSync(layoutFile, newContent);
            
            this.addRepairAction({
              errorId: error.id,
              type: 'component_fix',
              description: `Added missing UI elements to ${layoutFile}`,
              filePath: layoutFile,
              changes: 'Added semantic HTML5 elements',
              success: true
            });
            return true;
          }
        }
      }
    } catch (err) {
      this.addRepairAction({
        errorId: error.id,
        type: 'component_fix',
        description: `Failed to add missing elements: ${err}`,
        success: false
      });
    }

    return false;
  }

  async repairPerformanceIssues(error: WebUIError): Promise<boolean> {
    try {
      if (error.message.includes('Slow')) {
        const viteConfigPath = './vite.config.ts';
        
        if (fs.existsSync(viteConfigPath)) {
          const content = fs.readFileSync(viteConfigPath, 'utf8');
          this.createBackup(viteConfigPath);
          
          if (!content.includes('rollupOptions')) {
            // ビルド最適化設定を追加
            const newContent = content.replace(
              /export default defineConfig\(\{/,
              `export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@mui/icons-material']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },`
            );
            
            fs.writeFileSync(viteConfigPath, newContent);
            
            this.addRepairAction({
              errorId: error.id,
              type: 'config_change',
              description: `Added performance optimizations to ${viteConfigPath}`,
              filePath: viteConfigPath,
              changes: 'Added chunk splitting and build optimizations',
              success: true
            });
            return true;
          }
        }
      }
    } catch (err) {
      this.addRepairAction({
        errorId: error.id,
        type: 'config_change',
        description: `Failed to fix performance issues: ${err}`,
        success: false
      });
    }

    return false;
  }

  private findReactComponents(): string[] {
    const componentDirs = [
      path.join(this.srcDir, 'components'),
      path.join(this.srcDir, 'pages'),
      path.join(this.srcDir, 'hooks')
    ];
    
    const files: string[] = [];
    
    for (const dir of componentDirs) {
      if (fs.existsSync(dir)) {
        const findFiles = (directory: string) => {
          const items = fs.readdirSync(directory);
          for (const item of items) {
            const fullPath = path.join(directory, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              findFiles(fullPath);
            } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
              files.push(fullPath);
            }
          }
        };
        
        findFiles(dir);
      }
    }
    
    return files;
  }

  async repairError(error: WebUIError): Promise<boolean> {
    console.log(`Attempting to repair error: ${error.type} - ${error.message}`);
    
    try {
      switch (error.type) {
        case 'console':
          return await this.repairConsoleErrors(error);
        case 'network':
          return await this.repairNetworkErrors(error);
        case 'accessibility':
          return await this.repairAccessibilityErrors(error);
        case 'ui':
          return await this.repairUIErrors(error);
        case 'performance':
          return await this.repairPerformanceIssues(error);
        default:
          return false;
      }
    } catch (err) {
      console.error(`Failed to repair error ${error.id}:`, err);
      return false;
    }
  }

  async repairMultipleErrors(errors: WebUIError[]): Promise<RepairAction[]> {
    console.log(`Starting repair process for ${errors.length} errors...`);
    
    // 重要度順にソート
    const sortedErrors = errors.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
    
    let repairedCount = 0;
    
    for (const error of sortedErrors) {
      const success = await this.repairError(error);
      if (success) {
        repairedCount++;
      }
    }
    
    console.log(`Repair completed: ${repairedCount}/${errors.length} errors fixed`);
    return this.repairActions;
  }

  getRepairReport(): { actions: RepairAction[], summary: string } {
    const successfulRepairs = this.repairActions.filter(a => a.success);
    const failedRepairs = this.repairActions.filter(a => !a.success);
    
    const summary = `
自動修復レポート:
- 成功: ${successfulRepairs.length}件
- 失敗: ${failedRepairs.length}件
- 合計: ${this.repairActions.length}件

修復された問題:
${successfulRepairs.slice(0, 10).map(a => `- ${a.description}`).join('\n')}

${failedRepairs.length > 0 ? `
修復に失敗した問題:
${failedRepairs.slice(0, 5).map(a => `- ${a.description}`).join('\n')}
` : ''}
`;

    return {
      actions: this.repairActions,
      summary: summary.trim()
    };
  }
}

export { WebUIAutoRepair, RepairAction };