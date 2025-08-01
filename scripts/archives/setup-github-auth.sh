#!/bin/bash

# GitHub認証設定スクリプト
# Personal Access Token または GitHub CLI の設定

echo "🔐 GitHub Authentication Setup"
echo "================================"
echo ""

# GitHub CLI が利用可能かチェック
if command -v gh >/dev/null 2>&1; then
    echo "✅ GitHub CLI (gh) is available"
    echo ""
    echo "Option 1: GitHub CLI Authentication (Recommended)"
    echo "Run: gh auth login"
    echo "Then select: GitHub.com > HTTPS > Yes (authenticate) > Login with web browser"
    echo ""
else
    echo "❌ GitHub CLI (gh) not found"
    echo "Install with: sudo apt install gh"
    echo ""
fi

echo "Option 2: Personal Access Token Setup"
echo "======================================"
echo ""
echo "1. Go to: https://github.com/settings/tokens"
echo "2. Click 'Generate new token (classic)'"
echo "3. Select scopes:"
echo "   ✅ repo (Full control of private repositories)"
echo "   ✅ workflow (Update GitHub Action workflows)"
echo "4. Copy the generated token"
echo ""
echo "5. Configure Git to use the token:"
echo "   git config --global credential.helper store"
echo "   git config --global user.name 'Kensan196948G'"
echo "   git config --global user.email 'your-email@example.com'"
echo ""
echo "6. On first push, enter:"
echo "   Username: Kensan196948G"
echo "   Password: [paste your token here]"
echo ""

# 現在のGit設定を表示
echo "Current Git Configuration:"
echo "=========================="
git config --global --list | grep -E "(user\.|credential\.)" || echo "No global git configuration found"
echo ""

echo "💡 Tips:"
echo "- GitHub CLI is the easiest option"
echo "- Personal Access Token is more manual but works everywhere"
echo "- Token will be stored securely after first use"
echo ""

echo "After authentication, test with: ./git-auto-sync.sh"