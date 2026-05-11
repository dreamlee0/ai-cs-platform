import React from 'react'
import { Layout, Menu, Typography, Avatar, Dropdown, Space } from 'antd'
import {
  DashboardOutlined,
  MessageOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  LogoutOutlined,
  RobotOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/admin/conversations',
      icon: <MessageOutlined />,
      label: '会话管理',
    },
    {
      key: '/admin/knowledge',
      icon: <BookOutlined />,
      label: '知识库管理',
    },
    {
      key: '/admin/faq',
      icon: <QuestionCircleOutlined />,
      label: 'FAQ管理',
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
  ]

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ]

  const handleMenuClick = (info: { key: string }) => {
    navigate(info.key)
  }

  const handleUserMenu = (info: { key: string }) => {
    if (info.key === 'logout') {
      logout()
      navigate('/admin/login')
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: '#001529',
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <RobotOutlined style={{ fontSize: 24, color: '#1677ff' }} />
          {!collapsed && (
            <Title level={5} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>
              AI客服管理
            </Title>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: 'pointer', fontSize: 18 }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ background: '#1677ff' }} />
              <span>{user?.username || 'Admin'}</span>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{
          margin: 24,
          padding: 24,
          background: '#f0f2f5',
          minHeight: 280,
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout
