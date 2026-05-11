import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Space, Button, Typography, Drawer, Timeline, Empty, Select } from 'antd'
import { MessageOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import { adminAPI } from '../../services/api'

const { Title, Text } = Typography

interface Conversation {
  id: number
  session_id: string
  status: string
  user_name: string
  channel: string
  satisfaction_rating: number | null
  created_at: string
  updated_at: string
}

interface Message {
  id: number
  role: string
  content: string
  intent: string | null
  sentiment_score: number | null
  created_at: string
}

const ConversationList: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedConv, setSelectedConv] = useState<{ conversation: Conversation; messages: Message[] } | null>(null)

  useEffect(() => {
    loadConversations()
  }, [page, statusFilter])

  const loadConversations = async () => {
    setLoading(true)
    try {
      const res = await adminAPI.getDashboard() // Using dashboard for now
      // In production, use dedicated conversation list API
      setConversations([])
      setTotal(0)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const viewDetail = async (record: Conversation) => {
    try {
      const detail = await adminAPI.getConversationDetail(record.id) as { conversation: Conversation; messages: Message[] }
      setSelectedConv(detail)
      setDrawerOpen(true)
    } catch {
      // ignore
    }
  }

  const columns = [
    {
      title: '会话ID',
      dataIndex: 'session_id',
      key: 'session_id',
      ellipsis: true,
      width: 200,
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 120,
      render: (name: string) => name || '访客',
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 80,
      render: (ch: string) => <Tag>{ch}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'processing',
          transferred: 'warning',
          closed: 'default',
        }
        const labelMap: Record<string, string> = {
          active: '进行中',
          transferred: '已转人工',
          closed: '已结束',
        }
        return <Tag color={colorMap[status]}>{labelMap[status] || status}</Tag>
      },
    },
    {
      title: '满意度',
      dataIndex: 'satisfaction_rating',
      key: 'rating',
      width: 80,
      render: (rating: number | null) =>
        rating ? <span>{'★'.repeat(rating)}</span> : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Conversation) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => viewDetail(record)}
        >
          查看
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>会话管理</Title>
        <Space>
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 140 }}
            onChange={(v) => setStatusFilter(v || '')}
            options={[
              { value: 'active', label: '进行中' },
              { value: 'transferred', label: '已转人工' },
              { value: 'closed', label: '已结束' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={loadConversations}>刷新</Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={conversations}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
            showTotal: (t) => `共 ${t} 条`,
          }}
          locale={{ emptyText: <Empty description="暂无会话数据" /> }}
        />
      </Card>

      <Drawer
        title="会话详情"
        width={600}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedConv ? (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>会话ID：{selectedConv.conversation.session_id}</Text>
                <Text>用户：{selectedConv.conversation.user_name || '访客'}</Text>
                <Text>渠道：{selectedConv.conversation.channel}</Text>
                <Text>状态：<Tag>{selectedConv.conversation.status}</Tag></Text>
              </Space>
            </Card>

            <Timeline
              items={selectedConv.messages.map((msg) => ({
                color: msg.role === 'user' ? 'blue' : msg.role === 'assistant' ? 'green' : 'gray',
                children: (
                  <div>
                    <Text strong>
                      {msg.role === 'user' ? '用户' : msg.role === 'assistant' ? 'AI客服' : '系统'}
                    </Text>
                    <div style={{ marginTop: 4 }}>{msg.content}</div>
                    {msg.intent && (
                      <Tag style={{ marginTop: 4 }}>{msg.intent}</Tag>
                    )}
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                      {msg.created_at}
                    </Text>
                  </div>
                ),
              }))}
            />
          </div>
        ) : (
          <Empty description="暂无数据" />
        )}
      </Drawer>
    </div>
  )
}

export default ConversationList
