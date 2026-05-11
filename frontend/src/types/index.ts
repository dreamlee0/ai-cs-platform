export interface User {
  id: number
  username: string
  email?: string
  full_name?: string
  role: 'customer' | 'agent' | 'admin'
  is_active: boolean
  created_at: string
}

export interface Conversation {
  id: number
  session_id: string
  user_id?: number
  agent_id?: number
  status: 'active' | 'transferred' | 'closed'
  channel: 'web' | 'wechat' | 'app'
  user_name?: string
  user_contact?: string
  satisfaction_rating?: number
  summary?: string
  created_at: string
  updated_at: string
  closed_at?: string
}

export interface Message {
  id: number
  conversation_id: number
  role: 'user' | 'assistant' | 'system' | 'agent'
  content: string
  message_type: 'text' | 'image' | 'file' | 'card'
  intent?: string
  sentiment_score?: number
  confidence?: number
  knowledge_base_hits?: number[]
  token_count?: number
  is_read: boolean
  created_at: string
}

export interface KnowledgeArticle {
  id: number
  category_id?: number
  title: string
  content: string
  summary?: string
  keywords?: string
  source_type: 'manual' | 'faq' | 'document' | 'crawled'
  status: 'draft' | 'published' | 'archived'
  view_count: number
  helpful_count: number
  not_helpful_count: number
  created_at: string
  updated_at: string
}

export interface FAQ {
  id: number
  question: string
  answer: string
  category_id?: number
  priority: number
  hit_count: number
  is_active: boolean
  created_at: string
}

export interface Category {
  id: number
  name: string
  description?: string
  parent_id?: number
  sort_order: number
  is_active: boolean
}

export interface DashboardData {
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

export interface ChatResponse {
  response: string
  session_id: string
  transferred: boolean
  intent?: {
    intent: string
    confidence: number
    keywords: string[]
    requires_human: boolean
  }
  sentiment?: number
  references?: Array<{
    article_id: number
    title: string
    content: string
    summary?: string
    score: number
  }>
}
