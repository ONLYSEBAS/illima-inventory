# Deployment Guide - Render

## Prerequisites

1. Render account (render.com)
2. PostgreSQL database
3. GitHub repository with code
4. Environment variables configured

## Deployment Steps

### 1. Create PostgreSQL Database on Render

1. Go to Render Dashboard
2. Click "New +" → "PostgreSQL"
3. Configure:
   - Name: `illima-db`
   - Database: `illima_db`
   - User: `illima_user`
   - Region: Select closest region
4. Note the Internal Database URL

### 2. Create Web Service on Render

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - Name: `illima-app`
   - Environment: Python 3.11
   - Build Command: `pip install -r requirements.txt && npm install && npm run build`
   - Start Command: `python app.py`

### 3. Set Environment Variables

In Render Dashboard → Environment:

\`\`\`
DATABASE_URL=<postgres_connection_string>
SECRET_KEY=<generate_secure_key>
FLASK_ENV=production
FLASK_DEBUG=False
\`\`\`

### 4. Deploy

Push to GitHub main branch to trigger automatic deployment.

Monitor deployment in Render Dashboard:
- Build logs: Check compilation
- Deployment logs: Monitor startup
- Metrics: Track performance

## Post-Deployment Checklist

- [ ] Database connected successfully
- [ ] All environment variables set
- [ ] Application starts without errors
- [ ] Can login to application
- [ ] Database migrations completed
- [ ] Uploads directory created
- [ ] SSL certificate active
- [ ] Application accessible via custom domain (if applicable)

## Monitoring

1. **Application Logs**
   - Render Dashboard → Logs
   - Monitor errors and warnings

2. **Database Performance**
   - Monitor query times
   - Check connection pool usage

3. **Disk Usage**
   - Monitor file uploads
   - Clean old files periodically

4. **Uptime Monitoring**
   - Set up status page monitoring
   - Configure alerts for downtime

## Scaling

If application needs more resources:

1. Upgrade plan in Render
2. Increase database resources if needed
3. Enable auto-scaling if available
4. Monitor performance metrics

## Rollback

To rollback to previous deployment:

1. Render Dashboard → Deploys
2. Select previous deployment
3. Click "Redeploy"

## Common Issues

### Database Connection Error
- Verify DATABASE_URL format
- Check database credentials
- Ensure IP allowlist is configured

### Build Failure
- Check logs for specific errors
- Verify dependencies in requirements.txt
- Ensure Python version matches

### Application Not Starting
- Check Flask configuration
- Verify SECRET_KEY is set
- Check for missing dependencies

## Security Best Practices

1. Use strong SECRET_KEY (min 32 characters)
2. Enable HTTPS (automatic on Render)
3. Regular backups of database
4. Monitor access logs
5. Keep dependencies updated
6. Use environment variables for sensitive data
7. Implement rate limiting
8. Enable CORS only for trusted domains
