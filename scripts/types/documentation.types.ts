/**
 * 文档系统类型定义
 */

export interface DocumentMetadata {
  title: string;
  description: string;
  version: string;
  lastUpdated: Date;
  author: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
  prerequisites: string[];
  relatedModules: string[];
}

export interface ModuleOverview {
  name: string;
  description: string;
  coreFeatures: string[];
  techStack: string[];
}

export interface ModuleFeature {
  name: string;
  description: string;
  implementation: string;
  benefits: string[];
  diagram?: string;
}

export interface ConfigurationSection {
  envVariables: Record<string, string>;
  moduleConfig: object;
  dependencyConfig: string;
}

export interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  requestSchema: object;
  responseSchema: object;
  examples: RequestResponseExample[];
  errorCodes: ErrorCode[];
}

export interface RequestResponseExample {
  title: string;
  request: object;
  response: object;
}

export interface ErrorCode {
  code: number;
  message: string;
  description: string;
}

export interface APIReference {
  baseUrl: string;
  authMethod: string;
  endpoints: APIEndpoint[];
  dataModels: DataModel[];
}

export interface DataModel {
  name: string;
  schema: object;
  description: string;
}

export interface CodeExample {
  title: string;
  description: string;
  language: string;
  code: string;
  explanation: string;
}

export interface ExampleSection {
  category: string;
  examples: CodeExample[];
}

export interface BestPractice {
  title: string;
  description: string;
  example?: string;
  benefits: string[];
}

export interface BestPracticeSection {
  recommendations: BestPractice[];
  performanceTips: string[];
  securityNotes: string[];
}

export interface TestingSection {
  unitTests: CodeExample[];
  integrationTests: CodeExample[];
  performanceTests: string[];
}

export interface TroubleshootingItem {
  problem: string;
  solution: string;
  relatedIssues?: string[];
}

export interface TroubleshootingSection {
  faq: TroubleshootingItem[];
  errorHandling: TroubleshootingItem[];
  debugTips: string[];
}

export interface ResourceSection {
  officialDocs: string[];
  learningResources: string[];
  communityResources: string[];
}

export interface ModuleDocumentation {
  metadata: DocumentMetadata;
  overview: ModuleOverview;
  features: ModuleFeature[];
  configuration: ConfigurationSection;
  apiReference: APIReference;
  examples: ExampleSection[];
  bestPractices: BestPracticeSection;
  testing: TestingSection;
  troubleshooting: TroubleshootingSection;
  resources: ResourceSection;
}

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  section?: string;
  line?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

export interface DocumentationGenerator {
  generateModuleDoc(moduleName: string, moduleInfo: ModuleInfo): Promise<string>;
  generateAPIReference(endpoints: APIEndpoint[]): Promise<string>;
  generateExamples(examples: CodeExample[]): Promise<string>;
  validateDocumentation(docPath: string): Promise<ValidationResult>;
}

export interface ModuleInfo {
  name: string;
  description: string;
  features: ModuleFeature[];
  configuration: ConfigurationSection;
  apiEndpoints: APIEndpoint[];
  examples: CodeExample[];
  bestPractices: BestPractice[];
  troubleshooting: TroubleshootingItem[];
}

export interface DocumentationConfig {
  project: {
    name: string;
    description: string;
    version: string;
    baseUrl: string;
    author: string;
    license: string;
  };
  modules: Record<string, ModuleConfig>;
  templates: {
    moduleTemplate: string;
    apiTemplate: string;
  };
  output: {
    modulesDir: string;
    apiReferenceDir: string;
    examplesDir: string;
    guidesDir: string;
  };
  validation: {
    requiredSections: string[];
    apiRequiredSections: string[];
  };
}

export interface ModuleConfig {
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
  prerequisites: string[];
  techStack: string[];
  apiEndpoints: {
    method: string;
    path: string;
    description: string;
  }[];
}