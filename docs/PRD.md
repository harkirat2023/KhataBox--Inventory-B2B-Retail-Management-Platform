## **Product Requirements Document (PRD)** 

## **KhataBox** 

**Inventory & B2B Retail Management Platform** 

## **1. Product Overview** 

## **Product Name** 

## **KhataBox** 

## **Product Vision** 

Enable small and medium retailers to manage inventory, billing, suppliers, and demand forecasting from a single intelligent platform while reducing stockouts, overstocking, and manual paperwork. 

## **Problem Statement** 

Independent retailers and wholesalers often rely on spreadsheets, notebooks, or disconnected software solutions to manage inventory and sales. 

This results in: 

- Frequent stock shortages 

- Overstocking and capital blockage 

- Manual billing errors 

- Poor supplier coordination 

- Lack of sales forecasting 

- Limited business insights 

KhataBox aims to provide an affordable, AI-powered inventory management platform designed specifically for small businesses. 

## **2. Goals** 

## **Business Goals** 

- Digitize inventory management for SMEs. 

- Reduce stockout incidents by 30%. 

- 

- Improve inventory turnover. 

- 

- Increase customer retention through better order management. 

- Provide AI-driven restocking recommendations. 

- 

1 

## **Product Goals** 

- Real-time inventory visibility. 

- Automated billing and invoicing. 

- Accurate demand forecasting. 

- Centralized supplier management. 

- Actionable analytics dashboard. 

## **3. Target Users** 

## **Primary Users** 

## **Independent Shopkeepers** 

Examples: 

- Grocery Stores 

- Electronics Shops 

- Medical Stores 

- Textile Shops 

## **Small Wholesalers** 

Examples: 

- FMCG Distributors 

- Electronics Distributors 

- Pharma Suppliers 

## **Multi-Shop Owners** 

Businesses managing: 

- 2â€“10 retail outlets 

## **4. User Personas** 

## **Shopkeeper** 

## **Pain Points** 

- Manual inventory tracking 

- Lost sales due to stockouts 

- Difficult billing process 

2 

## **Goals** 

- Manage stock efficiently 

- Generate invoices quickly 

- Receive low-stock alerts 

## **B2B Customer** 

## **Pain Points** 

- Difficult ordering process 

- Lack of price transparency 

## **Goals** 

- Browse products 

- Place bulk orders 

- Access invoices anytime 

## **Administrator** 

## **Pain Points** 

- Limited visibility into business performance 

## **Goals** 

- Monitor users 

- Track sales and inventory 

- Analyze platform usage 

## **5. User Stories** 

## **Authentication** 

## **Shopkeeper** 

- As a shopkeeper, I want to securely log in so that I can manage my inventory. 

## **Customer** 

- As a customer, I want to create an account and place orders. 

## **Admin** 

- As an admin, I want to manage platform users and permissions. 

3 

## **Inventory Management** 

- As a shopkeeper, I want to add products with SKU, category, and pricing. 

- As a shopkeeper, I want to track stock levels in real time. 

- As a shopkeeper, I want to receive low-stock alerts. 

- As a shopkeeper, I want to manage inventory across multiple stores. 

## **Billing** 

- As a cashier, I want to scan a QR code and instantly add products to the bill. â€¢ As a shopkeeper, I want invoices generated automatically. 

- As a customer, I want to download my invoice. 

## **Forecasting** 

- As a shopkeeper, I want weekly demand predictions. 

- As a shopkeeper, I want confidence scores for predictions. 

- As a shopkeeper, I want restocking recommendations. 

## **Supplier Management** 

- As a shopkeeper, I want to create purchase orders. 

- As a shopkeeper, I want to compare supplier prices. 

## **Reporting** 

- As a shopkeeper, I want to view sales trends. 

- As a shopkeeper, I want profit and loss reports. 

- As a shopkeeper, I want inventory valuation reports. 

## **6. Functional Requirements** 

## **Module 1: Authentication & Authorization** 

## **Features** 

- JWT Authentication 

- Refresh Tokens 

- Password Encryption 

- Role-Based Access Control 

4 

## **Roles** 

## **Shopkeeper** 

Access: 

- Inventory 

- Billing 

- Reports 

- Suppliers 

## **Customer** 

Access: 

- Product Catalog 

- Orders 

- Invoices 

## **Admin** 

Access: 

- User Management â€¢ System Analytics 

- Audit Logs 

## **Module 2: Inventory Management** 

## **Product Management** 

Fields: 

- Product Name â€¢ SKU 

- Category 

- Brand â€¢ Description â€¢ Cost Price â€¢ Selling Price 

- Stock Quantity 

- Reorder Threshold 

## **Features** 

- Create Product 

- Update Product 

- Delete Product 

- Bulk Import 

5 

â€¢ Product Search 

## **Inventory Tracking** 

## **Features** 

- Live Stock Updates 

- Inventory Movements 

- Stock History 

- Multi-Store Inventory 

## **Expiry Tracking** 

Fields: 

- Batch Number 

- Manufacturing Date 

- Expiry Date 

## **Alerts** 

- 90-Day Alert 

- 60-Day Alert 

- 30-Day Alert 

## **QR Code Management** 

## **Features** 

- Generate QR Code 

- Print QR Labels 

- Scan Product 

## **Module 3: Billing & Orders** 

## **QR Billing** 

Workflow: 

1. Scan Product 

2. Auto Fetch Product 

3. Add To Cart 

4. Generate Bill 

6 

## **Invoice Generation** 

Features: 

- PDF Export 

- GST Calculation 

- Discount Handling 

- Tax Breakdown 

## **Order Management** 

Statuses: 

