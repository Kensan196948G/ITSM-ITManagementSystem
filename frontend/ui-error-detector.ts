/**
 * UI/UXコンポーネント表示エラー検出・修復システム
 * レスポンシブデザイン、アクセシビリティ、Material-UI関連の問題を自動検出・修復
 */

import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface UIError {
  type: 'layout' | 'responsive' | 'accessibility' | 'performance' | 'material-ui' | 'styling';
  severity: 'low' | 'medium' | 'high' | 'critical';
  element?: string;
  message: string;
  selector?: string;
  viewport?: string;
  suggestion: string;
  timestamp: string;
}

interface UIFix {
  errorType: string;
  filePath?: string;
  cssRule?: string;
  componentFix?: string;
  description: string;
  applied: boolean;
}

class UIErrorDetector {
  private page: Page;
  private errors: UIError[] = [];
  private fixes: UIFix[] = [];
  private sourceDir: string;

  constructor(page: Page, sourceDir: string = './src') {
    this.page = page;
    this.sourceDir = path.resolve(sourceDir);
  }

  async detectAllUIErrors(): Promise<UIError[]> {
    console.log('🎨 UI/UXエラーの包括的検出を開始...');

    // 1. レスポンシブデザインエラー
    await this.detectResponsiveErrors();

    // 2. アクセシビリティエラー
    await this.detectAccessibilityErrors();

    // 3. レイアウトエラー
    await this.detectLayoutErrors();

    // 4. パフォーマンス関連UI問題
    await this.detectPerformanceUIErrors();

    // 5. Material-UI特有の問題
    await this.detectMaterialUIErrors();

    // 6. スタイリングエラー
    await this.detectStylingErrors();

    return this.errors;
  }

