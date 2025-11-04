# 📊 MarginMap

**AI-Powered Profit Intelligence for CPG & Retail**

MarginMap is an enterprise-grade analytics platform that automatically detects margin leakage, pricing inefficiencies, and SKU underperformance — delivering actionable AI recommendations to boost profitability.

**Latest Update:** Production-ready deployment with complete AI recommendation engine, beautiful UI, and smart data ingestion.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## 🚀 Live Demo

**Production URL:** [https://marginmap.onrender.com](https://marginmap.onrender.com)

**Demo Credentials:**
- Email: `analyst@marginmap.io`
- Password: `demo123`

---

## ✨ Features

### 📈 Executive Dashboard
Real-time visibility into:
- Total Revenue & COGS
- Gross Margin % and Profit $
- Margin Leakage Detection
- Margin Trend Visualization
- Top Low-Margin SKUs & Customers

### 📦 SKU Profitability Explorer
Drill down to every product:
- Revenue, units sold, and margin % per SKU
- Return rates and discount analysis
- Customer and regional performance breakdown
- Flag SKUs below target margin thresholds

### 👥 Customer Profitability Analysis
Analyze margin by customer or channel:
- Blended margin % per customer
- Margin leakage from discounts and returns
- Top SKUs by revenue and margin
- Customer-level pricing opportunities

### ⚡ AI Recommendation Engine
Auto-generated, ranked action items:
- Pricing adjustments ranked by dollar impact
- Discount reduction opportunities
- Return rate investigation alerts
- Customer-specific renegotiation suggestions

### ⬆️ Smart Data Upload
Seamless CSV/Excel ingestion:
- Automatic column mapping
- Validation and error handling
- Support for 50MB+ files
- Upload history and audit trail

---

## 🏗️ Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** SQLite (production) / MySQL compatible
- **Authentication:** Express Session + bcrypt
- **File Processing:** Multer, csv-parse, xlsx

### Frontend
- **UI Framework:** Vanilla JavaScript (ES6 modules)
- **Styling:** Custom CSS with modern design system
- **Charts:** Chart.js
- **Design:** Gradient accents, smooth animations, responsive grid

### Infrastructure
- **Deployment:** Render.com
- **CI/CD:** Git-based auto-deploy
- **Database:** Persistent disk storage
- **Security:** Helmet, session management, input validation

---

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/frankparkerlee-debug/marginmap.git
cd marginmap
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-secret-key-here
DATABASE_PATH=./data/marginmap.db
UPLOAD_DIR=./storage/uploads
TARGET_MARGIN_PERCENT=55
```

4. **Initialize database**
```bash
npm run migrate
```

5. **Seed demo data**
```bash
npm run seed
```

6. **Start the server**
```bash
npm start
```

7. **Access the application**
```
http://localhost:3000
```

Login with demo credentials:
- Email: `analyst@marginmap.io`
- Password: `demo123`

---

## 🚢 Deployment to Render

### Option 1: Deploy Button
Click the "Deploy to Render" button at the top of this README.

### Option 2: Manual Deployment

1. **Create a new Web Service on Render**
2. **Connect your GitHub repository**
3. **Configure build settings:**
   - **Build Command:** `npm install && npm run migrate && npm run seed`
   - **Start Command:** `npm start`
4. **Set environment variables:**
   - `NODE_ENV=production`
   - `SESSION_SECRET=<generate-random-string>`
   - `DATABASE_PATH=./data/marginmap.db`
   - `TARGET_MARGIN_PERCENT=55`

5. **Deploy!**

Your app will be live at: `https://marginmap.onrender.com`

---

## 📊 Database Schema

### Tables

**users**
- User authentication and roles
- Supports multiple analysts

**transactions**
- Core transaction data (date, customer, SKU, pricing, costs)
- Supports discounts, returns, and regional data

**recommendations**
- AI-generated profit improvement actions
- Ranked by dollar impact
- Track status (open, completed, dismissed)

**uploads**
- Upload history and audit trail
- Processing status tracking

**settings**
- Configurable parameters (target margins, currency)

---

## 📋 Data Upload Format

### Required Columns
- `date` - Transaction date (YYYY-MM-DD)
- `customer_name` - Customer or channel name
- `sku_code` - Product SKU identifier
- `sku_name` - Product display name
- `qty_sold` - Quantity sold
- `unit_cost` - Cost per unit ($)
- `unit_price` - Sale price per unit ($)

### Optional Columns
- `invoice_id` - Invoice/order identifier
- `region` - Geographic region
- `category` - Product category
- `unit_discount` - Discount per unit ($)
- `returned_units` - Number of units returned

### Example CSV
```csv
date,customer_name,sku_code,sku_name,category,qty_sold,unit_cost,unit_price,unit_discount,returned_units,region
2024-01-15,Walmart,SKU-2401,SparkleClean 12-Pack,Cleaning,240,3.20,7.50,0.25,5,Northeast
2024-01-16,Target,SKU-2401,SparkleClean 12-Pack,Cleaning,180,3.20,7.50,0.50,3,Midwest
```

---

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Dashboard
- `GET /api/dashboard` - Get dashboard metrics

### SKU Analysis
- `GET /api/sku` - Get all SKUs with metrics
- `GET /api/sku/:skuCode` - Get specific SKU details

### Customer Analysis
- `GET /api/customers` - Get all customers with metrics
- `GET /api/customers/:customerName` - Get specific customer details

### Recommendations
- `GET /api/actions` - Get active recommendations
- `POST /api/actions/generate` - Generate new recommendations
- `PATCH /api/actions/:id` - Update recommendation status

### Upload
- `POST /api/upload` - Upload and process data file
- `GET /api/upload/history` - Get upload history

---

## 🎨 Design System

### Colors
- **Primary Gradient:** `#0ea5e9` → `#06b6d4` (Cyan)
- **Text Primary:** `#1a1a2e` (Dark Navy)
- **Text Secondary:** `#64748b` (Slate Gray)
- **Background:** `#fafbfc` (Off White)
- **Success:** `#10b981` (Green)
- **Warning:** `#f59e0b` (Amber)
- **Critical:** `#ef4444` (Red)

### Typography
- **Font Family:** Inter, -apple-system, BlinkMacSystemFont
- **Headings:** 800 weight, tight line-height
- **Body:** 400-600 weight, 1.6 line-height

### Components
- **Border Radius:** 12-16px for cards, 8px for elements
- **Shadows:** Subtle elevation with hover animations
- **Transitions:** 0.2s ease for all interactions

---

## 🧪 Example Use Cases

### 1. Detect Low-Margin SKUs
Upload transaction data → Navigate to SKU Explorer → Identify products below 55% margin → See AI recommendations to increase pricing.

### 2. Analyze Customer Profitability
Go to Customers page → Find accounts with margin erosion → Review leakage from discounts/returns → Get specific renegotiation suggestions.

### 3. Track Margin Trends
Dashboard shows daily margin % over time → Identify downward trends → Drill into specific dates → Find root causes (discounts, returns, cost changes).

### 4. Generate AI Actions
Upload new data → Click "Generate Recommendations" → Review ranked list of profit improvements → Mark actions complete as implemented.

---

## 🔒 Security

- **Password Hashing:** bcrypt with salt rounds
- **Session Management:** Secure HTTP-only cookies
- **Input Validation:** All uploads validated and sanitized
- **Helmet.js:** Security headers (CSP, XSS protection)
- **File Upload Limits:** 50MB max, type validation

---

## 📈 Roadmap

- [ ] Multi-tenant support
- [ ] Advanced filtering and search
- [ ] PDF report generation
- [ ] Email alerts for margin drops
- [ ] Integration with QuickBooks, Shopify
- [ ] Predictive margin forecasting (ML)
- [ ] Custom dashboard widgets
- [ ] Role-based access control (RBAC)

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙋‍♂️ Support

For questions, issues, or feature requests:
- **GitHub Issues:** [Create an issue](https://github.com/frankparkerlee-debug/marginmap/issues)
- **Email:** support@marginmap.io

---

## 🎯 Mission

**MarginMap exists to turn margin data into competitive advantage.**

We believe every CPG and retail brand deserves enterprise-grade profit intelligence — without the enterprise price tag.

Built with ❤️ by the MarginMap team.

---

**Ready to recover hidden profit?** [Get Started →](https://marginmap.onrender.com)
