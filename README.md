# AI智能客服平台 (AI Customer Service Platform)

基于大语言模型(LLM)的企业级AI智能客服系统，支持知识库检索、意图识别、情感分析、人工转接等功能。

## 功能特性

### 核心功能
- **智能问答**: 基于LLM的自然语言理解与生成
- **知识库检索**: 向量相似度搜索(FAISS)，精准匹配知识库内容
- **意图识别**: 自动识别用户意图(咨询/投诉/购买/退换货等)
- **情感分析**: 实时分析用户情绪，负面情绪自动转人工
- **人工转接**: 支持关键词触发和情绪触发自动转人工
- **多轮对话**: 保持上下文的连续对话能力

### 管理功能
- **仪表盘**: 实时统计会话量、满意度、趋势图表
- **会话管理**: 查看所有会话、对话详情、会话状态
- **知识库管理**: 文章CRUD、分类管理、向量索引重建
- **FAQ管理**: 常见问题管理、优先级排序
- **用户管理**: 用户列表、角色管理

### 技术特性
- **WebSocket实时通信**: 支持实时聊天和状态推送
- **流式响应**: 支持LLM流式输出
- **多LLM支持**: OpenAI / 智谱 / 通义千问 / Ollama
- **RESTful API**: 完整的API文档(Swagger)
- **JWT认证**: 安全的用户认证机制

## 技术栈

### 后端
- **框架**: FastAPI (Python)
- **数据库**: SQLAlchemy + SQLite (可切换PostgreSQL)
- **向量存储**: FAISS
- **Embedding**: Sentence-Transformers
- **LLM**: OpenAI API (兼容接口)

### 前端
- **框架**: React 18 + TypeScript
- **UI库**: Ant Design 5
- **状态管理**: Zustand
- **构建工具**: Vite
- **实时通信**: WebSocket

## 快速开始

### 方式一：本地启动

```bash
# 1. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入LLM API密钥

# 2. 启动后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. 启动前端
cd frontend
npm install
npm run dev
```

### 方式二：脚本启动

```bash
# Linux/Mac
chmod +x scripts/start.sh
./scripts/start.sh

# Windows
scripts\start.bat
```

### 方式三：Docker启动

```bash
# 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env

# 启动所有服务
docker-compose up -d
```

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:3000 |
| 客户聊天 | http://localhost:3000/ |
| 管理后台 | http://localhost:3000/admin |
| API文档 | http://localhost:8000/docs |
| 健康检查 | http://localhost:8000/health |

## 默认账号

- **管理员**: admin / admin123

## 项目结构

```
ai-cs-platform/
├── backend/                    # 后端服务
│   ├── app/
│   │   ├── api/v1/            # API路由
│   │   │   ├── auth.py        # 认证API
│   │   │   ├── chat.py        # 聊天API
│   │   │   ├── knowledge.py   # 知识库API
│   │   │   └── admin.py       # 管理API
│   │   ├── core/              # 核心模块
│   │   │   ├── config.py      # 配置管理
│   │   │   ├── database.py    # 数据库连接
│   │   │   └── security.py    # JWT认证
│   │   ├── models/            # 数据模型
│   │   │   ├── user.py        # 用户模型
│   │   │   ├── conversation.py # 会话模型
│   │   │   └── knowledge.py   # 知识库模型
│   │   ├── services/          # 业务逻辑
│   │   │   ├── llm_service.py        # LLM服务
│   │   │   ├── knowledge_service.py  # 知识库服务
│   │   │   └── conversation_service.py # 会话服务
│   │   ├── websocket/         # WebSocket
│   │   └── main.py            # 应用入口
│   ├── requirements.txt
│   └── .env.example
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── pages/
│   │   │   ├── customer/      # 客户聊天页面
│   │   │   └── admin/         # 管理后台页面
│   │   ├── services/          # API服务
│   │   ├── store/             # 状态管理
│   │   └── styles/            # 样式文件
│   └── package.json
├── knowledge_base/             # 知识库文档目录
├── scripts/                    # 启动脚本
├── docker-compose.yml          # Docker配置
└── README.md
```

## API接口

### 认证接口
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/auth/me` - 获取当前用户

### 聊天接口
- `POST /api/v1/chat/send` - 发送消息(需认证)
- `POST /api/v1/chat/guest` - 访客聊天(无需认证)
- `GET /api/v1/chat/history/{session_id}` - 获取历史记录
- `POST /api/v1/chat/close/{session_id}` - 关闭会话

### 知识库接口
- `GET/POST /api/v1/knowledge/articles` - 文章列表/创建
- `GET/PUT/DELETE /api/v1/knowledge/articles/{id}` - 文章详情/更新/删除
- `POST /api/v1/knowledge/search` - 知识库搜索
- `POST /api/v1/knowledge/rebuild-index` - 重建索引
- `GET/POST /api/v1/knowledge/faqs` - FAQ列表/创建

### 管理接口
- `GET /api/v1/admin/dashboard` - 仪表盘数据
- `GET /api/v1/admin/conversations/active` - 活跃会话
- `GET /api/v1/admin/conversations/{id}` - 会话详情

### WebSocket
- `ws://localhost:8000/ws/chat/{session_id}` - 聊天WebSocket
- `ws://localhost:8000/ws/agent` - 客服人员WebSocket

## 配置说明

在 `backend/.env` 中配置：

```env
# LLM配置
LLM_PROVIDER=openai          # openai/zhipu/qwen/ollama
LLM_API_KEY=sk-xxx           # API密钥
LLM_API_BASE=https://api.openai.com/v1  # API地址
LLM_MODEL=gpt-3.5-turbo      # 模型名称

# 知识库配置
CHUNK_SIZE=500                # 文本分块大小
CHUNK_OVERLAP=50              # 分块重叠
TOP_K_RESULTS=3               # 检索返回数量

# 转人工配置
TRANSFER_KEYWORDS=人工客服,转人工
AUTO_TRANSFER_SENTIMENT_THRESHOLD=-0.5
```

## 扩展建议

1. **数据库**: 生产环境建议切换为PostgreSQL
2. **缓存**: 启用Redis缓存会话和热点数据
3. **向量数据库**: 大规模知识库可切换为Milvus/Pinecone
4. **消息队列**: 使用RabbitMQ/Kafka处理高并发
5. **监控**: 集成Prometheus + Grafana监控
6. **部署**: 使用Kubernetes进行容器编排

## License

MIT
