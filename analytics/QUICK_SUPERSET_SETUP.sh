#!/bin/bash
# Quick Apache Superset Setup for Article Saver

echo "🚀 Setting up Apache Superset for Article Saver Analytics"
echo "========================================================"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 required. Install with: brew install python3"
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv analytics-env
source analytics-env/bin/activate

# Install Superset
echo "📥 Installing Apache Superset..."
pip install --upgrade pip
pip install apache-superset

# Set secret key
export SUPERSET_SECRET_KEY=$(openssl rand -base64 42)
echo "export SUPERSET_SECRET_KEY='$SUPERSET_SECRET_KEY'" >> ~/.zshrc

# Initialize database
echo "🗄️ Initializing Superset database..."
superset db upgrade

# Create admin user
echo "👤 Creating admin user..."
echo "Enter your admin credentials:"
superset fab create-admin

# Initialize Superset
echo "⚙️ Initializing Superset..."
superset init

# Create startup script
cat > start-analytics.sh << 'EOF'
#!/bin/bash
source analytics-env/bin/activate
export FLASK_APP=superset
superset run -p 8088 --with-threads --reload
EOF

chmod +x start-analytics.sh

echo "✅ Setup complete!"
echo ""
echo "📊 To start Superset:"
echo "   ./start-analytics.sh"
echo ""
echo "🌐 Access at: http://localhost:8088"
echo ""
echo "📈 Next steps:"
echo "1. Connect to your PostgreSQL database"
echo "2. Import queries from analytics/superset_dashboards.sql"
echo "3. Create your dashboards"