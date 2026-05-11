import React, { useEffect, useState } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select,
  Tag, Typography, message, Popconfirm, Empty, Collapse,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { knowledgeAPI } from '../../services/api'

const { Title, Text } = Typography
const { TextArea } = Input

interface FAQItem {
  id: number
  question: string
  answer: string
  category_id: number | null
  priority: number
  hit_count: number
  is_active: boolean
}

interface Category {
  id: number
  name: string
}

const FAQManage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [faqData, catData] = await Promise.all([
        knowledgeAPI.getFAQs(),
        knowledgeAPI.getCategories(),
      ])
      setFaqs(faqData as FAQItem[])
      setCategories(catData as Category[])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await knowledgeAPI.createFAQ(values)
      message.success('创建成功')
      setModalOpen(false)
      form.resetFields()
      loadData()
    } catch {
      // ignore
    }
  }

  const columns = [
    {
      title: '问题',
      dataIndex: 'question',
      key: 'question',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category_id',
      key: 'category_id',
      width: 120,
      render: (catId: number | null) => {
        const cat = categories.find((c) => c.id === catId)
        return cat ? <Tag>{cat.name}</Tag> : '-'
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (p: number) => <Tag color={p > 5 ? 'red' : p > 0 ? 'orange' : 'default'}>{p}</Tag>,
    },
    {
      title: '命中次数',
      dataIndex: 'hit_count',
      key: 'hit_count',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>{active ? '启用' : '禁用'}</Tag>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>FAQ管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true) }}>
          新建FAQ
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={faqs}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条` }}
          locale={{ emptyText: <Empty description="暂无FAQ" /> }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: '8px 0' }}>
                <Text strong>回答：</Text>
                <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{record.answer}</div>
              </div>
            ),
          }}
        />
      </Card>

      <Modal
        title="新建FAQ"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
        okText="保存"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="question" label="问题" rules={[{ required: true, message: '请输入问题' }]}>
            <TextArea rows={2} placeholder="常见问题" />
          </Form.Item>
          <Form.Item name="answer" label="回答" rules={[{ required: true, message: '请输入回答' }]}>
            <TextArea rows={4} placeholder="标准回答" />
          </Form.Item>
          <Form.Item name="category_id" label="分类">
            <Select placeholder="选择分类" allowClear options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue={0}>
            <InputNumber min={0} max={10} style={{ width: '100%' }} placeholder="0-10，数值越大优先级越高" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default FAQManage
