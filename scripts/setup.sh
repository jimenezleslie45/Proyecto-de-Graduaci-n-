#!/bin/bash

# Hotel Automation System - Setup Script

echo "🏨 Hotel Automation System - Setup"
echo "===================================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed"
    exit 1
fi

echo "✅ Node.js and Python are available"

# Setup Backend API
echo ""
echo "📦 Setting up Backend API..."
cd backend-api
npm install
cd ..

# Setup Frontend
echo ""
echo "📦 Setting up Frontend..."
cd frontend
npm install
cd ..

# Setup Python Analytics
echo ""
echo "📦 Setting up Python Analytics..."
cd backend-analytics
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure database connection in backend-api/.env"
echo "2. Run the database scripts in database/ folder"
echo "3. Start services with: docker-compose up"
