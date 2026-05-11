import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Input, Button, Card, Typography, Space, Tag, Rate, Modal, message } from 'antd'
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  CloseCircleOutlined,
  LikeOutlined,
  DislikeOutlined,
} from '@ant-design/icons'
import { ChatWebSocket } from '../../services/websocket'
import { chatAPI } from '../../services/api'

const { Text, Title, Paragraph } = Typography
const { TextArea } = Input

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'agent'
  content: string
  timestamp: Date
  references?: Array<{ title: string; content: string }>
  intent?: { intent: string; confidence: number }
}

const CustomerChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [ws, setWs] = useState<ChatWebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Initialize WebSocket
  useEffect(() => {
    const sid = localStorage.getItem('chat_session_id') || `session_${Date.now()}`
    setSessionId(sid)
    localStorage.setItem('chat_session_id', sid)

    const chatWs = new ChatWebSocket(sid)

    chatWs.on('connected', () => {
      setConnected(true)
    })

    chatWs.on('disconnected', () => {
      setConnected(false)
    })

    chatWs.on('message', (data) => {
      const newMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: data.role as ChatMessage['role'],
        content: data.content as string,
        timestamp: new Date(),
        references: data.references as ChatMessage['references'],
        intent: data.intent as ChatMessage['intent'],
      }
      setMessages((prev) => [...prev, newMsg])
      setLoading(false)
    })

    chatWs.on('system', (data) => {
      const sysMsg: ChatMessage = {
        id: `sys_${Date.now()}`,
        role: 'system',
        content: data.content as string,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, sysMsg])
    })

    chatWs.on('typing', () => {
      setLoading(true)
    })

    chatWs.connect()
    setWs(chatWs)

    return () => {
      chatWs.disconnect()
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || loading) return

    // Add user message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInputText('')

    if (ws?.isConnected) {
      // Use WebSocket
      ws.send(text)
    } else {
      // Fallback to HTTP API
      setLoading(true)
      try {
        const res = await chatAPI.guestChat(text, sessionId) as Record<string, unknown>
        const assistantMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: res.response as string,
          timestamp: new Date(),
          references: res.references as ChatMessage['references'],
          intent: res.intent as ChatMessage['intent'],
        }
        setMessages((prev) => [...prev, assistantMsg])
      } catch {
        message.error('发送失败，请重试')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleClose = async () => {
    try {
      await chatAPI.closeConversation(sessionId)
      setShowRating(true)
    } catch {
      // ignore
    }
  }

  const handleRating = async (value: number) => {
    try {
      await chatAPI.closeConversation(sessionId, value)
      message.success('感谢您的评价！')
      setShowRating(false)
    } catch {
      // ignore
    }
  }

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user'
    const isSystem = msg.role === 'system'

    if (isSystem) {
      return (
        <div key={msg.id} style={{ textAlign: 'center', margin: '8px 0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{msg.content}</Text>
        </div>
      )
    }

    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 16,
          gap: 8,
        }}
      >
        {!isUser && (
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: msg.role === 'agent' ? '#52c41a' : '#1677ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {msg.role === 'agent'
              ? <CustomerServiceOutlined style={{ color: '#fff', fontSize: 16 }} />
              : <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />}
          </div>
        )}
        <div style={{ maxWidth: '75%' }}>
          <div className={`chat-message-${msg.role}`}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
          </div>
          {msg.intent && (
            <div style={{ marginTop: 4 }}>
              <Tag color="blue" style={{ fontSize: 11 }}>
                {msg.intent.intent} ({Math.round(msg.intent.confidence * 100)}%)
              </Tag>
            </div>
          )}
          {msg.references && msg.references.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>参考来源：</Text>
              {msg.references.map((ref, i) => (
                <Card key={i} size="small" style={{ marginTop: 4 }}>
                  <Text strong style={{ fontSize: 12 }}>{ref.title}</Text>
                  <Paragraph style={{ fontSize: 11, margin: '4px 0 0', color: '#666' }} ellipsis={{ rows: 2 }}>
                    {ref.content}
                  </Paragraph>
                </Card>
              ))}
            </div>
          )}
          {!isUser && (
            <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
              <Button type="text" size="small" icon={<LikeOutlined />} style={{ fontSize: 12, color: '#999' }} />
              <Button type="text" size="small" icon={<DislikeOutlined />} style={{ fontSize: 12, color: '#999' }} />
            </div>
          )}
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
            {msg.timestamp.toLocaleTimeString()}
          </Text>
        </div>
        {isUser && (
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#87d068',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <UserOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: '#f0f2f5',
    }}>
      {/* Header */}
      <div style={{
        background: '#1677ff', padding: '16px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Space>
          <RobotOutlined style={{ color: '#fff', fontSize: 24 }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>AI智能客服</Title>
        </Space>
        <Space>
          <Tag color={connected ? 'success' : 'error'}>
            {connected ? '已连接' : '未连接'}
          </Tag>
          <Button
            type="text"
            icon={<CustomerServiceOutlined />}
            style={{ color: '#fff' }}
            onClick={() => {
              message.info('正在为您转接人工客服...')
              if (ws) ws.send('转人工')
            }}
          >
            人工客服
          </Button>
          <Button
            type="text"
            icon={<CloseCircleOutlined />}
            style={{ color: '#fff' }}
            onClick={handleClose}
          >
            结束会话
          </Button>
        </Space>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '24px',
        display: 'flex', flexDirection: 'column',
      }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', opacity: 0.6,
          }}>
            <RobotOutlined style={{ fontSize: 64, color: '#1677ff', marginBottom: 16 }} />
            <Title level={3} style={{ color: '#666' }}>欢迎使用AI智能客服</Title>
            <Text type="secondary">请输入您的问题，我将竭诚为您服务</Text>
            <Space wrap style={{ marginTop: 24 }}>
              {['如何退货？', '配送时间', '发票问题', '账户安全'].map((q) => (
                <Tag
                  key={q}
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                  onClick={() => {
                    setInputText(q)
                  }}
                >
                  {q}
                </Tag>
              ))}
            </Space>
          </div>
        )}
        {messages.map(renderMessage)}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#1677ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 24px', background: '#fff',
        borderTop: '1px solid #e8e8e8',
      }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <TextArea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请输入您的问题..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={loading}
            style={{ height: 'auto' }}
          >
            发送
          </Button>
        </div>
      </div>

      {/* Rating Modal */}
      <Modal
        title="请对本次服务进行评价"
        open={showRating}
        onCancel={() => setShowRating(false)}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Rate onChange={handleRating} style={{ fontSize: 36 }} />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">您的评价将帮助我们提升服务质量</Text>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default CustomerChat
