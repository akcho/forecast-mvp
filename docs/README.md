# Netflo Documentation

This directory contains comprehensive documentation for the Netflo financial forecasting platform.

## Project Status (August 2025)

**🚀 Production Ready** - Complete driver-based forecasting system with AI insights

## Documentation Structure

- **sprints/**: Development sprint planning, progress tracking, and results
- **setup/**: Installation, configuration, and deployment guides  
- **design/**: Architecture documents, research, and design decisions

## Quick Navigation

### Current Implementation Status
- [Sprint 3 Complete](sprints/SPRINT_3_PLAN.md) - ✅ Driver-based forecasting implementation
- [Sprint 2 Results](sprints/SPRINT_2_PROGRESS.md) - ✅ Financial modeling services
- [Sprint 1 Results](sprints/SPRINT_1_RESULTS.md) - ✅ Foundation validation

### Core Features Documentation
- [Driver Discovery Design](design/DRIVER_DISCOVERY_DESIGN.md) - AI-powered business driver identification
- [Forecast Design](FORECAST_DESIGN.md) - Multi-scenario forecasting methodology
- [MVP Blueprint](design/FORECAST_MVP_BLUEPRINT.md) - Overall platform architecture

### Implementation Guides
- [Environment Setup](setup/SETUP_ENV.md) - Complete development environment configuration
- [QuickBooks Integration](setup/QUICKBOOKS_SETUP.md) - OAuth setup and API configuration
- [Google Authentication](setup/GOOGLE_SETUP_INSTRUCTIONS.md) - User authentication setup

### Technical Architecture
- [Analysis Redesign](design/ANALYSIS_REDESIGN.md) - Modern UI architecture decisions
- [GitHub Design Principles](design/GITHUB_DESIGN_PRINCIPLES.md) - Code organization patterns

## Current Features (Live)

### ✅ Core Platform
- **Driver Discovery**: AI analyzes QuickBooks data to identify key business drivers
- **Smart Forecasting**: Multi-scenario projections with confidence scoring
- **Interactive Dashboard**: Real-time driver controls and forecast updates
- **Business Intelligence**: Context-aware insights based on business age and lifecycle

### ✅ QuickBooks Integration
- **OAuth2 Authentication**: Secure, automatic token refresh
- **Multi-Company Support**: Role-based access control
- **Robust Data Parsing**: Handles complex QB date formats and report structures
- **Real-Time Analysis**: No hardcoded assumptions, all insights from live data

### ✅ User Experience
- **Professional Interface**: Clean, SaaS-style UI replacing technical debug views
- **Responsive Design**: Mobile-optimized with unified navigation
- **AI Chat Assistant**: Natural language financial analysis
- **Contextual Insights**: Smart warnings that understand business context

## Development Workflow

1. **Environment Setup**: Follow [setup guides](setup/) for local development
2. **Architecture Review**: Understand [design decisions](design/) and patterns
3. **Feature Development**: Reference [sprint documentation](sprints/) for context
4. **Testing**: Use built-in test suite and validation endpoints

## API Documentation

### Core Endpoints
- `/api/quickbooks/discover-drivers` - Driver discovery and analysis
- `/api/quickbooks/generate-forecast` - Interactive forecasting with adjustments
- `/api/quickbooks/profit-loss?parsed=true` - Structured financial data
- `/api/test/*` - Comprehensive validation and debugging endpoints

### Service Architecture
- **DriverDiscoveryService**: Business driver identification with statistical scoring
- **ForecastService**: Multi-scenario projection generation
- **InsightEngine**: AI-powered analysis and recommendations
- **FinancialDataParser**: Robust QB data processing with error handling

## Contributing

See individual sprint documentation for detailed technical context and implementation guidelines.

## Support

For questions about specific implementations, refer to:
- **Technical Issues**: Check [sprint progress docs](sprints/)
- **Setup Problems**: Review [configuration guides](setup/)
- **Architecture Questions**: See [design documents](design/)