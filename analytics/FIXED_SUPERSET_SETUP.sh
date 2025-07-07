#!/bin/bash
# Fixed Apache Superset Setup for Article Saver

echo "🚀 Fixed Superset Setup for Article Saver Analytics"
echo "=================================================="

# Activate virtual environment
echo "📦 Activating virtual environment..."
source analytics-env/bin/activate

# Set required environment variables
echo "⚙️ Setting environment variables..."
export FLASK_APP=superset
export SUPERSET_CONFIG_PATH=$PWD/superset_config.py

# Create Superset configuration file
echo "📝 Creating Superset configuration..."
cat > superset_config.py << 'EOF'
import os
from celery.schedules import crontab

# Superset specific config
ROW_LIMIT = 5000
SECRET_KEY = os.environ.get('SUPERSET_SECRET_KEY', 'your-secret-key-here-' + os.urandom(16).hex())

# Flask App Builder configuration
# Your App secret key will be used for securely signing the session cookie
# and encrypting sensitive information on the database
# Make sure you are changing this key for your deployment with a strong key.
# You can generate a strong key using `openssl rand -base64 42`
# Alternatively you can set it with `SUPERSET_SECRET_KEY` environment variable.

# The SQLAlchemy connection string to your database backend
# This connection defines the path to the database that stores your
# superset metadata (slices, connections, tables, dashboards, ...).
# Note that the connection information to connect to the datasources
# you want to explore are managed directly in the web UI
SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(os.path.expanduser('~'), '.superset/superset.db')

# Flask-WTF flag for CSRF
WTF_CSRF_ENABLED = True
# Add endpoints that need to be exempt from CSRF protection
WTF_CSRF_EXEMPT_LIST = []
# A CSRF token that expires in 1 year
WTF_CSRF_TIME_LIMIT = 60 * 60 * 24 * 365

# Set this API key to enable Mapbox visualizations
MAPBOX_API_KEY = ''

# Disable warnings
SILENCE_FAB = True
EOF

# Initialize the database
echo "🗄️ Initializing Superset database..."
superset db upgrade

# Create admin user
echo "👤 Creating admin user..."
echo "Please enter admin credentials:"
read -p "Admin username (default: admin): " admin_username
admin_username=${admin_username:-admin}

read -p "Admin first name (default: Admin): " admin_firstname
admin_firstname=${admin_firstname:-Admin}

read -p "Admin last name (default: User): " admin_lastname
admin_lastname=${admin_lastname:-User}

read -p "Admin email: " admin_email
while [[ -z "$admin_email" ]]; do
    echo "Email is required!"
    read -p "Admin email: " admin_email
done

read -s -p "Admin password: " admin_password
echo
while [[ -z "$admin_password" ]]; do
    echo "Password is required!"
    read -s -p "Admin password: " admin_password
    echo
done

# Create admin using superset fab command
superset fab create-admin \
    --username "$admin_username" \
    --firstname "$admin_firstname" \
    --lastname "$admin_lastname" \
    --email "$admin_email" \
    --password "$admin_password"

# Load default roles and permissions
echo "⚙️ Loading default roles and permissions..."
superset init

# Create updated startup script
cat > start-analytics.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Apache Superset..."
source analytics-env/bin/activate
export FLASK_APP=superset
export SUPERSET_CONFIG_PATH=$PWD/superset_config.py

# Check if running on macOS and port 8088 is available
if command -v lsof >/dev/null 2>&1; then
    if lsof -Pi :8088 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port 8088 is already in use!"
        echo "Run 'lsof -i :8088' to see what's using it"
        exit 1
    fi
fi

echo "📊 Superset is starting at http://localhost:8088"
echo "Press Ctrl+C to stop"
echo ""
gunicorn \
    --bind "0.0.0.0:8088" \
    --access-logfile '-' \
    --error-logfile '-' \
    --workers 1 \
    --worker-class gevent \
    --threads 20 \
    --timeout 60 \
    --limit-request-line 0 \
    --limit-request-field_size 0 \
    "superset.app:create_app()"
EOF

chmod +x start-analytics.sh

# Create a simple test to verify installation
echo ""
echo "🔍 Verifying installation..."
python -c "import superset; print('✅ Superset module imported successfully')" 2>/dev/null || echo "❌ Failed to import superset"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 To start Superset:"
echo "   ./start-analytics.sh"
echo ""
echo "🌐 Access at: http://localhost:8088"
echo "   Username: $admin_username"
echo "   Password: [the password you entered]"
echo ""
echo "📈 Next steps:"
echo "1. Start Superset with ./start-analytics.sh"
echo "2. Log in with your admin credentials"
echo "3. Add your Article Saver PostgreSQL database"
echo "4. Import queries from analytics/superset_dashboards.sql"
echo ""
echo "💡 Troubleshooting:"
echo "- If port 8088 is in use, check with: lsof -i :8088"
echo "- Logs are in: ~/.superset/superset.log"
echo "- Config file: ./superset_config.py"