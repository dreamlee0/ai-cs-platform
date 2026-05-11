import React, { useEffect, useState } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Typography,
  message, Popconfirm, Drawer, Empty,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined,
  SearchOutlined, EyeOutlined,
} from '@ant-design/icons'
import { knowledgeAPI } from '../../services/api'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface Article {
  id: number
  title: string
  content: string
  summary: string | null
  keywords: string | null
  category_id: number | null
  status: string
  view_count: number
  helpful_count: number
}

interface Category {
  id: number
  name: string
  description: string | null
}

const KnowledgeManage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [arts, cats] = await Promise.all([
        knowledgeAPI.getArticles({ status: '' }),
        knowledgeAPI.getCategories(),
      ])
      setArticles(arts as Article[])
      setCategories(cats as Category[])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingId) {
        await knowledgeAPI.updateArticle(editingId, values)
        message.success('更新成功')
      } else {
        await knowledgeAPI.createArticle(values)
        message.success('创建成功')
      }
      setModalOpen(false)
      form.resetFields()
      setEditingId(null)
      loadData()
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await knowledgeAPI.deleteArticle(id)
      message.success('删除成功')
      loadData()
    } catch {
      message.error('删除失败')
    }
  }

  const handleEdit = (record: Article) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handlePreview = (record: Article) => {
    setPreviewArticle(record)
    setPreviewOpen(true)
  }

  const handleRebuildIndex = async () => {
    try {
      await knowledgeAPI.rebuildIndex()
      message.success('索引重建成功')
    } catch {
      message.error('索引重建失败')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadData()
      return
    }
    setLoading(true)
    try {
      const results = await knowledgeAPI.search(searchQuery) as Array<{ article_id: number; title: string; content: string; score: number }>
      setArticles(results.map((r) => ({
        id: r.article_id,
        title: r.title,
        content: r.content,
        summary: null,
        keywords: null,
        category_id: null,
        status: 'published',
        view_count: 0,
        helpful_count: 0,
      })))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'published' ? 'green' : status === 'draft' ? 'orange' : 'default'}>
          {status === 'published' ? '已发布' : status === 'draft' ? '草稿' : '已归档'}
        </Tag>
      ),
    },
    {
      title: '浏览',
      dataIndex: 'view_count',
      key: 'view_count',
      width: 80,
    },
    {
      title: '有用',
      dataIndex: 'helpful_count',
      key: 'helpful_count',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: Article) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)}>查看</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>知识库管理</Title>
        <Space>
          <Input.Search
            placeholder="搜索知识库..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 250 }}
          />
          <Button icon={<SyncOutlined />} onClick={handleRebuildIndex}>重建索引</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
            新建文章
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={articles}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条` }}
          locale={{ emptyText: <Empty description="暂无知识库文章" /> }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingId ? '编辑文章' : '新建文章'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={700}
        okText="保存"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="文章标题" />
          </Form.Item>
          <Form.Item name="category_id" label="分类">
            <Select placeholder="选择分类" allowClear options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="keywords" label="关键词">
            <Input placeholder="多个关键词用逗号分隔" />
          </Form.Item>
          <Form.Item name="summary" label="摘要">
            <TextArea rows={2} placeholder="文章摘要" />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea rows={8} placeholder="文章内容" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Preview Drawer */}
      <Drawer
        title={previewArticle?.title}
        width={500}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      >
        {previewArticle && (
          <div>
            {previewArticle.keywords && (
              <div style={{ marginBottom: 16 }}>
                {previewArticle.keywords.split(',').map((kw) => (
                  <Tag key={kw.trim()}>{kw.trim()}</Tag>
                ))}
              </div>
            )}
            {previewArticle.summary && (
              <Card size="small" style={{ marginBottom: 16, background: '#f6ffed' }}>
                <Text type="secondary">摘要：{previewArticle.summary}</Text>
              </Card>
            )}
            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{previewArticle.content}</Paragraph>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default KnowledgeManage
