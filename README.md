# Illima - Sistema de Gestión de Productos y Ventas

Sistema integral para la gestión de productos, inventario, ventas y reportes con interfaz moderna y pastel.

## Características

- **Gestión de Productos**: Crear, editar y eliminar productos con categorías
- **Sistema de Ventas**: Registro de ventas con descuentos y seguimiento de insumos
- **Gestión de Inventario**: Control de stock con alertas de bajo inventario
- **Reportes**: Análisis detallado de ventas e inventario
- **Interfaz Pastel**: Diseño moderno con colores suave y gradientes
- **Autenticación**: Sistema de login seguro con roles de usuario

## Requisitos

- Python 3.11+
- Node.js 18+
- PostgreSQL 12+
- npm o pnpm

## Instalación Local

### Backend (Flask)

\`\`\`bash
# Instalar dependencias
pip install -r requirements.txt

# Crear variables de entorno
cp .env.example .env

# Ejecutar migraciones
python init_db.py

# Iniciar servidor
python app.py
\`\`\`

### Frontend (Next.js)

\`\`\`bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
npm start
\`\`\`

## Estructura del Proyecto

\`\`\`
illima/
├── app.py                 # Aplicación Flask principal
├── models.py             # Modelos de base de datos
├── config.py             # Configuración
├── requirements.txt      # Dependencias Python
├── app/                  # Frontend Next.js
│   ├── layout.tsx        # Layout principal
│   ├── page.tsx          # Página de productos
│   ├── sales/            # Módulo de ventas
│   ├── dashboard/        # Dashboard
│   ├── reports/          # Reportes
│   └── inventory/        # Inventario
├── components/           # Componentes React
├── templates/            # Templates Flask
└── static/               # Archivos estáticos
\`\`\`

## Configuración de Base de Datos

### PostgreSQL Setup

\`\`\`bash
# Crear base de datos
createdb illima_db

# Crear usuario
createuser illima_user -P

# Conceder permisos
psql -d illima_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO illima_user;"
\`\`\`

### Variables de Entorno

\`\`\`
DATABASE_URL=postgresql://illima_user:password@localhost:5432/illima_db
SECRET_KEY=your-secret-key-min-32-chars
FLASK_ENV=development
FLASK_DEBUG=True
\`\`\`

## Testing

\`\`\`bash
# Ejecutar tests
pytest test_app.py -v

# Tests con cobertura
pytest test_app.py --cov=app
\`\`\`

## Deployment

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para instrucciones detalladas de deployment en Render.

## Documentación

- [Testing Guide](TESTING.md) - Guía de testing
- [Deployment Guide](DEPLOYMENT.md) - Guía de deployment
- [API Endpoints](API.md) - Documentación de endpoints

## Seguridad

- Autenticación con contraseñas hasheadas (Werkzeug)
- CSRF protection
- SQL injection prevention
- Rate limiting recomendado
- HTTPS en producción
- Variables de entorno para datos sensibles

## Performance

- Query optimization con índices de base de datos
- Caching de datos estáticos
- Lazy loading de componentes
- Compresión de archivos
- CDN para activos estáticos

## Soporte

Para reportar problemas o sugerir mejoras, crear un issue en el repositorio.

## Licencia

MIT License
