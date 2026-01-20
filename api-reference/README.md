# ElasticFunnels API Documentation

Complete API documentation for the ElasticFunnels platform.

## What's Documented

### Getting Started
- **Introduction** - Overview of the API and how to get started
- **Quick Start** - 5-minute setup guide with common use cases
- **Authentication** - API key generation and usage
- **Errors & Status Codes** - Understanding error responses

### Endpoints

#### Core Resources
- **Brands (Projects)** - Manage projects and retrieve project information
- **Pages** - Create, update, and manage landing pages
- **Products** - Product and SKU management
- **Funnels** - Sales funnel configuration and management

#### E-commerce & Support
- **Conversions** - Order management, refunds, and conversion tracking
- **Tickets** - Support ticket management with AI-powered replies

#### Analytics
- **Analytics** - Comprehensive metrics and performance tracking
  - Available metrics configuration
  - Metrics data retrieval with date ranges and filters
  - Analytics cards (video analytics, fulfillment metrics)
  - Grouped metrics (by product, page, affiliate, date, etc.)
  - Custom metric formulas
  - Export capabilities

## Key Features

### Authentication
- API key-based authentication via `EF-Access-Key` header
- Keys inherit user permissions for the project
- Support for both `userAccess` and `brandAccess` middleware

### Data Access
- RESTful API design
- JSON request/response format
- Pagination for list endpoints
- Filtering and search capabilities
- Date range queries with timezone support

### Analytics Engine
- Support for both Elasticsearch and ClickHouse backends
- Real-time metrics calculation
- Custom metric formulas
- Compound grouping (multiple dimensions)
- Permission-aware metric filtering

### Export Capabilities
- CSV and Excel export options
- Async export processing with email notification
- Customizable field selection

## Code Examples

All endpoints include code examples in:
- cURL
- JavaScript (fetch)
- Python (requests)
- PHP (cURL)

## Best Practices

1. **Store API keys securely** - Use environment variables, never commit to version control
2. **Handle errors properly** - Implement retry logic with exponential backoff
3. **Use appropriate filters** - Reduce payload size and improve performance
4. **Batch requests** - Fetch multiple items in single requests when possible
5. **Cache responses** - Cache data that doesn't change frequently

## Module Requirements

Some endpoints and metrics require specific modules to be enabled:
- `conversions` - Order and sales data
- `tracking` - Page views and session data
- `pages` - Landing page management
- `products` - Product catalog
- `videos` - Video analytics
- `tickets` - Support tickets
- `affiliates` - Affiliate management (permission-restricted)

## Rate Limiting

While not strictly enforced, follow these guidelines:
- Maximum 60 requests per minute per API key
- Use pagination for large datasets
- Implement exponential backoff for retries
- Cache responses when appropriate

## Support

For API support:
- Email: support@elasticfunnels.io
- Dashboard: https://app.elasticfunnels.io

## Changelog

### Latest Updates
- Added Tickets endpoints with AI reply generation
- Enhanced Analytics documentation with accurate implementation details
- Added compound grouping support
- Documented custom metric formulas
- Added export endpoints
- Improved error response documentation

