import { Link } from 'react-router-dom'

interface FeaturePlaceholderProps {
  eyebrow: string
  title: string
  description: string
}

export function FeaturePlaceholder({ eyebrow, title, description }: FeaturePlaceholderProps) {
  return (
    <main className="feature-placeholder">
      <section>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <Link to="/app/account">Về trang tài khoản</Link>
      </section>
    </main>
  )
}
