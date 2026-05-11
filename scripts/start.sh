#!/bin/bash

echo "========================================="
echo "  AI智能客服平台 - 启动脚本"
echo "========================================="

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 Python3，请先安装"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装"
    exit 1
fi

# Create .env if not exists
if [ ! -f backend/.env ]; then
    echo "创建环境配置文件..."
    cp backend/.env.example backend/.env
    echo "请编辑 backend/.env 文件配置LLM API密钥"
fi

# Install backend dependencies
echo "安装后端依赖..."
cd backend
pip install -r requirements.txt -q
cd ..

# Install frontend dependencies
echo "安装前端依赖..."
cd frontend
npm install
cd ..

# Create data directories
mkdir -p backend/data
mkdir -p backend/knowledge_base

echo ""
echo "========================================="
echo "  启动服务..."
echo "========================================="

# Start backend
echo "启动后端服务 (端口 8000)..."
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Start frontend
echo "启动前端服务 (端口 3000)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================="
echo "  服务已启动!"
echo "========================================="
echo ""
echo "  前端地址: http://localhost:3000"
echo "  后端API:  http://localhost:8000"
echo "  API文档:  http://localhost:8000/docs"
echo ""
echo "  默认管理员账号: admin / admin123"
echo ""
echo "  按 Ctrl+C 停止服务"
echo "========================================="

# Wait for signals
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
