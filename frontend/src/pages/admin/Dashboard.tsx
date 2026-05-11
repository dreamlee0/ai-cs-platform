import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Typography, Spin, Tag, List, Space } from 'antd'
import {
  MessageOutlined,
  UserOutlined,
  BookOutlined,
  SmileOutlined,
  ArrowUpOutlined,
  CustomerServiceOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { adminAPI } from '../../services/api'

const { Title, Text } = Typography

interface DashboardData {
  overview: {
    total_conversations: number
    today_conversations: number
    active_conversations: number
    transferred_conversations: number
    satisfaction_rating: number
    total_articles: number
    total_faqs: number
    total_users: number
  }
  trend: Array<{ date: string; count: number }>
}

interface ActiveConversation {
  id: number
  session_id: string
  status: string
  user_name: string
  channel: string
  last_message: string
  updated_at: string
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [activeConvs, setActiveConvs] = useState<ActiveConversation[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [dashboard, active] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getActiveConversations(),
      ])
      setData(dashboard as DashboardData)
      setActiveConvs(active as ActiveConversation[])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  const stats = data?.overview

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>仪表盘</Title>

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="总会话数"
              value={stats?.total_conversations || 0}
              prefix={<MessageOutlined style={{ color: '#1677ff' }} />}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  今日 +{stats?.today_conversations || 0}
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="进行中会话"
              value={stats?.active_conversations || 0}
              prefix={<CustomerServiceOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="转人工会话"
              value={stats?.transferred_conversations || 0}
              prefix={<SwapOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="满意度评分"
              value={stats?.satisfaction_rating || 0}
              precision={1}
              prefix={<SmileOutlined style={{ color: '#52c41a' }} />}
              suffix="/ 5"
            />
          </Card>
        </Col>
      </Row>

      {/* Second Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="知识库文章"
              value={stats?.total_articles || 0}
              prefix={<BookOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="FAQ数量"
              value={stats?.total_faqs || 0}
              prefix={<BookOutlined style={{ color: '#13c2c2' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="注册用户"
              value={stats?.total_users || 0}
              prefix={<UserOutlined style={{ color: '#eb2f96' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="今日增长"
              value={stats?.today_conversations || 0}
              prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Trend Chart & Active Conversations */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="近7日会话趋势">
            <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 16px' }}>
              {data?.trend.map((item) => (
                <div key={item.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, marginBottom: 4 }}>{item.count}</Text>
                  <div style={{
                    width: '100%',
                    height: `${Math.max((item.count / Math.max(...data.trend.map(t => t.count), 1)) * 150, 4)}px`,
                    background: 'linear-gradient(180deg, #1677ff 0%, #69b1ff 100%)',
                    borderRadius: '4px 4px 0 0',
                  }} />
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>{item.date}</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title="实时活跃会话"
            extra={<Tag color="processing">{activeConvs.length} 个</Tag>}
            style={{ height: '100%' }}
            bodyStyle={{ padding: 0, maxHeight: 250, overflow: 'auto' }}
          >
            <List
              dataSource={activeConvs}
              locale={{ emptyText: '暂无活跃会话' }}
              renderItem={(item) => (
                <List.Item style={{ padding: '12px 24px' }}>
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{item.user_name}</span>
                        <Tag color={item.status === 'transferred' ? 'warning' : 'processing'}>
                          {item.status === 'transferred' ? '已转人工' : 'AI接待'}
                        </Tag>
                        <Tag>{item.channel}</Tag>
                      </Space>
                    }
                    description={
                      <Text type="secondary" ellipsis style={{ maxWidth: 250 }}>
                        {item.last_message || '暂无消息'}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
