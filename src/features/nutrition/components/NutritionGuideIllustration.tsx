import {
  ArrowRight,
  BowlFood,
  CalendarBlank,
  Check,
  CheckCircle,
  Heart,
  ListChecks,
  LockSimple,
  Notebook,
  ShieldCheck,
  ShoppingCart,
  Sparkle,
  Timer,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { GuideScene } from '../model/nutrition-guide'

function MockButton({
  children,
  soft = false,
}: {
  children: ReactNode
  soft?: boolean
}) {
  return (
    <span className={`nutrition-guide-mock-button${soft ? ' is-soft' : ''}`}>
      {children}
    </span>
  )
}
function MockMeal({
  status,
  children,
}: {
  status: string
  children?: ReactNode
}) {
  return (
    <div className="nutrition-guide-mock-meal">
      <span className="nutrition-guide-mock-food">
        <BowlFood size={34} weight="duotone" />
      </span>
      <div>
        <span className="nutrition-guide-mock-status">{status}</span>
        <strong>Cháo yến mạch chuối</strong>
        <span className="nutrition-guide-mock-meta">
          1 phần · khoảng 15 phút
        </span>
        {children}
      </div>
    </div>
  )
}

export function NutritionGuideIllustration({ scene }: { scene: GuideScene }) {
  let content: ReactNode
  switch (scene) {
    case 'welcome':
      content = (
        <div className="nutrition-guide-journey">
          {[
            { Icon: Heart, label: 'Hiểu bạn' },
            { Icon: BowlFood, label: 'Chọn món' },
            { Icon: ShoppingCart, label: 'Chuẩn bị' },
            { Icon: Notebook, label: 'Ghi bữa ăn' },
          ].map(({ Icon, label }, index) => (
            <div key={label}>
              <span>
                <Icon size={28} weight="duotone" />
              </span>
              <strong>{label}</strong>
              {index < 3 && (
                <ArrowRight
                  className="nutrition-guide-journey-arrow"
                  size={16}
                />
              )}
            </div>
          ))}
        </div>
      )
      break
    case 'tabs':
      content = (
        <>
          <div className="nutrition-guide-mock-tabs">
            {['Hôm nay', 'Thực đơn', 'Khám phá', 'Nhật ký'].map((label, i) => (
              <span key={label} className={i === 0 ? 'is-active' : ''}>
                {label}
              </span>
            ))}
          </div>
          <MockMeal status="Bữa trưa hôm nay">
            <div className="nutrition-guide-mock-actions">
              <MockButton>
                Ghi đã ăn <Check size={14} />
              </MockButton>
            </div>
          </MockMeal>
        </>
      )
      break
    case 'profile':
      content = (
        <div className="nutrition-guide-mock-profile">
          <ShieldCheck size={32} weight="duotone" />
          <strong>Hồ sơ ăn uống</strong>
          <div className="nutrition-guide-mock-options">
            <span>Thai kỳ</span>
            <span className="is-selected">
              Dị ứng <Check size={14} />
            </span>
            <span>Khẩu vị</span>
          </div>
          <p>Chọn đúng tình trạng của bạn</p>
          <MockButton>
            Lưu và tiếp tục <ArrowRight size={14} />
          </MockButton>
        </div>
      )
      break
    case 'preferences':
      content = (
        <div className="nutrition-guide-mock-preferences">
          <div>
            <Timer size={24} weight="duotone" />
            <strong>Theo thời gian của bạn</strong>
            <span>Thời gian nấu · tùy chọn</span>
          </div>
          <div>
            <BowlFood size={24} weight="duotone" />
            <strong>Theo bữa bạn cần</strong>
            <span>Bữa sáng · Bữa trưa · Bữa tối</span>
          </div>
          <div>
            <Heart size={24} weight="duotone" />
            <strong>Theo khẩu vị của bạn</strong>
            <span>Chọn những món bạn thích</span>
          </div>
        </div>
      )
      break
    case 'explore':
      content = (
        <>
          <div className="nutrition-guide-mock-options">
            <span className="is-selected">Bữa sáng</span>
            <span>Nấu nhanh</span>
          </div>
          <MockMeal status="Khám phá món ăn">
            <div className="nutrition-guide-mock-actions">
              <MockButton>
                Xem cách nấu <ArrowRight size={14} />
              </MockButton>
              <Heart size={20} weight="duotone" />
            </div>
          </MockMeal>
        </>
      )
      break
    case 'create':
      content = (
        <div className="nutrition-guide-mock-profile">
          <span className="nutrition-guide-mock-status">
            <CalendarBlank size={15} /> Ngày và bữa
          </span>
          <strong>Bạn muốn chuẩn bị mấy ngày?</strong>
          <div className="nutrition-guide-mock-options">
            <span className="is-selected">
              1 ngày <Check size={14} />
            </span>
            <span>3 ngày</span>
            <span>7 ngày</span>
          </div>
          <MockButton>
            Tạo bản xem trước <Sparkle size={15} />
          </MockButton>
        </div>
      )
      break
    case 'edit':
      content = (
        <MockMeal status="Đã lưu">
          <div className="nutrition-guide-mock-actions">
            <MockButton>Đổi món / khẩu phần</MockButton>
            <MockButton soft>
              <LockSimple size={14} /> Giữ món
            </MockButton>
          </div>
        </MockMeal>
      )
      break
    case 'shopping':
      content = (
        <div className="nutrition-guide-mock-checklist">
          {[
            { name: 'Rau xanh', state: 'Cần mua' },
            { name: 'Gạo', state: 'Đã có' },
            { name: 'Trứng', state: 'Đã mua' },
          ].map(({ name, state }, i) => (
            <div key={name}>
              <span className={i ? 'is-checked' : ''}>
                {i ? <Check size={16} /> : <ShoppingCart size={16} />}
              </span>
              <strong>{name}</strong>
              <small>{state}</small>
            </div>
          ))}
        </div>
      )
      break
    case 'diary':
      content = (
        <div className="nutrition-guide-mock-comparison">
          <div>
            <CalendarBlank size={24} weight="duotone" />
            <span>Thực đơn dự kiến</span>
            <strong>1 phần</strong>
          </div>
          <ArrowRight size={20} />
          <div>
            <Notebook size={24} weight="duotone" />
            <span>Bạn xác nhận đã ăn</span>
            <strong>½ phần</strong>
          </div>
          <p>Ghi theo lượng thực tế bạn đã ăn</p>
        </div>
      )
      break
    case 'update':
      content = (
        <>
          <MockMeal status="Cần đổi">
            <div className="nutrition-guide-mock-actions">
              <MockButton>
                Đổi món <ArrowRight size={14} />
              </MockButton>
            </div>
          </MockMeal>
          <div className="nutrition-guide-mock-note">
            <CheckCircle size={18} weight="duotone" /> Bữa đã ghi được giữ
            nguyên
          </div>
        </>
      )
      break
    case 'understand':
      content = (
        <div className="nutrition-guide-mock-comparison">
          <div>
            <ListChecks size={24} weight="duotone" />
            <span>Dự kiến</span>
            <strong>Từ thực đơn</strong>
          </div>
          <span className="nutrition-guide-mock-separator">·</span>
          <div>
            <Notebook size={24} weight="duotone" />
            <span>Đã ghi</span>
            <strong>Từ bữa đã ăn</strong>
          </div>
          <p>Hai phần riêng, không cộng chung</p>
        </div>
      )
      break
  }
  return (
    <figure className="nutrition-guide-illustration">
      <div aria-hidden="true" className={`nutrition-guide-scene is-${scene}`}>
        {content}
      </div>
      <figcaption>Hình minh họa</figcaption>
    </figure>
  )
}
