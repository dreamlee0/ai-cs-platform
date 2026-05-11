import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Typography, Space, Avatar, Empty } from 'antd'
import { UserOutlined, RobotOutlined, CustomerServiceOutlined } from '@ant-design/icons'
import { adminAPI } from '../../services/api'

const { Title } = Typography

interface UserRecord {
  id: number
  username: string
  email: string | null
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
  last_login: string | null
}

const UserManage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserRecord[]>([])

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await adminAPI.getUsers()
      setUsers(data as UserRecord[])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <RobotOutlined />
      case 'agent': return <CustomerServiceOutlined />
      default: return <UserOutlined />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red'
      case 'agent': return 'blue'
      default: return 'default'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '管理员'
      case 'agent': return '客服人员'
      default: return '普通用户'
    }
  }

  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_: unknown, record: UserRecord) => (
        <Space>
          <Avatar icon={getRoleIcon(record.role)} style={{ background: record.role === 'admin' ? '#ff4d4f' : '#1677ff' }} />
          <div>
            <div>{record.full_name || record.username}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.username}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (email: string | null) => email || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>{getRoleLabel(role)}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>{active ? '正常' : '禁用'}</Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
    },
    {
      title: '最后登录',
      dataIndex: 'last_login',
      key: 'last_login',
      width: 180,
      render: (time: string | null) => time || '从未登录',
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>用户管理</Title>

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 个用户` }}
          locale={{ emptyText: <Empty description="暂无用户" /> }}
        />
      </Card>
    </div>
  )
}

export default UserManage
