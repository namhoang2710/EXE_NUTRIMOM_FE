import { useEffect, useRef, useState } from 'react'
import { GearSix, ArrowLeft, BookOpenText } from '@phosphor-icons/react'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { AnimatedSelect } from '@/components/ui/animated-select'
import { SegmentedNavigation } from '@/components/ui/segmented-navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { nutritionApi } from '../api/nutrition-api'
import { useNutritionRead } from '../hooks/useNutritionRead'
import { useNutritionCooldown } from '../hooks/useNutritionCooldown'
import {
  localDate,
  nutritionUrl,
  readPlanIndex,
  rememberPlan,
  validDate,
  planNeedsReview,
} from '../model/nutrition-helpers'
import { displayDate } from '../model/nutrition-presentation'
import type {
  DiaryView,
  MealPlan,
  SaveNutritionProfileResponse,
} from '../model/nutrition-types'
import { DiaryComposer, type DiarySeed } from '../components/DiaryComposer'
import { DiaryWorkspace } from '../components/DiaryWorkspace'
import { NutritionError } from '../components/NutritionShared'
import {
  NutritionButton,
  NutritionLoading,
  NutritionNotice,
} from '../components/NutritionUI'
import { ProfileWizard } from '../components/ProfileWizard'
import { RecipeExplore } from '../components/RecipeExplore'
import { RecipeDetails } from '../components/RecipeDetails'
import { PlanWorkspace } from '../components/PlanWorkspace'
import { TodayWorkspace } from '../components/TodayWorkspace'
import { ShoppingWorkspace } from '../components/ShoppingWorkspace'
import { NutritionGuideDialog } from '../components/NutritionGuideDialog'
import '../styles/nutrition.css'
import '../styles/nutrition-refinements.css'

const tabs = {
  today: 'Hôm nay',
  plan: 'Thực đơn',
  explore: 'Khám phá',
  diary: 'Nhật ký',
}
export function NutritionPage() {
  const { user } = useAuth()
  useEffect(() => {
    const theme = localStorage.getItem('nutrimom.theme')
    if (theme === 'dark' || theme === 'light')
      document.documentElement.dataset.theme = theme
  }, [])
  return user ? <NutritionAccount key={user.id} accountId={user.id} /> : null
}
function NutritionAccount({ accountId }: { accountId: string }) {
  const location = useLocation(),
    navigate = useNavigate(),
    [query] = useSearchParams()
  const { recipeId, planId: shoppingPlanId } = useParams()
  const profileRead = useNutritionRead(
    `profile:${accountId}`,
    (signal) => nutritionApi.profile(signal),
    true,
    nutritionApi.cached.profile,
  )
  const profile = profileRead.data
  const tab =
    query.get('tab') && Object.hasOwn(tabs, query.get('tab')!)
      ? (query.get('tab')! as keyof typeof tabs)
      : 'today'
  const today = profile?.pregnancy.local_date || localDate()
  const date =
    tab === 'today' && !recipeId
      ? today
      : validDate(query.get('date'))
        ? query.get('date')!
        : today
  const [indexRevision, setIndexRevision] = useState(0)
  const [wizard, setWizard] = useState<number | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  useEffect(() => {
    const selector =
      '.nutrition-profile-menu[open], .nutrition-entry-menu[open]'
    const outside = (event: PointerEvent) => {
      document
        .querySelectorAll<HTMLDetailsElement>(selector)
        .forEach((menu) => {
          if (!menu.contains(event.target as Node)) menu.open = false
        })
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      document
        .querySelectorAll<HTMLDetailsElement>(selector)
        .forEach((menu) => {
          menu.open = false
          menu.querySelector('summary')?.focus()
        })
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [])
  const [notice, setNotice] = useState('')
  const [composer, setComposer] = useState<DiarySeed | null>(null)
  const [diaryResult, setDiaryResult] = useState<DiaryView | null>(null)
  const [hasPreview, setHasPreview] = useState(false)
  const index = readPlanIndex(localStorage, accountId)
  const requestedPlanId =
    shoppingPlanId ||
    query.get('plan') ||
    (query.get('draft') === '1' ? undefined : index[date])
  const personalCooldown = useNutritionCooldown(),
    catalogCooldown = useNutritionCooldown('catalog')
  const diaryRead = useNutritionRead(
    `diary:${accountId}:${date}`,
    (signal) => nutritionApi.diary(date, signal),
    !recipeId &&
      !shoppingPlanId &&
      (tab === 'diary' ||
        // A saved plan for today's local date already establishes the need for
        // its diary. Read it alongside the profile instead of waiting for it.
        (tab === 'today' &&
          Boolean(profile ? profile.profile_version > 0 : index[date]))),
    () => nutritionApi.cached.diary(date),
  )
  const replaceDiary = diaryRead.replace
  useEffect(() => {
    if (
      diaryResult &&
      diaryResult.local_date === date &&
      (tab === 'diary' || tab === 'today')
    ) {
      replaceDiary(diaryResult)
      setDiaryResult(null)
    }
  }, [diaryResult, date, tab, replaceDiary])
  function acceptDiary(result: DiaryView, sourceDate: string) {
    if (!mounted.current || currentView.current !== view) return
    setComposer(null)
    setDiaryResult(result)
    navigate(nutritionUrl('diary', result.local_date))
    if (sourceDate !== result.local_date)
      void nutritionApi
        .diary(sourceDate)
        .catch(() =>
          setNotice(
            'Món đã được chuyển. Mở lại ngày cũ để xem dữ liệu mới nhất.',
          ),
        )
  }
  const loadPlan = Boolean(
    requestedPlanId &&
    (recipeId
      ? query.get('source_item') && query.get('plan')
      : shoppingPlanId || tab === 'today' || tab === 'plan'),
  )
  const planRead = useNutritionRead(
    `plan:${accountId}:${requestedPlanId || ''}`,
    (signal) => nutritionApi.plan(requestedPlanId!, signal),
    loadPlan,
    () => nutritionApi.cached.plan(requestedPlanId || ''),
  )
  const plan = planRead.data
  const view = `${location.pathname}${location.search}`
  const currentView = useRef(view)
  currentView.current = view
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  // A save may finish after navigation; refresh the plan currently displayed,
  // never a captured plan from the old screen.
  const activePlan = useRef({ loadPlan, reload: planRead.reload })
  activePlan.current = { loadPlan, reload: planRead.reload }
  const [profileSave, setProfileSave] =
    useState<SaveNutritionProfileResponse | null>(null)
  const reloadPlan = planRead.reload
  const observedProfileVersion = useRef(profile?.profile_version)
  useEffect(() => {
    const previous = observedProfileVersion.current
    observedProfileVersion.current = profile?.profile_version
    if (
      previous != null &&
      profile &&
      previous !== profile.profile_version &&
      loadPlan
    )
      reloadPlan()
  }, [profile, loadPlan, reloadPlan])
  useEffect(() => {
    if (plan) rememberPlan(localStorage, accountId, plan)
  }, [accountId, plan])
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key?.startsWith('nutrimom.nutrition.plans.v1:'))
        setIndexRevision((value) => value + 1)
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])
  const lastFocus = useRef(Date.now())
  const reloadProfile = profileRead.reload
  useEffect(() => {
    const refresh = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastFocus.current >= 30_000
      ) {
        lastFocus.current = Date.now()
        reloadProfile()
      }
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [reloadProfile])
  async function recover() {
    const [latestProfile, latestPlan] = await Promise.all([
      nutritionApi.profile(undefined, true),
      requestedPlanId
        ? nutritionApi.plan(requestedPlanId, undefined, true)
        : Promise.resolve(null),
    ])
    if (!mounted.current || currentView.current !== view) return
    observedProfileVersion.current = latestProfile.profile_version
    profileRead.replace(latestProfile)
    if (latestPlan) planRead.replace(latestPlan)
  }
  function acceptProfile(result: SaveNutritionProfileResponse) {
    if (!mounted.current) return
    observedProfileVersion.current = result.profile_version
    profileRead.replace(result.profile)
    setProfileSave(result)
    if (activePlan.current.loadPlan) activePlan.current.reload()
  }
  function acceptPlan(latest: MealPlan) {
    if (!mounted.current || currentView.current !== view) return
    if (!rememberPlan(localStorage, accountId, latest))
      setNotice(
        'Trình duyệt chưa lưu được mã thực đơn. Hãy giữ đường dẫn này để mở lại.',
      )
    planRead.replace(latest)
    const target = nutritionUrl(
      'plan',
      latest.days.some((day) => day.local_date === date)
        ? date
        : latest.start_date,
      latest.plan_id,
    )
    if (location.pathname + location.search !== target) navigate(target)
  }
  const backQuery = new URLSearchParams(query)
  backQuery.set('tab', tab)
  backQuery.set('date', date)
  const recipeSlot = plan?.days
    .find((day) => day.local_date === date)
    ?.slots.find((slot) =>
      slot.items.some(
        (item) =>
          item.item_id === query.get('source_item') &&
          item.recipe_id === recipeId,
      ),
    )
  const recipeItem = recipeSlot?.items.find(
    (item) =>
      item.item_id === query.get('source_item') && item.recipe_id === recipeId,
  )
  const validPlanDate =
    !plan || hasPreview || plan.days.some((day) => day.local_date === date)
  const initialLoading = profileRead.loading && !profile
  const initialPlanLoading = loadPlan && planRead.loading && !plan
  return (
    <main
      className="nutrition-page nutrition-page--banner"
      data-index-revision={indexRevision}
    >
      <header className="nutrition-banner">
        <img
          className="nutrition-banner__image"
          src={`${import.meta.env.BASE_URL}bannerDD.png`}
          alt=""
          width={1916}
          height={821}
          fetchPriority="high"
          decoding="async"
        />
        <div className="nutrition-banner__inner">
          <div className="nutrition-header nutrition-banner__glass">
            <div>
              <h1>Dinh dưỡng là điều quan trọng nhất của một người mẹ bầu</h1>
              <p>
                {tab === 'today'
                  ? `Hôm nay · ${displayDate(date)}`
                  : displayDate(date, true)}
                {profile && (
                  <>
                    {' '}
                    <span>·</span> Tuần {profile.pregnancy.gestational_week}{' '}
                    ngày {profile.pregnancy.gestational_day}
                  </>
                )}
              </p>
            </div>
            <div className="nutrition-banner-actions">
              <NutritionButton
                className="is-primary nutrition-guide-trigger"
                aria-haspopup="dialog"
                aria-expanded={guideOpen}
                onClick={() => {
                  document
                    .querySelectorAll<HTMLDetailsElement>(
                      '.nutrition-profile-menu[open], .nutrition-entry-menu[open]',
                    )
                    .forEach((menu) => {
                      menu.open = false
                    })
                  setGuideOpen(true)
                }}
              >
                <BookOpenText size={18} weight="duotone" />
                Hướng dẫn sử dụng
              </NutritionButton>
              {profile && profile.profile_version > 0 ? (
                <details className="nutrition-profile-menu">
                  <summary>
                    <GearSix size={18} />
                    Hồ sơ ăn uống
                  </summary>
                  <div>
                    {[
                      'Thai kỳ',
                      'Dị ứng',
                      'Khẩu vị',
                      'Sinh hoạt',
                      'Năng lượng',
                    ].map((label, index) => (
                      <NutritionButton
                        key={label}
                        onClick={(event) => {
                          const menu = event.currentTarget.closest('details')
                          if (menu) {
                            menu.open = false
                            menu.querySelector('summary')?.focus()
                          }
                          setWizard(index)
                        }}
                      >
                        {label}
                      </NutritionButton>
                    ))}
                  </div>
                </details>
              ) : (
                <NutritionButton
                  disabled={initialLoading}
                  onClick={() => setWizard(0)}
                >
                  <GearSix data-icon="inline-start" />
                  Hồ sơ ăn uống
                </NutritionButton>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="nutrition-content">
        <SegmentedNavigation
          className="nutrition-tabs"
          label="Điều hướng dinh dưỡng"
          value={!recipeId && !shoppingPlanId ? tab : undefined}
          items={Object.entries(tabs).map(([key, label]) => ({
            value: key,
            label,
            to: nutritionUrl(
              key,
              key === 'today' ? today : date,
              key === 'today'
                ? index[today]
                : key === 'plan'
                  ? requestedPlanId
                  : null,
            ),
          }))}
        />
        {(personalCooldown.blocked || catalogCooldown.blocked) && (
          <NutritionNotice title="Bạn đang thao tác hơi nhanh">
            Vui lòng chờ{' '}
            {Math.max(personalCooldown.remaining, catalogCooldown.remaining)}{' '}
            giây trước khi tải hoặc gửi tiếp. Các lựa chọn của bạn vẫn được giữ.
          </NutritionNotice>
        )}
        {notice && <NutritionNotice>{notice}</NutritionNotice>}
        <NutritionError error={profileRead.error} retry={reloadProfile} />
        {Boolean(profileRead.error) && !profile && (
          <div className="nutrition-actions">
            <Link className="nutrition-button" to="/app/profile/health">
              Mở hồ sơ thai kỳ
            </Link>
            <Link
              className="nutrition-text-link"
              to={nutritionUrl('explore', date)}
            >
              Xem công thức
            </Link>
          </div>
        )}
        {profile?.pregnancy.auto_plan_paused && (
          <NutritionNotice title="Cần cập nhật hồ sơ thai kỳ">
            Đang tạm dừng tạo thực đơn theo hồ sơ hiện tại. Bạn vẫn xem được
            công thức.
            <div>
              <Link className="nutrition-text-link" to="/app/profile/health">
                Cập nhật thai kỳ
              </Link>
            </div>
          </NutritionNotice>
        )}
        {profile?.allergy_status === 'UNKNOWN' && !recipeId && (
          <NutritionNotice title="Bạn chưa xác nhận tình trạng dị ứng">
            Vẫn có thể xem công thức. Hãy xác nhận trước khi lưu thực đơn cá
            nhân hóa.{' '}
            <NutritionButton
              className="nutrition-text-link"
              onClick={() => setWizard(1)}
            >
              Cập nhật dị ứng
            </NutritionButton>
          </NutritionNotice>
        )}
        {recipeId ? (
          <RecipeDetails
            key={recipeId}
            recipeId={recipeId}
            profile={profile}
            onSaved={acceptProfile}
            backUrl={`/app/nutrition?${backQuery}`}
            date={date}
            onLog={setComposer}
            planSeed={
              recipeItem && recipeSlot
                ? { date, meal: recipeSlot.meal_type, item: recipeItem }
                : undefined
            }
            planLoading={
              Boolean(query.get('source_item')) &&
              (planRead.loading || Boolean(planRead.error))
            }
          />
        ) : shoppingPlanId ? (
          <>
            <NutritionError error={planRead.error} retry={planRead.reload} />
            {initialPlanLoading && (
              <NutritionLoading label="Đang mở danh sách mua sắm…" />
            )}
            {plan && profile && planNeedsReview(plan) && (
              <NutritionNotice title="Thực đơn cần kiểm tra">
                Có món cần đổi theo hồ sơ hiện tại. Mở thực đơn để xem lý do và
                đổi từng món.
              </NutritionNotice>
            )}
            {plan && (
              <ShoppingWorkspace key={plan.plan_id} plan={plan} date={date} />
            )}
          </>
        ) : tab === 'explore' ? (
          <RecipeExplore onLog={setComposer} date={date} />
        ) : initialLoading ? (
          <NutritionLoading
            label="Đang chuẩn bị dinh dưỡng của bạn…"
            variant="page"
          />
        ) : tab === 'diary' ? (
          <DiaryWorkspace
            key={date}
            date={date}
            view={diaryRead.data}
            loading={diaryRead.loading}
            error={diaryRead.error}
            reload={diaryRead.reload}
            onDate={(value) => navigate(nutritionUrl('diary', value))}
            onCompose={setComposer}
            onSaved={acceptDiary}
          />
        ) : (
          <>
            <NutritionError error={planRead.error} retry={planRead.reload} />
            {initialPlanLoading && (
              <NutritionLoading label="Đang mở thực đơn…" />
            )}
            {planRead.loading && plan && (
              <NutritionLoading label="Đang cập nhật thực đơn…" updating />
            )}
            {!validPlanDate && plan && (
              <NutritionNotice title="Ngày này nằm ngoài thực đơn đang mở">
                <Link
                  className="nutrition-text-link"
                  to={nutritionUrl('plan', plan.start_date, plan.plan_id)}
                >
                  Mở từ ngày {displayDate(plan.start_date)}
                </Link>
              </NutritionNotice>
            )}
            {!initialPlanLoading &&
              (tab === 'today'
                ? profile && (
                    <>
                      <NutritionError
                        error={diaryRead.error}
                        retry={diaryRead.reload}
                      />
                      {diaryRead.loading && (
                        <NutritionLoading
                          label="Đang cập nhật nhật ký hôm nay…"
                          updating
                        />
                      )}
                      <TodayWorkspace
                        profile={profile}
                        plan={plan}
                        planUpdating={
                          planRead.loading || Boolean(planRead.error)
                        }
                        diary={diaryRead.data}
                        date={today}
                        onProfile={() => setWizard(0)}
                        onLog={setComposer}
                      />
                    </>
                  )
                : (profile || plan) && (
                    <>
                      {Object.keys(index).length > 0 && (
                        <div className="nutrition-plan-toolbar">
                          <Link
                            className="nutrition-text-link"
                            to={nutritionUrl('today', today, index[today])}
                          >
                            <ArrowLeft size={16} />
                            Về hôm nay
                          </Link>
                          <AnimatedSelect
                            className="nutrition-select"
                            label="Mở thực đơn đã lưu trên thiết bị này"
                            value={index[date] ? date : ''}
                            options={[
                              { value: '', label: 'Chọn ngày đã lưu' },
                              ...Object.keys(index)
                                .sort()
                                .reverse()
                                .map((day) => ({
                                  value: day,
                                  label: displayDate(day),
                                })),
                            ]}
                            onValueChange={(value) => {
                              if (value)
                                navigate(
                                  nutritionUrl('plan', value, index[value]),
                                )
                            }}
                          />
                        </div>
                      )}
                      <PlanWorkspace
                        key={`${requestedPlanId || 'new'}:${profile?.profile_id || ''}`}
                        plan={plan}
                        profile={profile}
                        date={date}
                        search={location.search}
                        onPlan={acceptPlan}
                        recover={recover}
                        openProfile={() => setWizard(1)}
                        onLog={setComposer}
                        onPreviewState={setHasPreview}
                        planUpdating={
                          planRead.loading || Boolean(planRead.error)
                        }
                        profileSave={profileSave}
                        onDay={(value, draft) => {
                          const next = new URLSearchParams(query)
                          next.set('date', value)
                          if (plan) next.set('plan', plan.plan_id)
                          if (draft) next.set('draft', '1')
                          else next.delete('draft')
                          navigate(`/app/nutrition?${next}`)
                        }}
                      />
                    </>
                  ))}
          </>
        )}
        <footer className="nutrition-disclaimer">
          Số liệu dinh dưỡng và giá từ dữ liệu mẫu là ước tính tham khảo.
        </footer>
      </div>
      <NutritionGuideDialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        accountId={accountId}
      />
      {wizard != null && (
        <ProfileWizard
          key={wizard}
          profile={profile}
          initialStep={wizard}
          onSaved={acceptProfile}
          onClose={() => setWizard(null)}
        />
      )}
      {composer && (
        <DiaryComposer
          seed={composer}
          onClose={() => setComposer(null)}
          onSaved={acceptDiary}
        />
      )}
    </main>
  )
}
