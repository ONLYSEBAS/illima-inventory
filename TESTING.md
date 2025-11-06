# Testing Guide - Illima System

## Unit Tests

Run the test suite:

\`\`\`bash
pytest test_app.py -v
\`\`\`

## Manual Testing Checklist

### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Logout functionality
- [ ] Session persistence
- [ ] Redirect to login when not authenticated

### Product Management
- [ ] Create new product
- [ ] View product list
- [ ] Edit product details
- [ ] Delete product
- [ ] Add supplies to product
- [ ] Search products by name
- [ ] Filter products by category

### Sales System
- [ ] Add product to cart
- [ ] Remove product from cart
- [ ] Update quantity
- [ ] Apply discount
- [ ] Complete sale
- [ ] Track inventory after sale

### Inventory Management
- [ ] View inventory list
- [ ] Update stock quantity
- [ ] Check low stock alerts
- [ ] View inventory history
- [ ] Export inventory report

### Reports
- [ ] View sales report
- [ ] Generate sales by product
- [ ] Generate sales by date
- [ ] View inventory forecast
- [ ] Generate complete report

## Performance Testing

Monitor database query performance:

\`\`\`sql
-- Slow query log
SHOW log_min_duration_statement;
SET log_min_duration_statement = 1000; -- Log queries > 1 second
\`\`\`

## Security Testing

- [ ] Test SQL injection prevention
- [ ] Test CSRF protection
- [ ] Test authentication bypass
- [ ] Test unauthorized access
- [ ] Test file upload validation

## Browser Compatibility

Test on:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Mobile Testing

- [ ] Responsive layout
- [ ] Touch interactions
- [ ] Mobile navigation
- [ ] Form input on mobile
