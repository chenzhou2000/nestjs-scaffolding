#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * 文档验证器
 * 用于验证文档的完整性和质量
 */
class DocumentationValidator {
  constructor() {
    this.docsDir = path.join(__dirname, '../docs');
  }

  /**
   * 验证模块文档完整性
   * @param {string} docPath - 文档路径
   */
  validateModuleDoc(docPath) {
    const content = fs.readFileSync(docPath, 'utf8');
    const errors = [];
    const warnings = [];

    // 检查必需章节
    const requiredSections = [
      '## 概述',
      '## 功能特性', 
      '## 配置说明',
      '## API接口',
      '## 使用示例',
      '## 最佳实践',
      '## 测试指南',
      '## 故障排除',
      '## 相关资源'
    ];

    requiredSections.forEach(section => {
      if (!content.includes(section)) {
        errors.push(`缺少必需章节: ${section}`);
      }
    });

    // 检查代码块
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    if (codeBlocks.length === 0) {
      warnings.push('文档中没有代码示例');
    }

    // 检查链接
    const links = content.match(/\[.*?\]\(.*?\)/g) || [];
    links.forEach(link => {
      const url = link.match(/\((.*?)\)/)[1];
      if (url.startsWith('./') || url.startsWith('../')) {
        const linkPath = path.resolve(path.dirname(docPath), url);
        if (!fs.existsSync(linkPath)) {
          errors.push(`无效的内部链接: ${url}`);
        }
      }
    });

    // 检查图表
    const mermaidDiagrams = content.match(/```mermaid[\s\S]*?```/g) || [];
    if (mermaidDiagrams.length === 0) {
      warnings.push('建议添加架构图或流程图');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证API文档完整性
   * @param {string} docPath - API文档路径
   */
  validateAPIDoc(docPath) {
    const content = fs.readFileSync(docPath, 'utf8');
    const errors = [];
    const warnings = [];

    // 检查API文档必需章节
    const requiredSections = [
      '## 概述',
      '## 基础信息',
      '## 端点列表',
      '## 数据模型',
      '## 使用示例',
      '## 错误处理'
    ];

    requiredSections.forEach(section => {
      if (!content.includes(section)) {
        errors.push(`缺少必需章节: ${section}`);
      }
    });

    // 检查HTTP方法
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const hasHttpMethods = httpMethods.some(method => content.includes(method));
    if (!hasHttpMethods) {
      warnings.push('未找到HTTP方法定义');
    }

    // 检查JSON示例
    const jsonBlocks = content.match(/```json[\s\S]*?```/g) || [];
    if (jsonBlocks.length === 0) {
      warnings.push('建议添加JSON请求/响应示例');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证所有文档
   */
  validateAllDocs() {
    console.log('🔍 开始验证文档...\n');

    let totalErrors = 0;
    let totalWarnings = 0;

    // 验证模块文档
    const moduleDocsPattern = path.join(this.docsDir, 'modules/*.md');
    const moduleDocs = glob.sync(moduleDocsPattern);

    console.log('📋 验证模块文档:');
    moduleDocs.forEach(docPath => {
      const fileName = path.basename(docPath);
      const result = this.validateModuleDoc(docPath);
      
      if (result.isValid) {
        console.log(`  ✅ ${fileName}`);
      } else {
        console.log(`  ❌ ${fileName}`);
        result.errors.forEach(error => {
          console.log(`    - ${error}`);
          totalErrors++;
        });
      }
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          console.log(`    ⚠️  ${warning}`);
          totalWarnings++;
        });
      }
    });

    // 验证API文档
    const apiDocsPattern = path.join(this.docsDir, 'api-reference/*.md');
    const apiDocs = glob.sync(apiDocsPattern);

    console.log('\n🔌 验证API文档:');
    apiDocs.forEach(docPath => {
      const fileName = path.basename(docPath);
      const result = this.validateAPIDoc(docPath);
      
      if (result.isValid) {
        console.log(`  ✅ ${fileName}`);
      } else {
        console.log(`  ❌ ${fileName}`);
        result.errors.forEach(error => {
          console.log(`    - ${error}`);
          totalErrors++;
        });
      }
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          console.log(`    ⚠️  ${warning}`);
          totalWarnings++;
        });
      }
    });

    // 总结
    console.log('\n📊 验证结果:');
    console.log(`  错误: ${totalErrors}`);
    console.log(`  警告: ${totalWarnings}`);
    
    if (totalErrors === 0) {
      console.log('  ✨ 所有文档验证通过！');
      return true;
    } else {
      console.log('  ❌ 发现文档问题，请修复后重新验证');
      return false;
    }
  }

  /**
   * 检查文档覆盖率
   */
  checkDocumentationCoverage() {
    const expectedModules = [
      'auth', 'users', 'cache', 'queue', 'grpc',
      'files', 'logging', 'database', 'error-handling', 'health'
    ];

    const existingDocs = fs.readdirSync(path.join(this.docsDir, 'modules'))
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));

    const missingDocs = expectedModules.filter(module => !existingDocs.includes(module));
    
    console.log('📈 文档覆盖率检查:');
    console.log(`  已完成: ${existingDocs.length}/${expectedModules.length}`);
    console.log(`  覆盖率: ${Math.round(existingDocs.length / expectedModules.length * 100)}%`);
    
    if (missingDocs.length > 0) {
      console.log(`  缺失文档: ${missingDocs.join(', ')}`);
    }

    return {
      total: expectedModules.length,
      completed: existingDocs.length,
      missing: missingDocs,
      coverage: existingDocs.length / expectedModules.length
    };
  }
}

// 命令行接口
if (require.main === module) {
  const validator = new DocumentationValidator();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'validate':
      const isValid = validator.validateAllDocs();
      process.exit(isValid ? 0 : 1);
      break;
    case 'coverage':
      validator.checkDocumentationCoverage();
      break;
    default:
      console.log(`
使用方法:
  node scripts/validate-docs.js validate   # 验证所有文档
  node scripts/validate-docs.js coverage   # 检查文档覆盖率
      `);
  }
}

module.exports = DocumentationValidator;