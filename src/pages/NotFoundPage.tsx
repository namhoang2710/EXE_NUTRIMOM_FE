import { ArrowLeft } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="not-found-page">
      <img src="/nutrimom-logo.png" width="58" height="58" alt="" />
      <h1>Trang này không tồn tại</h1>
      <p>Đường dẫn bạn mở chưa có trong ứng dụng NutriMom.</p>
      <Link className="primary-button inline-button" to="/">
        <ArrowLeft size={20} />
        Về trang chính
      </Link>
    </main>
  )
}
