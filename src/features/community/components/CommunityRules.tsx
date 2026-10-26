import { CaretDown, CheckCircle, ShieldCheck } from '@phosphor-icons/react'
import { Collapsible } from '@base-ui/react/collapsible'

const rules = [
  'Tôn trọng, lắng nghe và động viên nhau.',
  'Không quảng cáo, bán hàng hay để lại thông tin liên hệ.',
  'Thông tin sức khoẻ chỉ mang tính tham khảo — hãy hỏi bác sĩ khi cần.',
  'Không chia sẻ thông tin cá nhân của người khác.',
]

function RulesList() {
  return <ul className="nm-community-rules__list">{rules.map((rule) => <li key={rule}><CheckCircle size={18} weight="fill" aria-hidden /><span>{rule}</span></li>)}</ul>
}

/** Rules are local content: opening them never fetches data. */
export function CommunityRules({ collapsible = false }: { collapsible?: boolean }) {
  if (collapsible) return <Collapsible.Root className="nm-community-rules is-collapsible">
    <Collapsible.Trigger className="nm-community-rules__trigger"><ShieldCheck size={20} aria-hidden /><span>Quy tắc cộng đồng</span><CaretDown size={16} aria-hidden /></Collapsible.Trigger>
    <Collapsible.Panel className="nm-community-rules__panel"><RulesList /></Collapsible.Panel>
  </Collapsible.Root>
  return <section className="nm-community-widget nm-community-rules"><h2><ShieldCheck size={20} weight="duotone" aria-hidden />Quy tắc cộng đồng</h2><RulesList /></section>
}
