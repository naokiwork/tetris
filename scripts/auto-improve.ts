#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { OpenAI } from 'openai';
import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';

interface Improvement {
  priority: 'high' | 'medium' | 'low';
  title: string;
  location: string;
  description: string;
  fix: string;
  raw: string;
}

const git = simpleGit();

// 環境変数の確認
const openaiApiKey = process.env.OPENAI_API_KEY;
const ghPat = process.env.GH_PAT || process.env.GITHUB_TOKEN;

if (!openaiApiKey) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiApiKey });

/**
 * CODE_IMPROVEMENTS.mdをパース
 */
function parseImprovements(filePath: string): Improvement[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const improvements: Improvement[] = [];
  
  const sections = content.split(/^##\s+/m);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    let priority: 'high' | 'medium' | 'low' | null = null;
    if (section.includes('🔴') || section.includes('高優先度')) {
      priority = 'high';
    } else if (section.includes('🟡') || section.includes('中優先度')) {
      priority = 'medium';
    } else if (section.includes('🟢') || section.includes('低優先度')) {
      priority = 'low';
    }
    
    if (!priority) continue;
    
    // 改善点を抽出
    const improvementMatches = section.matchAll(/^###\s+(\d+)\.\s+(.+?)$([\s\S]*?)(?=^###\s+\d+\.|$)/gm);
    
    for (const match of improvementMatches) {
      const [, number, title, body] = match;
      const locationMatch = body.match(/\*\*場所\*\*:\s*`([^`]+)`/);
      const descriptionMatch = body.match(/- ([\s\S]+?)(?=\n- \*\*修正\*\*:|$)/);
      const fixMatch = body.match(/\*\*修正\*\*:\s*([\s\S]+?)(?=\n|$)/);
      
      if (locationMatch && descriptionMatch && fixMatch) {
        improvements.push({
          priority,
          title: title.trim(),
          location: locationMatch[1].trim(),
          description: descriptionMatch[1].trim(),
          fix: fixMatch[1].trim(),
          raw: match[0]
        });
      }
    }
  }
  
  return improvements;
}

/**
 * 優先度順に改善点を選択
 */
function selectImprovements(improvements: Improvement[], maxCount: number): Improvement[] {
  const high = improvements.filter(i => i.priority === 'high');
  const medium = improvements.filter(i => i.priority === 'medium');
  const low = improvements.filter(i => i.priority === 'low');
  
  const selected: Improvement[] = [];
  
  // 高優先度から順に選択
  selected.push(...high.slice(0, maxCount));
  if (selected.length < maxCount) {
    selected.push(...medium.slice(0, maxCount - selected.length));
  }
  if (selected.length < maxCount) {
    selected.push(...low.slice(0, maxCount - selected.length));
  }
  
  return selected.slice(0, maxCount);
}

/**
 * 簡単な改善を直接適用
 */
function applySimpleFix(improvement: Improvement): boolean {
  const [filePath, lineStr] = improvement.location.split(':');
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const lineNum = parseInt(lineStr) - 1;
  
  if (isNaN(lineNum) || lineNum < 0 || lineNum >= lines.length) {
    return false;
  }
  
  // 簡単な修正パターン
  const simplePatterns = [
    { pattern: /\/\/\s*TODO/, fix: (line: string) => line.replace(/\/\/\s*TODO.*/, '') },
    { pattern: /console\.log/, fix: (line: string) => line.replace(/console\.log\([^)]*\);?/, '') },
    { pattern: /^\s*$/, fix: (line: string) => null }, // 空行削除
  ];
  
  for (const { pattern, fix } of simplePatterns) {
    if (pattern.test(lines[lineNum])) {
      const fixed = fix(lines[lineNum]);
      if (fixed === null) {
        lines.splice(lineNum, 1);
      } else {
        lines[lineNum] = fixed;
      }
      fs.writeFileSync(fullPath, lines.join('\n'));
      console.log(`Applied simple fix to ${filePath}:${lineNum + 1}`);
      return true;
    }
  }
  
  return false;
}

/**
 * AIを使用して改善を生成
 */
async function generateImprovement(improvement: Improvement): Promise<string | null> {
  try {
    const prompt = `以下のコード改善を実装してください。

場所: ${improvement.location}
問題: ${improvement.description}
修正方法: ${improvement.fix}

現在のファイルの内容を読み取り、指定された修正を適用してください。
修正後の完全なコードを返してください。説明は不要です。`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a code improvement assistant. Apply the requested improvements to the code and return the complete fixed code.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    console.error(`Error generating improvement: ${error}`);
    return null;
  }
}

/**
 * 改善を適用
 */
async function applyImprovement(improvement: Improvement): Promise<boolean> {
  console.log(`\nProcessing: ${improvement.title}`);
  console.log(`Location: ${improvement.location}`);
  
  // 簡単な修正を試す
  if (applySimpleFix(improvement)) {
    return true;
  }
  
  // AIで生成
  const [filePath] = improvement.location.split(':');
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }
  
  const currentContent = fs.readFileSync(fullPath, 'utf-8');
  const improvedCode = await generateImprovement(improvement);
  
  if (improvedCode) {
    // コードブロックから抽出
    const codeMatch = improvedCode.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1] : improvedCode;
    
    fs.writeFileSync(fullPath, code);
    console.log(`Applied improvement to ${filePath}`);
    return true;
  }
  
  return false;
}

/**
 * メイン処理
 */
async function main() {
  console.log('Starting auto-improve process...');
  
  const improvementsPath = path.join(process.cwd(), 'CODE_IMPROVEMENTS.md');
  
  if (!fs.existsSync(improvementsPath)) {
    console.log('CODE_IMPROVEMENTS.md not found. Creating template...');
    const template = `# コード改善点リスト

## 🔴 高優先度（即座に修正すべき）

### 1. 改善例
**場所**: \`src/example.ts:10\`
- 問題の説明
- **修正**: 修正方法の説明

## 🟡 中優先度（パフォーマンス・UX改善）

### 2. パフォーマンス改善
**場所**: \`src/utils.ts:15\`
- 毎回計算しているが、メモ化できる
- **修正**: キャッシュを使用

## 🟢 低優先度（コード品質・保守性）

### 3. コード品質
**場所**: \`src/constants.ts\`
- マジックナンバーが散在している
- **修正**: 定数として一元管理
`;
    fs.writeFileSync(improvementsPath, template);
    console.log('Template created. Please add improvements to CODE_IMPROVEMENTS.md');
    return;
  }
  
  const allImprovements = parseImprovements(improvementsPath);
  console.log(`Found ${allImprovements.length} improvements`);
  
  if (allImprovements.length === 0) {
    console.log('No improvements found.');
    return;
  }
  
  const selectedImprovements = selectImprovements(allImprovements, 3);
  console.log(`Selected ${selectedImprovements.length} improvements to process`);
  
  let hasChanges = false;
  
  for (const improvement of selectedImprovements) {
    const applied = await applyImprovement(improvement);
    if (applied) {
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    console.log('\nChanges applied.');
  } else {
    console.log('\nNo changes applied.');
  }
  
  console.log('Auto-improve process completed.');
}

main().catch(console.error);

