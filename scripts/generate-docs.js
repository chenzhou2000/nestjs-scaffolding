#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 文档生成器
 * 用于根据模板和配置生成模块文档
 */
class DocumentationGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, '../docs/templates');
    this.outputDir = path.join(__dirname, '../docs');
  }

  /**
   * 生成模块文档
   * @param {string} moduleName - 模块名称
   * @param {object} moduleConfig - 模块配置
   */
  async generateModuleDoc(moduleName, moduleConfig) {
    try {
      const templatePath = path.join(this.templatesDir, 'module-template.md');
      const template = fs.readFileSync(templatePath, 'utf8');
      
      let content = template;
      
      // 替换模板变量
      Object.entries(moduleConfig).forEach(([key, value]) => {
        const placeholder = `{${key.toUpperCase()}}`;
        content = content.replace(new RegExp(placeholder, 'g'), value);
      });
      
      // 输出文件
      const outputPath = path.join(this.outputDir, 'modules', `${moduleName}.md`);
      fs.writeFileSync(outputPath, content);
      
      console.log(`✅ 生成模块文档: ${outputPath}`);
    } catch (error) {
      console.error(`❌ 生成模块文档失败 (${moduleName}):`, error.message);
    }
  }

  /**
   * 生成API参考文档
   * @param {string} moduleName - 模块名称
   * @param {object} apiConfig - API配置
   */
  async generateAPIDoc(moduleName, apiConfig) {
    try {
      const templatePath = path.join(this.templatesDir, 'api-template.md');
      const template = fs.readFileSync(templatePath, 'utf8');
      
      let content = template;
      
      // 替换模板变量
      Object.entries(apiConfig).forEach(([key, value]) => {
        const placeholder = `{${key.toUpperCase()}}`;
        content = content.replace(new RegExp(placeholder, 'g'), value);
      });
      
      // 输出文件
      const outputPath = path.join(this.outputDir, 'api-reference', `${moduleName}-api.md`);
      fs.writeFileSync(outputPath, content);
      
      console.log(`✅ 生成API文档: ${outputPath}`);
    } catch (error) {
      console.error(`❌ 生成API文档失败 (${moduleName}):`, error.message);
    }
  }

  /**
   * 验证文档完整性
   * @param {string} docPath - 文档路径
   */
  validateDocumentation(docPath) {
    try {
      const content = fs.readFileSync(docPath, 'utf8');
      const errors = [];
      
      // 检查必需章节
      const requiredSections = [
        '## 概述',
        '## 功能特性',
        '## 配置说明',
        '## API接口',
        '## 使用示例',
        '## 最佳实践',
        '## 测试指南',
        '## 故障排除'
      ];
      
      requiredSections.forEach(section => {
        if (!content.includes(section)) {
          errors.push(`缺少必需章节: ${section}`);
        }
      });
      
      // 检查未替换的模板变量
      const templateVariables = content.match(/{[A-Z_]+}/g);
      if (templateVariables) {
        errors.push(`存在未替换的模板变量: ${templateVariables.join(', ')}`);
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`文档验证失败: ${error.message}`]
      };
    }
  }

  /**
   * 生成所有文档
   */
  async generateAllDocs() {
    console.log('🚀 开始生成文档...');
    
    // 这里可以添加具体的模块配置
    const modules = [
      'auth', 'users', 'cache', 'queue', 'grpc', 
      'files', 'logging', 'database', 'error-handling', 'health'
    ];
    
    for (const module of modules) {
      console.log(`📝 准备生成 ${module} 模块文档...`);
      // 实际使用时需要提供具体的配置数据
      // await this.generateModuleDoc(module, moduleConfigs[module]);
    }
    
    console.log('✨ 文档生成完成！');
  }
}

// 命令行接口
if (require.main === module) {
  const generator = new DocumentationGenerator();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'generate':
      generator.generateAllDocs();
      break;
    case 'validate':
      const docPath = process.argv[3];
      if (!docPath) {
        console.error('❌ 请提供文档路径');
        process.exit(1);
      }
      const result = generator.validateDocumentation(docPath);
      if (result.isValid) {
        console.log('✅ 文档验证通过');
      } else {
        console.error('❌ 文档验证失败:');
        result.errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
      }
      break;
    default:
      console.log(`
使用方法:
  node scripts/generate-docs.js generate    # 生成所有文档
  node scripts/generate-docs.js validate <path>  # 验证文档
      `);
  }
}

module.exports = DocumentationGenerator;