import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import CustomerChat from './pages/customer/CustomerChat'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import ConversationList from './pages/admin/ConversationList'
import KnowledgeManage from './pages/admin/KnowledgeManage'
import FAQManage from './pages/admin/FAQManage'
import UserManage from './pages/admin/UserManage'
import Login from './pages/admin/Login'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuthStore()
  if (!token) {
    return <Navigate to="/admin/login" replace />
  }
  return <>{children}</>
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer Chat */}
        <Route path="/" element={<CustomerChat />} />
        <Route path="/chat" element={<CustomerChat />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="conversations" element={<ConversationList />} />
          <Route path="knowledge" element={<KnowledgeManage />} />
          <Route path="faq" element={<FAQManage />} />
          <Route path="users" element={<UserManage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
