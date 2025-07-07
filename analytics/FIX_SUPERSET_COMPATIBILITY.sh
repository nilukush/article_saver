#!/bin/bash
# Fix Superset Marshmallow Compatibility Issue

echo "🔧 Fixing Superset Compatibility Issues"
echo "======================================"

# Activate virtual environment
source analytics-env/bin/activate

# Downgrade marshmallow to compatible version
echo "📦 Installing compatible marshmallow version..."
pip install marshmallow==3.20.1

# Also install pillow for screenshots support
echo "📦 Installing PIL/Pillow for screenshots..."
pip install Pillow

# Fix any other dependency issues
echo "📦 Ensuring all dependencies are compatible..."
pip install --upgrade flask-appbuilder==4.5.1

# Now complete the setup
echo ""
echo "🗄️ Initializing database..."
export FLASK_APP=superset
export SUPERSET_CONFIG_PATH=$PWD/superset_config.py

# Initialize database
superset db upgrade

# Check if admin user exists
echo ""
echo "👤 Checking for admin user..."
if superset fab list-users | grep -q "admin"; then
    echo "✅ Admin user already exists"
else
    echo "Creating admin user..."
    superset fab create-admin \
        --username admin \
        --firstname Admin \
        --lastname User \
        --email nilukush@gmail.com \
        --password admin123
    echo "✅ Created admin user (username: admin, password: admin123)"
fi

# Initialize Superset
echo "⚙️ Initializing Superset..."
superset init

echo ""
echo "✅ Compatibility issues fixed!"
echo ""
echo "🚀 To start Superset:"
echo "   ./start-analytics.sh"
echo ""
echo "📊 Default credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "⚠️  Change the password after first login!"