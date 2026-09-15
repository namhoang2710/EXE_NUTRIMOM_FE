import { BookOpenText, Eye, Funnel, Plus } from '@phosphor-icons/react'
import { adminApi } from '../api/admin-api'
import { PageHeading, ResourceState, StatusBadge, TableCard } from '../components/AdminUI'
import { useAdminResource } from '../hooks/useAdminResource'
import { formatAdminDate } from '../model/admin-formatters'

export function AdminKnowledgePage() {
  const resource = useAdminResource(adminApi.getKnowledgeArticles)
  const articles = resource.data ?? []
  return <div className="admin-page">
    <PageHeading title="Knowledge" description="Manage educational content, clinical reviews and publishing workflow." actions={<button className="admin-button primary" type="button"><Plus size={18} />New article</button>} />
    <div className="admin-summary-strip"><div><strong>248</strong><span>Published</span></div><div><strong>14</strong><span>In review</span></div><div><strong>32K</strong><span>Views this month</span></div><div><strong>6m 24s</strong><span>Avg. read time</span></div></div>
    <TableCard title="Content library" description="Articles and educational resources" action={<button className="admin-button compact secondary" type="button"><Funnel size={17} />Filter</button>}>
      <ResourceState status={resource.status} empty={articles.length === 0} error={resource.error} onRetry={resource.retry}>
        <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Article</th><th>Category</th><th>Author</th><th>Views</th><th>Updated</th><th>Status</th></tr></thead><tbody>
          {articles.map((article) => <tr key={article.id}><td><div className="admin-article-cell"><span><BookOpenText size={19} /></span><div><strong>{article.title}</strong><small>{article.id}</small></div></div></td><td>{article.category}</td><td>{article.author}</td><td><span className="admin-view-count"><Eye size={16} />{article.views.toLocaleString('en-US')}</span></td><td>{formatAdminDate(article.updatedAt)}</td><td><StatusBadge value={article.status} /></td></tr>)}
        </tbody></table></div>
      </ResourceState>
    </TableCard>
  </div>
}