  private async detectResponsiveErrors(): Promise<void> {
    console.log('📱 レスポンシブデザインエラーを検出中...');

    const viewports = [
      { width: 320, height: 568, name: 'Mobile Portrait' },
      { width: 568, height: 320, name: 'Mobile Landscape' },
      { width: 768, height: 1024, name: 'Tablet Portrait' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 2560, height: 1440, name: 'Large Desktop' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(1000);

      // 水平スクロールバーの検出
      const hasHorizontalScroll = await this.page.evaluate(() => {
        return document.body.scrollWidth > document.body.clientWidth;
      });

      if (hasHorizontalScroll) {
        this.addError({
          type: 'responsive',
          severity: 'high',
          message: `${viewport.name}で水平スクロールが発生`,
          viewport: viewport.name,
          suggestion: 'max-width: 100%やoverflow-x: hiddenを適用',
          timestamp: new Date().toISOString()
        });

        await this.fixHorizontalOverflow(viewport.name);
      }

      // 要素が画面外にはみ出していないかチェック
      const overflowingElements = await this.page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const overflowing: string[] = [];
        
        elements.forEach((el, index) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth) {
            overflowing.push(`element-${index}: ${el.tagName}${el.className ? '.' + el.className.split(' ').join('.') : ''}`);
          }
        });
        
        return overflowing;
      });

      if (overflowingElements.length > 0) {
        this.addError({
          type: 'responsive',
          severity: 'medium',
          message: `${viewport.name}で要素が画面外にはみ出し: ${overflowingElements.slice(0, 3).join(', ')}`,
          viewport: viewport.name,
          suggestion: 'flexboxやCSS Gridを使用してレスポンシブレイアウトを改善',
          timestamp: new Date().toISOString()
        });
      }

      // テキストが切れていないかチェック
      const textOverflowElements = await this.page.evaluate(() => {
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div');
        const overflowing: string[] = [];
        
        textElements.forEach((el, index) => {
          const computedStyle = window.getComputedStyle(el);
          if (computedStyle.whiteSpace === 'nowrap' || computedStyle.overflow === 'hidden') {
            if (el.scrollWidth > el.clientWidth) {
              overflowing.push(`text-element-${index}`);
            }
          }
        });
        
        return overflowing;
      });

      if (textOverflowElements.length > 0) {
        this.addError({
          type: 'responsive',
          severity: 'medium',
          message: `${viewport.name}でテキストがはみ出し: ${textOverflowElements.length}個の要素`,
          viewport: viewport.name,
          suggestion: 'word-wrap: break-wordやtext-overflow: ellipsisを適用',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  private async detectAccessibilityErrors(): Promise<void> {
    console.log('♿ アクセシビリティエラーを検出中...');

    // alt属性のない画像
    const imagesWithoutAlt = await this.page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const violations: string[] = [];
      
      images.forEach((img, index) => {
        if (!img.alt && !img.getAttribute('aria-label')) {
          violations.push(`img-${index}: ${img.src}`);
        }
      });
      
      return violations;
    });

    if (imagesWithoutAlt.length > 0) {
      this.addError({
        type: 'accessibility',
        severity: 'high',
        message: `alt属性のない画像: ${imagesWithoutAlt.length}個`,
        suggestion: 'すべての画像にalt属性またはaria-labelを追加',
        timestamp: new Date().toISOString()
      });

      await this.fixMissingAltAttributes();
    }

    // aria-labelのないボタン
    const buttonsWithoutLabel = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const violations: string[] = [];
      
      buttons.forEach((btn, index) => {
        if (!btn.textContent?.trim() && !btn.getAttribute('aria-label') && !btn.getAttribute('title')) {
          violations.push(`button-${index}`);
        }
      });
      
      return violations;
    });

    if (buttonsWithoutLabel.length > 0) {
      this.addError({
        type: 'accessibility',
        severity: 'high',
        message: `ラベルのないボタン: ${buttonsWithoutLabel.length}個`,
        suggestion: 'ボタンにaria-labelまたはテキストコンテンツを追加',
        timestamp: new Date().toISOString()
      });
    }

    // コントラスト比のチェック
    const lowContrastElements = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const violations: string[] = [];
      
      elements.forEach((el, index) => {
        const style = window.getComputedStyle(el);
        const textColor = style.color;
        const backgroundColor = style.backgroundColor;
        
        // 簡易的なコントラスト比チェック（実際にはより詳細な計算が必要）
        if (textColor && backgroundColor && textColor !== backgroundColor) {
          if (textColor.includes('rgb(128') || backgroundColor.includes('rgb(128')) {
            violations.push(`low-contrast-${index}`);
          }
        }
      });
      
      return violations.slice(0, 10); // 上位10個まで
    });

    if (lowContrastElements.length > 0) {
      this.addError({
        type: 'accessibility',
        severity: 'medium',
        message: `コントラスト比が低い可能性のある要素: ${lowContrastElements.length}個`,
        suggestion: 'テキストと背景のコントラスト比を4.5:1以上に改善',
        timestamp: new Date().toISOString()
      });
    }

    // フォーカス可能要素のフォーカスインジケーター
    const elementsWithoutFocusIndicator = await this.page.evaluate(() => {
      const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
      const violations: string[] = [];
      
      focusableElements.forEach((el, index) => {
        const style = window.getComputedStyle(el, ':focus');
        if (style.outline === 'none' && !style.boxShadow && !style.border) {
          violations.push(`focus-${index}`);
        }
      });
      
      return violations;
    });

    if (elementsWithoutFocusIndicator.length > 0) {
      this.addError({
        type: 'accessibility',
        severity: 'medium',
        message: `フォーカスインジケーターのない要素: ${elementsWithoutFocusIndicator.length}個`,
        suggestion: ':focus疑似クラスにoutlineやbox-shadowを追加',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async detectLayoutErrors(): Promise<void> {
    console.log('📐 レイアウトエラーを検出中...');

    // z-indexの衝突
    const zIndexConflicts = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const zIndexMap = new Map<string, number>();
      const conflicts: string[] = [];
      
      elements.forEach((el, index) => {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex);
        
        if (!isNaN(zIndex) && zIndex > 0) {
          const key = `z${zIndex}`;
          if (zIndexMap.has(key)) {
            conflicts.push(`z-index-${zIndex}-conflict-${index}`);
          } else {
            zIndexMap.set(key, index);
          }
        }
      });
      
      return conflicts;
    });

    if (zIndexConflicts.length > 0) {
      this.addError({
        type: 'layout',
        severity: 'medium',
        message: `z-indexの衝突: ${zIndexConflicts.length}個`,
        suggestion: 'z-indexの値を整理し、階層構造を明確化',
        timestamp: new Date().toISOString()
      });
    }

    // 空のコンテナ
    const emptyContainers = await this.page.evaluate(() => {
      const containers = document.querySelectorAll('div, section, article, aside');
      const empty: string[] = [];
      
      containers.forEach((container, index) => {
        if (container.children.length === 0 && !container.textContent?.trim()) {
          const rect = container.getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) {
            empty.push(`empty-container-${index}`);
          }
        }
      });
      
      return empty;
    });

    if (emptyContainers.length > 0) {
      this.addError({
        type: 'layout',
        severity: 'low',
        message: `空のコンテナ: ${emptyContainers.length}個`,
        suggestion: '不要な空のコンテナを削除または適切なコンテンツを追加',
        timestamp: new Date().toISOString()
      });
    }

    // 極端に小さい/大きいマージン・パディング
    const extremeSpacing = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const extreme: string[] = [];
      
      elements.forEach((el, index) => {
        const style = window.getComputedStyle(el);
        const margin = parseInt(style.margin);
        const padding = parseInt(style.padding);
        
        if (margin > 200 || padding > 200) {
          extreme.push(`large-spacing-${index}`);
        }
      });
      
      return extreme;
    });

    if (extremeSpacing.length > 0) {
      this.addError({
        type: 'layout',
        severity: 'medium',
        message: `極端に大きなマージン/パディング: ${extremeSpacing.length}個`,
        suggestion: 'マージンやパディングの値を適切な範囲に調整',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async detectPerformanceUIErrors(): Promise<void> {
    console.log('⚡ パフォーマンス関連UI問題を検出中...');

    // 大きな画像
    const largeImages = await this.page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const large: string[] = [];
      
      images.forEach((img, index) => {
        const rect = img.getBoundingClientRect();
        if (img.naturalWidth > rect.width * 2 || img.naturalHeight > rect.height * 2) {
          large.push(`oversized-image-${index}: ${img.src}`);
        }
      });
      
      return large;
    });

    if (largeImages.length > 0) {
      this.addError({
        type: 'performance',
        severity: 'medium',
        message: `オーバーサイズの画像: ${largeImages.length}個`,
        suggestion: '画像を適切なサイズにリサイズまたは圧縮',
        timestamp: new Date().toISOString()
      });
    }

    // 過度なDOM要素
    const domComplexity = await this.page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });

    if (domComplexity > 1500) {
      this.addError({
        type: 'performance',
        severity: 'medium',
        message: `DOM要素数が過多: ${domComplexity}個`,
        suggestion: 'コンポーネントの仮想化や遅延読み込みを検討',
        timestamp: new Date().toISOString()
      });
    }

    // 複雑なCSSセレクター
    const complexSelectors = await this.page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets);
      let complexCount = 0;
      
      stylesheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            if (rule instanceof CSSStyleRule) {
              const selectorText = rule.selectorText;
              if (selectorText && selectorText.split(' ').length > 5) {
                complexCount++;
              }
            }
          });
        } catch (e) {
          // Cross-origin stylesheets
        }
      });
      
      return complexCount;
    });

    if (complexSelectors > 50) {
      this.addError({
        type: 'performance',
        severity: 'low',
        message: `複雑なCSSセレクター: ${complexSelectors}個`,
        suggestion: 'CSSセレクターを簡素化してパフォーマンスを改善',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async detectMaterialUIErrors(): Promise<void> {
    console.log('🎯 Material-UI特有の問題を検出中...');

    // Material-UIテーマの不整合
    const themeInconsistencies = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="Mui"], [class*="mui"]');
      const inconsistencies: string[] = [];
      
      elements.forEach((el, index) => {
        const style = window.getComputedStyle(el);
        
        // 一般的でない色値の検出
        if (style.color && !style.color.includes('rgb(') && !style.color.includes('#')) {
          inconsistencies.push(`color-${index}`);
        }
        
        // 非標準のフォントファミリー
        if (style.fontFamily && !style.fontFamily.includes('Roboto') && !style.fontFamily.includes('inherit')) {
          inconsistencies.push(`font-${index}`);
        }
      });
      
      return inconsistencies;
    });

    if (themeInconsistencies.length > 0) {
      this.addError({
        type: 'material-ui',
        severity: 'low',
        message: `Material-UIテーマの不整合: ${themeInconsistencies.length}個`,
        suggestion: 'Material-UIのテーマシステムを統一的に使用',
        timestamp: new Date().toISOString()
      });
    }

    // カスタムスタイルによるMaterial-UIの上書き
    const customStyleOverrides = await this.page.evaluate(() => {
      const muiElements = document.querySelectorAll('[class*="Mui"]');
      const overrides: string[] = [];
      
      muiElements.forEach((el, index) => {
        if (el.hasAttribute('style')) {
          overrides.push(`override-${index}`);
        }
      });
      
      return overrides;
    });

    if (customStyleOverrides.length > 0) {
      this.addError({
        type: 'material-ui',
        severity: 'low',
        message: `インラインスタイルによる上書き: ${customStyleOverrides.length}個`,
        suggestion: 'sx propやstyledを使用してMaterial-UIのスタイリングパターンに従う',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async detectStylingErrors(): Promise<void> {
    console.log('🎨 スタイリングエラーを検出中...');

    // !importantの過用
    const importantOveruse = await this.page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets);
      let importantCount = 0;
      
      stylesheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            if (rule instanceof CSSStyleRule) {
              const cssText = rule.style.cssText;
              const matches = cssText.match(/!important/g);
              if (matches) {
                importantCount += matches.length;
              }
            }
          });
        } catch (e) {
          // Cross-origin stylesheets
        }
      });
      
      return importantCount;
    });

    if (importantOveruse > 20) {
      this.addError({
        type: 'styling',
        severity: 'medium',
        message: `!importantの過用: ${importantOveruse}回`,
        suggestion: 'CSS設計を見直し、!importantの使用を削減',
        timestamp: new Date().toISOString()
      });
    }

    // 一貫性のないカラーパレット
    const colorInconsistencies = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const colors = new Set<string>();
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.color) colors.add(style.color);
        if (style.backgroundColor) colors.add(style.backgroundColor);
      });
      
      return Array.from(colors).length;
    });

    if (colorInconsistencies > 50) {
      this.addError({
        type: 'styling',
        severity: 'low',
        message: `多数の異なる色値: ${colorInconsistencies}種類`,
        suggestion: 'カラーパレットを定義し、一貫した色使いを実現',
        timestamp: new Date().toISOString()
      });
    }
  }

  private addError(error: Omit<UIError, 'element'>): void {
    this.errors.push({
      element: '',
      ...error
    });
  }

  // 修復メソッド

  private async fixHorizontalOverflow(viewport: string): Promise<void> {
    const fix: UIFix = {
      errorType: 'horizontal-overflow',
      cssRule: `
/* レスポンシブデザイン修復 - ${viewport} */
* {
  box-sizing: border-box;
}

body {
  overflow-x: hidden;
}

.container, .main-content {
  max-width: 100%;
  padding: 0 15px;
}

img, video {
  max-width: 100%;
  height: auto;
}

table {
  width: 100%;
  table-layout: fixed;
  overflow-x: auto;
}
      `,
      description: `${viewport}での水平オーバーフロー修復`,
      applied: false
    };

    this.fixes.push(fix);
  }

  private async fixMissingAltAttributes(): Promise<void> {
    const fix: UIFix = {
      errorType: 'missing-alt-attributes',
      componentFix: `
// 画像コンポーネントの修復
const ImageWithAlt = ({ src, alt, ...props }) => (
  <img 
    src={src} 
    alt={alt || 'Image'} 
    {...props}
  />
);

// 使用例
<ImageWithAlt src="/path/to/image.jpg" alt="説明文" />
      `,
      description: 'alt属性の自動追加',
      applied: false
    };

    this.fixes.push(fix);
  }

  async generateUIFixReport(): Promise<void> {
    const reportPath = path.join(path.dirname(this.sourceDir), 'ui-error-detection-report.json');
    const htmlReportPath = path.join(path.dirname(this.sourceDir), 'ui-error-detection-report.html');

    const report = {
      summary: {
        totalErrors: this.errors.length,
        errorsByType: this.groupErrorsByType(),
        errorsBySeverity: this.groupErrorsBySeverity(),
        timestamp: new Date().toISOString()
      },
      errors: this.errors,
      fixes: this.fixes
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // HTML レポート生成
    const htmlContent = this.generateHTMLReport(report);
    fs.writeFileSync(htmlReportPath, htmlContent);

    console.log(`📊 UI エラー検出レポートを生成:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
  }

  private groupErrorsByType(): Record<string, number> {
    return this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupErrorsBySeverity(): Record<string, number> {
    return this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private generateHTMLReport(report: any): string {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI/UXエラー検出レポート</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; background: #f8f9fa; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #6c757d; margin-top: 5px; }
        .content { padding: 30px; }
        .error-grid { display: grid; gap: 20px; }
        .error-card { background: white; border-radius: 10px; padding: 20px; border-left: 4px solid #dc3545; box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
        .error-card.medium { border-left-color: #ffc107; }
        .error-card.low { border-left-color: #28a745; }
        .error-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .error-type { background: #667eea; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9em; }
        .severity-badge { padding: 3px 10px; border-radius: 15px; font-size: 0.8em; font-weight: bold; }
        .severity-critical { background: #dc3545; color: white; }
        .severity-high { background: #fd7e14; color: white; }
        .severity-medium { background: #ffc107; color: black; }
        .severity-low { background: #28a745; color: white; }
        .error-message { font-size: 1.1em; margin-bottom: 10px; }
        .error-suggestion { background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 15px; }
        .fix-section { margin-top: 40px; }
        .fix-card { background: #e8f5e8; border: 1px solid #28a745; border-radius: 10px; padding: 20px; margin: 15px 0; }
        .code-block { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 5px; padding: 15px; font-family: 'Courier New', monospace; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 UI/UXエラー検出レポート</h1>
            <p>実行時刻: ${new Date().toLocaleString('ja-JP')}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${report.summary.totalErrors}</div>
                <div class="stat-label">総エラー数</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.errorsBySeverity.critical || 0}</div>
                <div class="stat-label">Critical</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.errorsBySeverity.high || 0}</div>
                <div class="stat-label">High</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.errorsBySeverity.medium || 0}</div>
                <div class="stat-label">Medium</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.errorsBySeverity.low || 0}</div>
                <div class="stat-label">Low</div>
            </div>
        </div>

        <div class="content">
            <h2>🔍 検出されたエラー</h2>
            <div class="error-grid">
                ${report.errors.map((error: UIError) => `
                    <div class="error-card ${error.severity}">
                        <div class="error-header">
                            <span class="error-type">${error.type}</span>
                            <span class="severity-badge severity-${error.severity}">${error.severity.toUpperCase()}</span>
                        </div>
                        <div class="error-message">${error.message}</div>
                        ${error.viewport ? `<div><strong>Viewport:</strong> ${error.viewport}</div>` : ''}
                        ${error.selector ? `<div><strong>Selector:</strong> <code>${error.selector}</code></div>` : ''}
                        <div class="error-suggestion">
                            <strong>💡 修復提案:</strong> ${error.suggestion}
                        </div>
                    </div>
                `).join('')}
            </div>

            ${report.fixes.length > 0 ? `
            <div class="fix-section">
                <h2>🔧 修復方法</h2>
                ${report.fixes.map((fix: UIFix) => `
                    <div class="fix-card">
                        <h3>${fix.errorType}</h3>
                        <p>${fix.description}</p>
                        ${fix.cssRule ? `
                            <h4>CSS修復:</h4>
                            <div class="code-block">${fix.cssRule}</div>
                        ` : ''}
                        ${fix.componentFix ? `
                            <h4>コンポーネント修復:</h4>
                            <div class="code-block">${fix.componentFix}</div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>
    `;
  }
}

export { UIErrorDetector, UIError, UIFix };