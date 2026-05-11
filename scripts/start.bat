@echo off
chcp 65001 >nul

echo =========================================
echo   AI智能客服平台 - 启动脚本
echo =========================================

REM Create .env if not exists
if not exist backend\.env (
    echo 创建环境配置文件...
    copy backend\.env.example backend\.env
    echo 请编辑 backend\.env 文件配置LLM API密钥
)

REM Install backend dependencies
echo 安装后端依赖...
cd backend
pip install -r requirements.txt -q
cd ..

REM Install frontend dependencies
echo 安装前端依赖...
cd frontend
npm install
cd ..

REM Create data directories
if not exist backend\data mkdir backend\data
if not exist backend\knowledge_base mkdir backend\knowledge_base

echo.
echo =========================================
echo   启动服务...
echo =========================================

REM Start backend
echo 启动后端服务 (端口 8000)...
start "AI-CS Backend" cmd /c "cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Start frontend
echo 启动前端服务 (端口 3000)...
start "AI-CS Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo =========================================
echo   服务已启动!
echo =========================================
echo.
echo   前端地址: http://localhost:3000
echo   后端API:  http://localhost:8000
echo   API文档:  http://localhost:8000/docs
echo.
echo   默认管理员账号: admin / admin123
echo =========================================

pause
