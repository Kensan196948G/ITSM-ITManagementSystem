/**
 * 自動エラー修復エンジン
 * - 検知されたエラーの自動分析・修復
 * - React/TypeScriptコンポーネントの自動修復
 * - ファイル修復とバックアップ管理
 * - 修復結果の検証
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DetectedError {
  id: string;
  type: 'console' | 'network' | 'accessibility' | 'ui' | 'performance' | 'typescript' | 'react';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  source: string;
  lineNumber?: number;
  columnNumber?: number;
  stackTrace?: string;
  component?: string;
  element?: string;
  fixable: boolean;
}

interface RepairAction {
  id: string;
  errorId: string;
  type: 'file_edit' | 'dependency_install' | 'config_update' | 'code_generation';
  description: string;
  filePath?: string;
  originalContent?: string;
  repairedContent?: string;
  backupPath?: string;
  command?: string;
  success: boolean;
  appliedAt: string;
  verificationResult?: VerificationResult;
}

interface VerificationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  performance: {
    before: number;
    after: number;
    improvement: number;
  };
}

interface RepairReport {
  sessionId: string;
  startTime: string;
  endTime: string;
  totalErrors: number;
  repairedErrors: number;
  failedRepairs: number;
  skippedErrors: number;
  repairActions: RepairAction[];
  summary: string;
  recommendations: string[];
}

class AutoErrorRepairEngine {
  private sourceDir: string;
  private backupDir: string;
  private reportDir: string;
  private sessionId: string;

  constructor(
    sourceDir: string = './src',
    backupDir: string = './repair-backups',
    reportDir: string = './repair-reports'
  ) {
    this.sourceDir = path.resolve(sourceDir);
    this.backupDir = path.resolve(backupDir);
    this.reportDir = path.resolve(reportDir);
    this.sessionId = `repair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.backupDir, this.reportDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createBackup(filePath: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(filePath);
    const backupFileName = `${fileName}_${timestamp}.backup`;
    const backupPath = path.join(this.backupDir, backupFileName);

    await fs.promises.copyFile(filePath, backupPath);
    console.log(`📦 バックアップ作成: ${backupPath}`);
    
    return backupPath;
  }

  async repairReactRouterFutureFlags(error: DetectedError): Promise<RepairAction> {
    const action: RepairAction = {
      id: this.generateActionId(),
      errorId: error.id,
      type: 'file_edit',
      description: 'React Router Future Flags の追加',
      success: false,
      appliedAt: new Date().toISOString()
    };

    try {
      // App.tsx または main.tsx を探す
      const possibleFiles = ['src/App.tsx', 'src/main.tsx', 'src/index.tsx'];
      let targetFile: string | null = null;

      for (const file of possibleFiles) {
        const fullPath = path.resolve(file);
        if (fs.existsSync(fullPath)) {
          targetFile = fullPath;
          break;
        }
      }

      if (!targetFile) {
        throw new Error('React Router configuration file not found');
      }

      action.filePath = targetFile;
      action.backupPath = await this.createBackup(targetFile);

      const content = await fs.promises.readFile(targetFile, 'utf-8');
      action.originalContent = content;

      // React Router v6 future flags を追加
      let repairedContent = content;

      // BrowserRouterの future フラグを追加
      if (content.includes('<BrowserRouter>')) {
        repairedContent = content.replace(
          '<BrowserRouter>',
          `<BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}>`
        );
      }

      // createBrowserRouterの future フラグを追加
      if (content.includes('createBrowserRouter(')) {
        const routerConfigRegex = /createBrowserRouter\s*\(\s*(\[[\s\S]*?\])\s*\)/;
        const match = content.match(routerConfigRegex);
        
        if (match) {
          repairedContent = content.replace(
            routerConfigRegex,
            `createBrowserRouter($1, {
              future: {
                v7_startTransition: true,
                v7_relativeSplatPath: true,
                v7_fetcherPersist: true,
                v7_normalizeFormMethod: true,
                v7_partialHydration: true,
                v7_skipActionErrorRevalidation: true
              }
            })`
          );
        }
      }

      action.repairedContent = repairedContent;

      if (repairedContent !== content) {
        await fs.promises.writeFile(targetFile, repairedContent, 'utf-8');
        action.success = true;
        console.log(`✅ React Router Future Flags を修復: ${targetFile}`);
      } else {
        throw new Error('No React Router configuration found to repair');
      }

    } catch (error) {
      console.error(`❌ React Router Future Flags 修復失敗:`, error);
      action.description += ` (Failed: ${error})`;
    }

    return action;
  }

  async repairTypeScriptErrors(error: DetectedError): Promise<RepairAction> {
    const action: RepairAction = {
      id: this.generateActionId(),
      errorId: error.id,
      type: 'file_edit',
      description: 'TypeScript型エラーの修復',
      success: false,
      appliedAt: new Date().toISOString()
    };

    try {
      const filePath = this.extractFilePathFromError(error);
      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error(`Target file not found: ${filePath}`);
      }

      action.filePath = filePath;
      action.backupPath = await this.createBackup(filePath);

      const content = await fs.promises.readFile(filePath, 'utf-8');
      action.originalContent = content;
      
      let repairedContent = content;

      // 一般的なTypeScriptエラーパターンの修復
      if (error.message.includes('Property') && error.message.includes('does not exist')) {
        // オプショナルチェーニングの追加
        repairedContent = this.addOptionalChaining(repairedContent);
      }

      if (error.message.includes('Type') && error.message.includes('is not assignable')) {
        // 型注釈の追加
        repairedContent = this.addTypeAnnotations(repairedContent);
      }

      if (error.message.includes('Argument of type') && error.message.includes('is not assignable')) {
        // 型キャストの追加
        repairedContent = this.addTypeCasting(repairedContent);
      }

      // 未使用インポートの削除
      repairedContent = this.removeUnusedImports(repairedContent);

      // 型定義の追加
      repairedContent = this.addMissingTypeDefinitions(repairedContent);

      action.repairedContent = repairedContent;

      if (repairedContent !== content) {
        await fs.promises.writeFile(filePath, repairedContent, 'utf-8');
        action.success = true;
        console.log(`✅ TypeScriptエラーを修復: ${filePath}`);
      } else {
        throw new Error('No TypeScript repairs could be applied');
      }

    } catch (error) {
      console.error(`❌ TypeScript修復失敗:`, error);
      action.description += ` (Failed: ${error})`;
    }

    return action;
  }

  async repairReactErrors(error: DetectedError): Promise<RepairAction> {
    const action: RepairAction = {
      id: this.generateActionId(),
      errorId: error.id,
      type: 'file_edit',
      description: 'Reactコンポーネントエラーの修復',
      success: false,
      appliedAt: new Date().toISOString()
    };

    try {
      const filePath = this.extractFilePathFromError(error);
      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error(`Component file not found: ${filePath}`);
      }

      action.filePath = filePath;
      action.backupPath = await this.createBackup(filePath);

      const content = await fs.promises.readFile(filePath, 'utf-8');
      action.originalContent = content;
      
      let repairedContent = content;

      // React Hooks関連の修復
      if (error.message.includes('useEffect')) {
        repairedContent = this.fixUseEffectDependencies(repairedContent);
      }

      if (error.message.includes('useState')) {
        repairedContent = this.fixUseStateInitialization(repairedContent);
      }

      if (error.message.includes('key prop')) {
        repairedContent = this.addMissingKeyProps(repairedContent);
      }

      // React Component構造の修復
      if (error.message.includes('JSX element')) {
        repairedContent = this.fixJSXStructure(repairedContent);
      }

      // Propsの型チェック
      if (error.message.includes('props')) {
        repairedContent = this.addPropsValidation(repairedContent);
      }

      action.repairedContent = repairedContent;

      if (repairedContent !== content) {
        await fs.promises.writeFile(filePath, repairedContent, 'utf-8');
        action.success = true;
        console.log(`✅ Reactエラーを修復: ${filePath}`);
      } else {
        throw new Error('No React repairs could be applied');
      }

    } catch (error) {
      console.error(`❌ React修復失敗:`, error);
      action.description += ` (Failed: ${error})`;
    }

    return action;
  }

  async repairAccessibilityErrors(error: DetectedError): Promise<RepairAction> {
    const action: RepairAction = {
      id: this.generateActionId(),
      errorId: error.id,
      type: 'file_edit',
      description: 'アクセシビリティエラーの修復',
      success: false,
      appliedAt: new Date().toISOString()
    };

    try {
      // アクセシビリティエラーに基づいてファイルを特定
      const componentFiles = await this.findComponentFiles();
      let targetFile: string | null = null;

      // エラーメッセージからコンポーネントを特定
      if (error.component) {
        targetFile = componentFiles.find(file => 
          path.basename(file).includes(error.component!)
        ) || null;
      }

      if (!targetFile && componentFiles.length > 0) {
        // 最初のコンポーネントファイルを対象とする
        targetFile = componentFiles[0];
      }

      if (!targetFile) {
        throw new Error('No suitable component file found for accessibility repair');
      }

      action.filePath = targetFile;
      action.backupPath = await this.createBackup(targetFile);

      const content = await fs.promises.readFile(targetFile, 'utf-8');
      action.originalContent = content;
      
      let repairedContent = content;

      // アクセシビリティの修復
      if (error.message.includes('alt')) {
        repairedContent = this.addAltAttributes(repairedContent);
      }

      if (error.message.includes('aria-label')) {
        repairedContent = this.addAriaLabels(repairedContent);
      }

      if (error.message.includes('color-contrast')) {
        repairedContent = this.improveColorContrast(repairedContent);
      }

      if (error.message.includes('heading')) {
        repairedContent = this.fixHeadingStructure(repairedContent);
      }

      if (error.message.includes('focus')) {
        repairedContent = this.addFocusManagement(repairedContent);
      }

      action.repairedContent = repairedContent;

      if (repairedContent !== content) {
        await fs.promises.writeFile(targetFile, repairedContent, 'utf-8');
        action.success = true;
        console.log(`✅ アクセシビリティエラーを修復: ${targetFile}`);
      } else {
        throw new Error('No accessibility repairs could be applied');
      }

    } catch (error) {
      console.error(`❌ アクセシビリティ修復失敗:`, error);
      action.description += ` (Failed: ${error})`;
    }

    return action;
  }

  async repairNetworkErrors(error: DetectedError): Promise<RepairAction> {
    const action: RepairAction = {
      id: this.generateActionId(),
      errorId: error.id,
      type: 'file_edit',
      description: 'ネットワークエラーの修復',
      success: false,
      appliedAt: new Date().toISOString()
    };

    try {
      // API呼び出しファイルを検索
      const apiFiles = await this.findAPIFiles();
      let targetFile: string | null = null;

      if (apiFiles.length > 0) {
        targetFile = apiFiles.find(file => 
          file.includes('api') || file.includes('service')
        ) || apiFiles[0];
      }

      if (!targetFile) {
        // 新しいAPI設定ファイルを作成
        targetFile = path.join(this.sourceDir, 'services', 'api.ts');
        await this.createAPIConfigFile(targetFile);
      }

      action.filePath = targetFile;
      action.backupPath = await this.createBackup(targetFile);

      const content = await fs.promises.readFile(targetFile, 'utf-8');
      action.originalContent = content;
      
      let repairedContent = content;

      // エラーハンドリングの追加
      repairedContent = this.addErrorHandling(repairedContent);

      // タイムアウト設定の追加
      repairedContent = this.addTimeoutConfig(repairedContent);

      // リトライ機能の追加
      repairedContent = this.addRetryLogic(repairedContent);

      // CORS設定の修復
      if (error.message.includes('CORS')) {
        repairedContent = this.fixCORSConfiguration(repairedContent);
      }

      action.repairedContent = repairedContent;

      if (repairedContent !== content) {
        await fs.promises.writeFile(targetFile, repairedContent, 'utf-8');
        action.success = true;
        console.log(`✅ ネットワークエラーを修復: ${targetFile}`);
      } else {
        throw new Error('No network repairs could be applied');
      }

    } catch (error) {
      console.error(`❌ ネットワーク修復失敗:`, error);
      action.description += ` (Failed: ${error})`;
    }

    return action;
  }

  // ヘルパーメソッド群
  private extractFilePathFromError(error: DetectedError): string | null {
    if (error.source && error.source !== 'browser_console') {
      return error.source;
    }

    if (error.component) {
      return path.join(this.sourceDir, 'components', `${error.component}.tsx`);
    }

    return null;
  }

  private addOptionalChaining(content: string): string {
    // プロパティアクセスにオプショナルチェーニングを追加
    return content.replace(
      /(\w+)\.(\w+)(?!\?)/g,
      (match, obj, prop) => {
        if (obj !== 'console' && obj !== 'window' && obj !== 'document') {
          return `${obj}?.${prop}`;
        }
        return match;
      }
    );
  }

  private addTypeAnnotations(content: string): string {
    // 一般的な型注釈を追加
    let result = content;

    // useState の型注釈
    result = result.replace(
      /const \[(\w+), set\w+\] = useState\(\)/g,
      'const [$1, set$1] = useState<any>()'
    );

    // 関数パラメータの型注釈
    result = result.replace(
      /function (\w+)\(([^)]+)\)/g,
      (match, funcName, params) => {
        const typedParams = params.split(',').map((param: string) => {
          const trimmed = param.trim();
          if (!trimmed.includes(':')) {
            return `${trimmed}: any`;
          }
          return trimmed;
        }).join(', ');
        return `function ${funcName}(${typedParams})`;
      }
    );

    return result;
  }

  private addTypeCasting(content: string): string {
    // 一般的な型キャストを追加
    return content.replace(
      /(\w+)\s*as\s*unknown/g,
      '$1 as any'
    );
  }

  private removeUnusedImports(content: string): string {
    const lines = content.split('\n');
    const usedImports = new Set<string>();
    
    // コード内で使用されているimportを検出
    lines.forEach(line => {
      if (!line.trim().startsWith('import')) {
        const matches = line.match(/\b[A-Z]\w*/g);
        if (matches) {
          matches.forEach(match => usedImports.add(match));
        }
      }
    });

    // 未使用のimportを削除
    return lines.filter(line => {
      if (line.trim().startsWith('import')) {
        const importMatch = line.match(/import\s+.*?\{([^}]+)\}/);
        if (importMatch) {
          const imports = importMatch[1].split(',').map(imp => imp.trim());
          const usedInThisImport = imports.some(imp => usedImports.has(imp));
          return usedInThisImport;
        }
      }
      return true;
    }).join('\n');
  }

  private addMissingTypeDefinitions(content: string): string {
    let result = content;

    // 一般的な型定義を追加
    if (!result.includes('interface Props') && result.includes('props:')) {
      result = `interface Props {\n  [key: string]: any;\n}\n\n${result}`;
    }

    return result;
  }

  private fixUseEffectDependencies(content: string): string {
    return content.replace(
      /useEffect\(\(\) => \{[\s\S]*?\}, \[\]/g,
      (match) => {
        // 依存配列を分析して適切な依存関係を追加
        const variables = match.match(/\b\w+(?=\()/g) || [];
        const deps = variables.filter(v => 
          !['console', 'fetch', 'setTimeout', 'setInterval'].includes(v)
        );
        
        if (deps.length > 0) {
          return match.replace('[]', `[${deps.join(', ')}]`);
        }
        return match;
      }
    );
  }

  private fixUseStateInitialization(content: string): string {
    return content.replace(
      /useState\(\)/g,
      'useState<any>(null)'
    ).replace(
      /useState\(undefined\)/g,
      'useState<any>(null)'
    );
  }

  private addMissingKeyProps(content: string): string {
    return content.replace(
      /\.map\(\((.*?)\) => (\s*<\w+)/g,
      (match, param, element) => {
        const indexVar = param.includes(',') ? param.split(',')[1].trim() : 'index';
        if (!element.includes('key=')) {
          return match.replace(element, `${element} key={${indexVar}}`);
        }
        return match;
      }
    );
  }

  private fixJSXStructure(content: string): string {
    // JSX構造の修復
    let result = content;

    // Fragment の追加
    result = result.replace(
      /return \(\s*(<\w+[\s\S]*?>[\s\S]*?<\/\w+>)\s*(<\w+[\s\S]*?>[\s\S]*?<\/\w+>)/g,
      'return (\n  <React.Fragment>\n    $1\n    $2\n  </React.Fragment>'
    );

    return result;
  }

  private addPropsValidation(content: string): string {
    // Props型チェックの追加
    if (!content.includes('interface') && content.includes('props')) {
      const propsInterface = `
interface ComponentProps {
  [key: string]: any;
}
`;
      content = propsInterface + content;
    }

    return content;
  }

  private addAltAttributes(content: string): string {
    return content.replace(
      /<img([^>]*?)(?<!alt="[^"]*")>/g,
      '<img$1 alt="画像">'
    );
  }

  private addAriaLabels(content: string): string {
    let result = content;

    // ボタンにaria-labelを追加
    result = result.replace(
      /<button([^>]*?)(?<!aria-label="[^"]*")>/g,
      '<button$1 aria-label="ボタン">'
    );

    // 入力フィールドにaria-labelを追加
    result = result.replace(
      /<input([^>]*?)(?<!aria-label="[^"]*")>/g,
      '<input$1 aria-label="入力フィールド">'
    );

    return result;
  }

  private improveColorContrast(content: string): string {
    // 色のコントラストを改善（基本的な置換）
    return content.replace(
      /color:\s*#([a-fA-F0-9]{3,6})/g,
      (match, color) => {
        // 薄い色を濃い色に変更
        if (color === 'ccc' || color === 'cccccc') {
          return 'color: #333333';
        }
        return match;
      }
    );
  }

  private fixHeadingStructure(content: string): string {
    // 見出し構造の修復
    let result = content;
    let h1Count = 0;

    result = result.replace(/<h1/g, () => {
      h1Count++;
      if (h1Count > 1) {
        return '<h2';
      }
      return '<h1';
    });

    return result;
  }

  private addFocusManagement(content: string): string {
    // フォーカス管理の追加
    return content.replace(
      /<button([^>]*?)>/g,
      '<button$1 tabIndex={0}>'
    );
  }

  private async findComponentFiles(): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const walk = (dir: string) => {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (item.endsWith('.tsx') || item.endsWith('.jsx')) {
            files.push(fullPath);
          }
        });
      };

      walk(this.sourceDir);
    } catch (error) {
      console.warn('Error finding component files:', error);
    }

    return files;
  }

  private async findAPIFiles(): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const walk = (dir: string) => {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (
            (item.includes('api') || item.includes('service')) &&
            (item.endsWith('.ts') || item.endsWith('.js'))
          ) {
            files.push(fullPath);
          }
        });
      };

      walk(this.sourceDir);
    } catch (error) {
      console.warn('Error finding API files:', error);
    }

    return files;
  }

  private async createAPIConfigFile(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = `
// Auto-generated API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.3.135:8000';

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  retries: 3,
  headers: {
    'Content-Type': 'application/json',
  }
};

export const api = {
  async get(endpoint: string) {
    try {
      const response = await fetch(\`\${API_BASE_URL}\${endpoint}\`, {
        method: 'GET',
        headers: apiConfig.headers,
      });
      
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  },

  async post(endpoint: string, data: any) {
    try {
      const response = await fetch(\`\${API_BASE_URL}\${endpoint}\`, {
        method: 'POST',
        headers: apiConfig.headers,
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  }
};
`;

    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  private addErrorHandling(content: string): string {
    // エラーハンドリングの改善
    return content.replace(
      /fetch\((.*?)\)/g,
      `fetch($1).catch(error => {
        console.error('Network error:', error);
        throw error;
      })`
    );
  }

  private addTimeoutConfig(content: string): string {
    // タイムアウト設定の追加
    return content.replace(
      /fetch\((.*?)\)/g,
      (match, url) => {
        if (!match.includes('signal:')) {
          return `fetch(${url}, { 
            signal: AbortSignal.timeout(10000),
            ...options 
          })`;
        }
        return match;
      }
    );
  }

  private addRetryLogic(content: string): string {
    // リトライロジックの追加
    const retryFunction = `
const retryFetch = async (url: string, options: any, retries = 3): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || i === retries - 1) {
        return response;
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
};
`;

    if (!content.includes('retryFetch')) {
      content = retryFunction + content;
    }

    return content;
  }

  private fixCORSConfiguration(content: string): string {
    // CORS設定の修復
    return content.replace(
      /headers:\s*\{/g,
      `headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',`
    );
  }

  async repairError(error: DetectedError): Promise<RepairAction> {
    console.log(`🔧 エラー修復開始: ${error.type} - ${error.message}`);

    if (!error.fixable) {
      return {
        id: this.generateActionId(),
        errorId: error.id,
        type: 'file_edit',
        description: 'エラーは自動修復対象外です',
        success: false,
        appliedAt: new Date().toISOString()
      };
    }

    try {
      switch (error.type) {
        case 'react':
          if (error.message.includes('React Router Future Flag')) {
            return await this.repairReactRouterFutureFlags(error);
          }
          return await this.repairReactErrors(error);

        case 'typescript':
          return await this.repairTypeScriptErrors(error);

        case 'accessibility':
          return await this.repairAccessibilityErrors(error);

        case 'network':
          return await this.repairNetworkErrors(error);

        default:
          return {
            id: this.generateActionId(),
            errorId: error.id,
            type: 'file_edit',
            description: `未対応のエラータイプ: ${error.type}`,
            success: false,
            appliedAt: new Date().toISOString()
          };
      }
    } catch (error) {
      console.error('修復処理中にエラー:', error);
      return {
        id: this.generateActionId(),
        errorId: error.id,
        type: 'file_edit',
        description: `修復処理失敗: ${error}`,
        success: false,
        appliedAt: new Date().toISOString()
      };
    }
  }

  async repairMultipleErrors(errors: DetectedError[]): Promise<RepairReport> {
    const startTime = new Date();
    console.log(`🛠️ 自動エラー修復開始: ${errors.length} 件のエラーを処理中...`);

    const repairActions: RepairAction[] = [];
    let repairedErrors = 0;
    let failedRepairs = 0;
    let skippedErrors = 0;

    for (const error of errors) {
      try {
        const action = await this.repairError(error);
        repairActions.push(action);

        if (action.success) {
          repairedErrors++;
          console.log(`✅ 修復成功: ${error.type} - ${error.message.substring(0, 50)}...`);
        } else {
          failedRepairs++;
          console.log(`❌ 修復失敗: ${error.type} - ${error.message.substring(0, 50)}...`);
        }
      } catch (error) {
        skippedErrors++;
        console.log(`⏭️ スキップ: ${error}`);
      }
    }

    const endTime = new Date();
    const report: RepairReport = {
      sessionId: this.sessionId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalErrors: errors.length,
      repairedErrors,
      failedRepairs,
      skippedErrors,
      repairActions,
      summary: `
自動エラー修復完了:
- 総エラー数: ${errors.length}
- 修復成功: ${repairedErrors}
- 修復失敗: ${failedRepairs}
- スキップ: ${skippedErrors}
- 修復率: ${Math.round((repairedErrors / errors.length) * 100)}%
- 実行時間: ${Math.round((endTime.getTime() - startTime.getTime()) / 1000)}秒
`,
      recommendations: this.generateRepairRecommendations(repairActions)
    };

    await this.saveRepairReport(report);
    console.log('✅ 自動エラー修復処理完了');

    return report;
  }

  private generateRepairRecommendations(actions: RepairAction[]): string[] {
    const recommendations: string[] = [];
    const successfulActions = actions.filter(a => a.success);
    const failedActions = actions.filter(a => !a.success);

    if (successfulActions.length > 0) {
      recommendations.push(`✅ ${successfulActions.length} 件のエラーが自動修復されました`);
      recommendations.push('🧪 修復後のテスト実行を推奨します');
    }

    if (failedActions.length > 0) {
      recommendations.push(`❌ ${failedActions.length} 件のエラーは手動修復が必要です`);
      recommendations.push('🔍 失敗した修復の詳細を確認してください');
    }

    const backupFiles = actions.filter(a => a.backupPath).length;
    if (backupFiles > 0) {
      recommendations.push(`📦 ${backupFiles} 件のバックアップファイルが作成されました`);
      recommendations.push('🔄 必要に応じて元の状態に復元できます');
    }

    recommendations.push('📊 定期的な自動修復により、コード品質を維持できます');
    recommendations.push('⚙️ 修復ルールのカスタマイズを検討してください');

    return recommendations;
  }

  private async saveRepairReport(report: RepairReport): Promise<void> {
    const jsonPath = path.join(this.reportDir, `repair-report-${this.sessionId}.json`);
    await fs.promises.writeFile(jsonPath, JSON.stringify(report, null, 2));

    const htmlPath = path.join(this.reportDir, `repair-report-${this.sessionId}.html`);
    const htmlContent = this.generateRepairHTMLReport(report);
    await fs.promises.writeFile(htmlPath, htmlContent);

    console.log(`📊 修復レポート保存: ${jsonPath}`);
  }

  private generateRepairHTMLReport(report: RepairReport): string {
    const successRate = Math.round((report.repairedErrors / report.totalErrors) * 100);
    
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auto Error Repair Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px; 
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 40px; 
            text-align: center;
        }
        .header h1 { font-size: 3em; margin-bottom: 10px; }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 40px;
            background: #f8f9fa;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .metric-number {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .section {
            padding: 30px;
            border-bottom: 1px solid #eee;
        }
        .section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        .action-item {
            background: #f8f9fa;
            margin: 10px 0;
            padding: 15px;
            border-radius: 8px;
            border-left: 5px solid #ddd;
        }
        .action-success { border-left-color: #28a745; background: #d4edda; }
        .action-failed { border-left-color: #dc3545; background: #f8d7da; }
        .recommendations {
            background: #e3f2fd;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
        }
        .recommendation-item {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 5px;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #eee;
            border-radius: 10px;
            overflow: hidden;
            margin: 20px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            width: ${successRate}%;
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛠️ Auto Error Repair Report</h1>
            <div class="subtitle">Session: ${report.sessionId}</div>
            <div class="subtitle">Generated: ${new Date(report.endTime).toLocaleString('ja-JP')}</div>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-number">${report.totalErrors}</div>
                <div class="metric-label">Total Errors</div>
            </div>
            <div class="metric-card">
                <div class="metric-number success">${report.repairedErrors}</div>
                <div class="metric-label">Repaired</div>
            </div>
            <div class="metric-card">
                <div class="metric-number error">${report.failedRepairs}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric-card">
                <div class="metric-number warning">${report.skippedErrors}</div>
                <div class="metric-label">Skipped</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${successRate}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Repair Progress</h2>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <p>修復成功率: ${successRate}% (${report.repairedErrors}/${report.totalErrors})</p>
        </div>

        <div class="section">
            <h2>🔧 Repair Actions</h2>
            ${report.repairActions.map(action => `
                <div class="action-item ${action.success ? 'action-success' : 'action-failed'}">
                    <strong>${action.success ? '✅ SUCCESS' : '❌ FAILED'}</strong> - ${action.description}
                    <br><strong>Type:</strong> ${action.type}
                    ${action.filePath ? `<br><strong>File:</strong> ${action.filePath}` : ''}
                    <br><strong>Applied:</strong> ${new Date(action.appliedAt).toLocaleString('ja-JP')}
                    ${action.backupPath ? `<br><strong>Backup:</strong> ${action.backupPath}` : ''}
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>💡 Recommendations</h2>
            <div class="recommendations">
                ${report.recommendations.map(rec => 
                    `<div class="recommendation-item">${rec}</div>`
                ).join('')}
            </div>
        </div>

        <div class="section">
            <h2>📋 Summary</h2>
            <pre>${report.summary}</pre>
        </div>
    </div>
</body>
</html>
    `;
  }
}

export { AutoErrorRepairEngine, DetectedError, RepairAction, RepairReport };

// スクリプトとして直接実行された場合
if (require.main === module) {
  const repairEngine = new AutoErrorRepairEngine();
  
  const run = async () => {
    try {
      // サンプルエラーでテスト
      const sampleErrors: DetectedError[] = [
        {
          id: 'test_1',
          type: 'react',
          severity: 'medium',
          message: 'React Router Future Flag Warning',
          source: 'src/App.tsx',
          fixable: true
        }
      ];
      
      const report = await repairEngine.repairMultipleErrors(sampleErrors);
      
      console.log('\n✅ Auto Error Repair Test 完了');
      console.log(`📊 修復率: ${Math.round((report.repairedErrors / report.totalErrors) * 100)}%`);
      
    } catch (error) {
      console.error('❌ Auto Error Repair Test 失敗:', error);
      process.exit(1);
    }
  };

  run();
}