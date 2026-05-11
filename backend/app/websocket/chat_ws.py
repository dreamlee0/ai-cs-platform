"""WebSocket handler for real-time chat."""

import json
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
from app.services.conversation_service import conversation_service
from app.core.database import AsyncSessionLocal
from loguru import logger


class ConnectionManager:
    """Manage WebSocket connections."""

    def __init__(self):
        # session_id -> set of websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # agent connections
        self.agent_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept and register a new connection."""
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        self.active_connections[session_id].add(websocket)
        logger.info(f"Client connected: {session_id}")

    def disconnect(self, websocket: WebSocket, session_id: str):
        """Remove a connection."""
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        logger.info(f"Client disconnected: {session_id}")

    async def send_message(self, session_id: str, message: dict):
        """Send message to all connections in a session."""
        if session_id in self.active_connections:
            data = json.dumps(message, ensure_ascii=False)
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(data)
                except Exception:
                    pass

    async def broadcast_to_agents(self, message: dict):
        """Broadcast message to all connected agents."""
        data = json.dumps(message, ensure_ascii=False)
        for agent_ws in self.agent_connections.copy():
            try:
                await agent_ws.send_text(data)
            except Exception:
                self.agent_connections.discard(agent_ws)


manager = ConnectionManager()


async def chat_websocket(websocket: WebSocket, session_id: str):
    """Handle chat WebSocket connection."""
    await manager.connect(websocket, session_id)

    try:
        async with AsyncSessionLocal() as db:
            # Get or create conversation
            conversation = await conversation_service.get_or_create_conversation(db, session_id)

            # Send welcome message
            await manager.send_message(session_id, {
                "type": "system",
                "content": "您好！我是AI智能客服，请问有什么可以帮您？",
                "session_id": session_id,
            })

            while True:
                # Receive message
                data = await websocket.receive_text()
                message_data = json.loads(data)

                if message_data.get("type") == "ping":
                    await manager.send_message(session_id, {"type": "pong"})
                    continue

                user_message = message_data.get("content", "")
                if not user_message:
                    continue

                # Send typing indicator
                await manager.send_message(session_id, {"type": "typing"})

                # Generate response
                result = await conversation_service.generate_response(
                    db, conversation, user_message
                )

                # Send response
                await manager.send_message(session_id, {
                    "type": "message",
                    "role": "assistant",
                    "content": result["response"],
                    "session_id": session_id,
                    "transferred": result.get("transferred", False),
                    "intent": result.get("intent"),
                    "references": result.get("references", []),
                })

                # If transferred, notify agents
                if result.get("transferred"):
                    await manager.broadcast_to_agents({
                        "type": "transfer_request",
                        "session_id": session_id,
                        "message": f"用户请求转人工客服",
                    })

    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, session_id)


async def agent_websocket(websocket: WebSocket):
    """Handle agent WebSocket connection for real-time notifications."""
    await websocket.accept()
    manager.agent_connections.add(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)

            if message_data.get("type") == "join_session":
                session_id = message_data.get("session_id")
                if session_id:
                    await manager.send_message(session_id, {
                        "type": "system",
                        "content": "人工客服已加入对话",
                    })

            elif message_data.get("type") == "agent_message":
                session_id = message_data.get("session_id")
                content = message_data.get("content")
                if session_id and content:
                    await manager.send_message(session_id, {
                        "type": "message",
                        "role": "agent",
                        "content": content,
                    })

    except WebSocketDisconnect:
        manager.agent_connections.discard(websocket)
    except Exception as e:
        logger.error(f"Agent WebSocket error: {e}")
        manager.agent_connections.discard(websocket)
