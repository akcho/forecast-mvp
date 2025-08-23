# Netflo - AI-Powered Financial Forecasting Platform

**Intelligent financial forecasting for growing businesses using real QuickBooks data and AI-driven insights.**

![Version](https://img.shields.io/badge/version-v1.0-blue)
![Status](https://img.shields.io/badge/status-production--ready-green)
![Next.js](https://img.shields.io/badge/Next.js-14.1.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 🚀 Overview

Netflo transforms financial forecasting for small and medium businesses by automatically discovering key business drivers from QuickBooks data and generating intelligent forecasts using AI. No more complex spreadsheets or guesswork – get actionable insights in minutes.

### ✨ Key Features

- **🔍 Automatic Driver Discovery**: AI analyzes your QuickBooks data to identify the 5-15 most important financial drivers
- **📈 Intelligent Forecasting**: Generate 3-scenario forecasts (Baseline/Growth/Downturn) based on real data patterns
- **💡 Smart Insights**: Get contextual warnings, opportunities, and recommendations powered by machine learning
- **🔗 QuickBooks Integration**: Seamless OAuth2 connection with multi-company support and automatic token refresh
- **👥 Team Collaboration**: Multi-user access with role-based permissions (admin/viewer)
- **📊 Interactive Dashboard**: Modern, responsive UI with real-time charts and driver controls
- **🤖 AI Chat Assistant**: Natural language financial analysis with GPT-powered insights

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI/UX**: Tailwind CSS, Tremor React, Heroicons
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with Google OAuth
- **Integrations**: QuickBooks Online API, OpenAI API
- **Deployment**: Vercel-ready

## 🏗 Architecture

### Core Services (`/src/lib/services/`)
- **DriverDiscoveryService**: Analyzes QB data to identify key business drivers using statistical algorithms
- **ForecastService**: Generates multi-scenario forecasts with confidence intervals
- **InsightEngine**: AI-powered analysis detecting anomalies, trends, and opportunities
- **FinancialDataParser**: Robust QB report parsing with date range handling
- **DataValidator**: Ensures data quality and consistency

### Key Components (`/src/components/`)
- **DriverDiscoveryUI**: Interactive dashboard showing discovered drivers and insights
- **ForecastDashboard**: Main forecasting interface with driver controls
- **PageHeader**: Unified navigation with context-aware controls
- **QuickBooksLogin**: Professional OAuth integration
- **AppLayout**: Responsive layout with sidebar navigation

## 📋 Current Status (August 2025)

### ✅ Completed Features

#### Core Platform
- ✅ **QuickBooks Integration**: Full OAuth2 with automatic token refresh and multi-company support
- ✅ **Google Authentication**: Secure user management with role-based access control
- ✅ **Data Pipeline**: Robust parsing of QB financial reports with error handling
- ✅ **Driver Discovery**: AI-powered identification of key business drivers using materiality, predictability, and correlation analysis
- ✅ **Smart Forecasting**: Multi-scenario projections based on historical patterns and business age
- ✅ **Intelligent Insights**: Context-aware analysis that distinguishes new businesses from established ones
- ✅ **Modern UI**: Responsive design with unified page headers and navigation

#### Advanced Features  
- ✅ **Business Age Detection**: Smart analytics that account for operational timeline
- ✅ **Date Range Parsing**: Handles complex QB date formats including partial months
- ✅ **Error Prevention**: Fixed misleading warnings for new businesses
- ✅ **Professional UX**: Clean, SaaS-style interface replacing technical debug views

### 🎯 Key Differentiators

1. **Real Data Focus**: No hardcoded assumptions – all insights derived from actual QB transactions
2. **Business Context**: AI understands business age and lifecycle stage
3. **Driver-Based Approach**: Focus on the 5-15 items that actually matter, not every line item
4. **Transparent Methodology**: Users see exactly why each driver is important
5. **No Setup Required**: Works out of the box with any QuickBooks company

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- QuickBooks Online company
- Google account for authentication

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/akcho/forecast-mvp.git
   cd forecast-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure required variables:
   ```env
   # QuickBooks OAuth
   QB_CLIENT_ID=your_quickbooks_app_id
   QB_CLIENT_SECRET=your_quickbooks_app_secret
   QB_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback
   
   # Google OAuth  
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_random_secret_key
   
   # Optional: OpenAI for AI insights
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 📊 How It Works

### 1. Connect QuickBooks
- One-click OAuth2 connection to QuickBooks Online
- Automatic company detection and data access
- Team members inherit access (no QB account needed)

### 2. Automatic Analysis
- AI analyzes all P&L line items for materiality and patterns
- Identifies 5-15 key drivers that explain 70-90% of business activity
- Calculates confidence scores and forecast reliability

### 3. Generate Forecasts
- Creates Baseline, Growth, and Downturn scenarios
- Accounts for seasonality, trends, and business lifecycle
- Provides confidence intervals and key insights

### 4. Interactive Forecasting
- Adjust driver assumptions with sliders
- See real-time impact on revenue and expenses
- Export forecasts and insights

## 🏢 Use Cases

### Small Business Owners
- **Cash Flow Planning**: Understand when cash will run out
- **Growth Planning**: Model the impact of sales increases
- **Seasonal Businesses**: Account for predictable fluctuations

### Accountants & CFOs  
- **Client Advisory**: Provide data-driven insights to clients
- **Board Reporting**: Generate professional forecast presentations
- **Scenario Planning**: Model different growth strategies

### Investors & Lenders
- **Due Diligence**: Quickly understand business drivers
- **Risk Assessment**: Analyze forecast reliability and assumptions
- **Performance Tracking**: Monitor actual vs projected performance

## 🛣 Roadmap

### Phase 1: Enhanced Analytics (Q4 2025)
- [ ] Custom time periods and seasonal adjustments
- [ ] Industry benchmarking and comparisons
- [ ] Advanced anomaly detection

### Phase 2: Collaboration Features (Q1 2026)
- [ ] Shared forecast scenarios and comments
- [ ] Email alerts for key metric changes
- [ ] PDF export and presentation modes

### Phase 3: Platform Expansion (Q2 2026)  
- [ ] Xero and other accounting platform integrations
- [ ] API access for third-party tools
- [ ] White-label solutions for accounting firms

## 📚 Documentation

- **[Setup Guide](docs/setup/SETUP_ENV.md)** - Detailed environment configuration
- **[Architecture Overview](docs/README.md)** - Technical documentation
- **[API Reference](docs/api/)** - Endpoint documentation  
- **[Driver Discovery](docs/design/DRIVER_DISCOVERY_DESIGN.md)** - Algorithm details

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint checking
npm run test     # Run test suite
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **QuickBooks Developer Program** for robust financial data APIs
- **OpenAI** for GPT-powered insights and analysis
- **Supabase** for reliable backend infrastructure
- **Tremor** for beautiful data visualization components

---

**Built with ❤️ for growing businesses**

[Website](https://netflo.ai) • [Documentation](docs/) • [Issues](https://github.com/akcho/forecast-mvp/issues) • [Discussions](https://github.com/akcho/forecast-mvp/discussions)