- Pending â€¢ Confirmed 

- Processing 

- Completed 

- Cancelled 

## **Payments** 

Supported Modes: 

- Cash â€¢ UPI â€¢ Credit 

- Bank Transfer 

## **Module 4: AI Demand Forecasting** 

## **Objective** 

Predict future inventory demand using historical sales data. 

## **Machine Learning Model** 

## **Algorithm** 

Random Forest Regressor 

## **Inputs** 

- Historical Sales 

- Product Category 

7 

- Day of Week 

- Month 

- Seasonal Trends 

- Holidays 

## **Outputs** 

- Weekly Demand Prediction â€¢ Recommended Reorder Quantity â€¢ Confidence Score 

## **Forecast Dashboard** 

Display: 

- Predicted Demand 

- Current Stock 

- Recommended Purchase Quantity 

- Prediction Accuracy 

## **Module 5: Supplier Management** 

## **Supplier Database** 

Fields: 

- Supplier Name 

- Contact Person 

- Email 

- Phone 

- Address 

## **Purchase Orders** 

Features: 

- Create PO 

- Edit PO 

- Track PO Status 

- Supplier-wise Orders 

8 

## **Price Analysis** 

Show: 

- Supplier Price 

- Selling Price 

- Margin % 

## **Module 6: B2B Customer Management** 

## **Customer Accounts** 

Fields: 

- Company Name 

- Contact Person 

- GST Number 

- Credit Limit 

## **Features** 

- Tier-Based Pricing 

- Credit Tracking 

- Bulk Orders 

- Customer Purchase History 

## **Module 7: Reports & Analytics** 

## **Sales Reports** 

- Daily Sales 

- Weekly Sales 

- Monthly Sales 

- Yearly Sales 

## **Inventory Reports** 

- Stock Valuation 

- Inventory Turnover 

- Dead Stock Analysis 

9 

## **Customer Reports** 

- Top Customers 

- Repeat Purchases 

- Customer Lifetime Value 

## **Product Reports** 

- Fast Moving Products 

- Slow Moving Products â€¢ Top Revenue Products 

## **Module 8: Notifications** 

## **Low Stock Alerts** 

Trigger: 

Current Stock â‰¤ Reorder Threshold 

## **Expiry Alerts** 

Trigger: 

Expiry Date approaching 

## **Payment Reminders** 

Trigger: 

Outstanding Due Date 

## **AI Recommendations** 

Trigger: 

Forecasted Demand > Current Inventory 

10 

## **Module 9: Search & Filters** 

## **Product Search** 

Search By: 

- Product Name 

- SKU 

- Category 

- Brand 

## **Filters** 

- Stock Status 

- Supplier 

- Price Range 

- Date Range 

## **Module 10: Data Management** 

## **Export** 

Formats: 

- CSV 

- Excel 

- PDF 

## **Import** 

Supported: 

- CSV 

- Excel 

## **Backup** 

Features: 

- Manual Backup 

- Scheduled Backup 

- Restore Backup 

11 

## **Audit Logs** 

Track: 

- Inventory Changes 

- User Actions 

- Order Updates 

- Price Modifications 

## **7. Non-Functional Requirements** 

## **Performance** 

- Dashboard Load Time < 3 Seconds 

- Search Results < 500ms 

- API Response Time < 300ms 

## **Scalability** 

Support: 

- 1000+ Concurrent Users 

- 100,000+ Products 

## **Security** 

- JWT Authentication 

- Role-Based Access 

- Password Hashing 

- HTTPS Encryption 

- Audit Logging 

## **Availability** 

- 99.9% Uptime 

12 

## **8. MVP Scope** 

## **Included** 

- Authentication 

- Inventory Management 

- QR Billing 

- Invoice Generation 

- Supplier Management 

- Basic Reports 

- Random Forest Forecasting 

- Notifications 

## **Excluded (Future)** 

- Mobile Apps 

- WhatsApp Ordering 

- AI Chat Assistant 

- Advanced Forecasting Models 

- IoT Inventory Sensors 

## **9. Success Metrics (KPIs)** 

## **Inventory KPIs** 

- 30% Reduction in Stockouts 

- 20% Improvement in Inventory Turnover 

## **Sales KPIs** 

- 15% Increase in Sales Efficiency 

- 25% Faster Billing Process 

## **AI KPIs** 

- Forecast Accuracy â‰¥ 80% 

- Restocking Recommendation Acceptance â‰¥ 60% 

## **User KPIs** 

- Monthly Active Users (MAU) 

- Daily Active Users (DAU) 

- Customer Retention Rate 

13 

## **Platform KPIs** 

- API Success Rate > 99% 

- System Uptime > 99.9% 

## **10. Future Roadmap** 

## **Phase 2** 

- Mobile Application 

- Barcode Scanner Integration 

- WhatsApp Order Management 

## **Phase 3** 

- Deep Learning Forecasting 

- Smart Supplier Recommendation Engine 

- AI Pricing Optimization 

## **Phase 4** 

- Multi-Tenant SaaS Platform 

- Franchise Management 

- Enterprise ERP Integrations 

## **Expected Technology Stack** 

## **Frontend** 

- React.js 

- Redux Toolkit 

- Tailwind CSS 

- Recharts 

## **Backend** 

- Node.js 

- Express.js 

## **Database** 

- MongoDB 

## **Authentication** 

- JWT + Refresh Tokens 

14 

## **Machine Learning** 

- Python 

- Scikit-learn 

- Pandas 

- NumPy 

## **Deployment** 

- Frontend: Vercel 

- Backend: Railway / Render 

- Database: MongoDB Atlas 

- ML Service: Docker Container 

15 




