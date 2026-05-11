import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/admin/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (data: { username: string; password: string; email?: string }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
}

// Chat API
export const chatAPI = {
  sendMessage: (message: string, sessionId?: string) =>
    api.post('/chat/send', { message, session_id: sessionId }),
  guestChat: (message: string, sessionId?: string) =>
    api.post('/chat/guest', { message, session_id: sessionId }),
  getHistory: (sessionId: string) =>
    api.get(`/chat/history/${sessionId}`),
  closeConversation: (sessionId: string, rating?: number) =>
    api.post(`/chat/close/${sessionId}`, null, { params: { rating } }),
  getConversations: (params?: { status?: string; page?: number; page_size?: number }) =>
    api.get('/chat/conversations', { params }),
}

// Knowledge API
export const knowledgeAPI = {
  // Categories
  getCategories: () => api.get('/knowledge/categories'),
  createCategory: (data: { name: string; description?: string }) =>
    api.post('/knowledge/categories', data),

  // Articles
  getArticles: (params?: { category_id?: number; status?: string; page?: number }) =>
    api.get('/knowledge/articles', { params }),
  getArticle: (id: number) => api.get(`/knowledge/articles/${id}`),
  createArticle: (data: { title: string; content: string; summary?: string; keywords?: string; category_id?: number }) =>
    api.post('/knowledge/articles', data),
  updateArticle: (id: number, data: Record<string, unknown>) =>
    api.put(`/knowledge/articles/${id}`, data),
  deleteArticle: (id: number) => api.delete(`/knowledge/articles/${id}`),
  markHelpful: (id: number, helpful: boolean) =>
    api.post(`/knowledge/articles/${id}/helpful`, null, { params: { helpful } }),
  rebuildIndex: () => api.post('/knowledge/rebuild-index'),
  search: (query: string, topK?: number) =>
    api.post('/knowledge/search', null, { params: { query, top_k: topK } }),

  // FAQs
  getFAQs: (categoryId?: number) =>
    api.get('/knowledge/faqs', { params: { category_id: categoryId } }),
  createFAQ: (data: { question: string; answer: string; category_id?: number; priority?: number }) =>
    api.post('/knowledge/faqs', data),
}

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getActiveConversations: () => api.get('/admin/conversations/active'),
  getConversationDetail: (id: number) => api.get(`/admin/conversations/${id}`),
  getUsers: () => api.get('/auth/users'),
}

export default api
