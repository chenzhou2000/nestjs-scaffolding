# {MODULE_NAME} API 参考

## 概述

{API_OVERVIEW}

## 基础信息

- **基础URL**: `{BASE_URL}`
- **认证方式**: {AUTH_METHOD}
- **内容类型**: `application/json`

## 端点列表

### {ENDPOINT_CATEGORY_1}

#### {ENDPOINT_1_NAME}

```http
{HTTP_METHOD} {ENDPOINT_PATH}
```

**描述**: {ENDPOINT_DESCRIPTION}

**请求参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
{REQUEST_PARAMETERS}

**请求体**:

```json
{REQUEST_BODY_EXAMPLE}
```

**响应**:

```json
{RESPONSE_EXAMPLE}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|--------|--------|------|
{ERROR_RESPONSES}

## 数据模型

### {MODEL_1_NAME}

```typescript
{MODEL_1_SCHEMA}
```

## 使用示例

### JavaScript/TypeScript

```typescript
{JS_EXAMPLE}
```

### cURL

```bash
{CURL_EXAMPLE}
```

## 错误处理

### 通用错误格式

```json
{ERROR_FORMAT}
```

### 错误码说明

{ERROR_CODE_DESCRIPTIONS}

## 限制和配额

{RATE_LIMITS}

## 版本信息

- **当前版本**: {API_VERSION}
- **更新日期**: {LAST_UPDATED}