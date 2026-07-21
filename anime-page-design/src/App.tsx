import { useState, useRef, useEffect } from 'react'
import { BookMarked, Eye, PauseCircle, ChevronDown, Check, List } from 'lucide-react'

const BANNER = 'https://images.unsplash.com/photo-1710216106278-a64505ca2141?w=1920&h=700&fit=crop&auto=format'
const COVER = 'https://images.unsplash.com/photo-1644417089758-54153e3a7a6b?w=400&h=560&fit=crop&auto=format'

const THUMBS = [
  'https://images.unsplash.com/photo-1710216106278-a64505ca2141?w=480&h=270&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1744204876894-2591d3b1f42e?w=480&h=270&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1679991811881-f54887f731c7?w=480&h=270&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1761213630808-1a557a03e00d?w=480&h=270&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1762268861745-c3e879d1c2b8?w=480&h=270&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1677143016687-8dbb7e71db08?w=480&h=270&fit=crop&auto=format',
]

const S1_TITLES = [
  'Я — куколка из инструментов',
  'Мне хочется знать, что такое любовь',
  'Куклы, которые сочиняют письма',
  'Страдание не приносит мне ничего',
  'Слова сакуры',
  'Звёздная деревня',
  'Принцесса и Куколка',
  'Тот, кто написал письмо дочери',
  'Я хотела передать это тебе',
  'Ты никогда не забудешь обо мне',
  'Письмо для тебя, мама',
  'Я буду любить тебя вечно',
]

const S2_TITLES = [
  'Новое поручение',
  'Осколки воспоминаний',
  'Мост из слов',
  'Письмо солдата',
  'Цветок для Эрики',
  'Ночное небо над Лейденшафтлих',
  'Возвращение',
  'Последнее желание',
  'Там, где живёт любовь',
  'Письма, которые не отправили',
  'Встреча на перекрёстке',
  'Всегда буду рядом',
]

const makeEpisodes = (titles: string[], season: number) =>
  titles.map((title, i) => ({
    n: i + 1,
    season,
    title,
    duration: '24 мин',
    thumb: THUMBS[i % THUMBS.length],
  }))

const ALL_EPISODES = {
  1: makeEpisodes(S1_TITLES, 1),
  2: makeEpisodes(S2_TITLES, 2),
}

const CONNECTED = [
  { title: 'Violet Evergarden: Вечность и Кукла-автомемори', relation: 'Фильм', year: 2019, score: 9.0, img: 'https://images.unsplash.com/photo-1761213630808-1a557a03e00d?w=200&h=280&fit=crop&auto=format' },
  { title: 'Violet Evergarden: Фильм', relation: 'Фильм (финал)', year: 2020, score: 9.4, img: 'https://images.unsplash.com/photo-1771276397688-a851b19bd5c9?w=200&h=280&fit=crop&auto=format' },
  { title: 'Violet Evergarden: Side Story', relation: 'OVA', year: 2018, score: 8.7, img: 'https://images.unsplash.com/photo-1762268861745-c3e879d1c2b8?w=200&h=280&fit=crop&auto=format' },
  { title: 'Violet Evergarden: Recollections', relation: 'Спецвыпуск', year: 2020, score: 8.5, img: 'https://images.unsplash.com/photo-1744204876894-2591d3b1f42e?w=200&h=280&fit=crop&auto=format' },
  { title: 'Violet Evergarden (манга)', relation: 'Манга-оригинал', year: 2015, score: 9.1, img: 'https://images.unsplash.com/photo-1679991811881-f54887f731c7?w=200&h=280&fit=crop&auto=format' },
  { title: 'Kyoto Animation Works', relation: 'От той же студии', year: 2021, score: 8.8, img: 'https://images.unsplash.com/photo-1677143016687-8dbb7e71db08?w=200&h=280&fit=crop&auto=format' },
]

const CAST = [
  { name: 'Юй Исикава', role: 'Вайолет Эвергарден', type: 'Озвучка (JP)', img: 'https://images.unsplash.com/photo-1657180881998-c8a03ef22695?w=120&h=120&fit=crop&auto=format' },
  { name: 'Дайсуке Намикава', role: 'Гилберт Будгенхольм', type: 'Озвучка (JP)', img: 'https://images.unsplash.com/photo-1641901960200-1e878f0cbf63?w=120&h=120&fit=crop&auto=format' },
  { name: 'Минами Такахаси', role: 'Эрика Браун', type: 'Озвучка (JP)', img: 'https://images.unsplash.com/photo-1712168567859-e24cbc155219?w=120&h=120&fit=crop&auto=format' },
  { name: 'Амаэ Окуяма', role: 'Кэтрин Ваун', type: 'Озвучка (JP)', img: 'https://images.unsplash.com/photo-1613658501648-58f72a09355f?w=120&h=120&fit=crop&auto=format' },
  { name: 'Такехито Коясу', role: 'Клодия Ходжинс', type: 'Озвучка (JP)', img: 'https://images.unsplash.com/photo-1706076463257-20b41d9519f0?w=120&h=120&fit=crop&auto=format' },
  { name: 'Харука Томацу', role: 'Принцесса Шарлотта', type: 'Озвучка (JP)', img: 'https://images.unsplash.com/photo-1606163760684-e73bab942458?w=120&h=120&fit=crop&auto=format' },
]

const COMMENTS = [
  { user: 'sakura_dreams', avatar: 'С', date: '18 июля 2026', text: 'Это аниме буквально разрушило меня. Я смотрела 5 серию в три часа ночи и рыдала навзрыд. Вайолет — один из самых глубоких персонажей, которых я видела.', likes: 342 },
  { user: 'otaku_overlord', avatar: 'О', date: '15 июля 2026', text: 'Анимация от Kyoto Animation — это просто нечто запредельное. Каждый кадр как произведение искусства. Цветовая палитра, движение волос, световые блики... безупречно.', likes: 218 },
  { user: 'NightWatcher99', avatar: 'N', date: '12 июля 2026', text: 'Пересматривал второй раз и заметил кучу деталей, которые пропустил в первый. Режиссёр зашифровал много символики в каждой сцене. 10/10 без обсуждений.', likes: 189 },
  { user: 'мелодия_грусти', avatar: 'М', date: '8 июля 2026', text: 'Музыка Эвана Колла идеально дополняет происходящее на экране. «Violet Snow» — одна из лучших опенинг-тем в истории аниме. Слушаю её отдельно как полноценное произведение.', likes: 156 },
  { user: 'anime_philosopher', avatar: 'A', date: '3 июля 2026', text: 'Тема «что такое любовь» раскрывается через письма — гениально. Вайолет учится понимать людей через их слова, и мы вместе с ней открываем что-то важное о человеческих связях.', likes: 134 },
]

const TABS = ['Серии', 'Актёры', 'Связанное', 'Комментарии'] as const
type Tab = typeof TABS[number]

type ListStatus = null | 'planned' | 'watched' | 'deferred'

function StarRating({ score }: { score: number }) {
  const full = Math.floor(score / 2)
  const half = (score / 2) % 1 >= 0.5
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24"
          fill={i < full ? '#e8547a' : i === full && half ? 'url(#hg)' : 'none'}
          stroke="#e8547a" strokeWidth="2">
          <defs>
            <linearGradient id="hg">
              <stop offset="50%" stopColor="#e8547a" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
      <span style={{ color: '#e8547a', fontWeight: 800, fontSize: '14px', marginLeft: '4px' }}>{score}</span>
    </div>
  )
}

const LIST_OPTIONS = [
  { key: 'planned' as ListStatus, label: 'В планах', Icon: BookMarked },
  { key: 'watched' as ListStatus, label: 'Просмотрено', Icon: Eye },
  { key: 'deferred' as ListStatus, label: 'Отложено', Icon: PauseCircle },
]

function ListDropdown({ status, onChange }: { status: ListStatus; onChange: (s: ListStatus) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const active = LIST_OPTIONS.find(o => o.key === status)

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: status ? '#1e0e16' : 'transparent',
          border: `1px solid ${status ? '#e8547a' : '#3a1a26'}`,
          borderRadius: '8px', padding: '9px 14px',
          color: status ? '#e8547a' : '#9a7585',
          fontFamily: '"Nunito", sans-serif', fontWeight: 700, fontSize: '14px',
          cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!status) { e.currentTarget.style.borderColor = '#e8547a'; e.currentTarget.style.color = '#e8547a' } }}
        onMouseLeave={e => { if (!status) { e.currentTarget.style.borderColor = '#3a1a26'; e.currentTarget.style.color = '#9a7585' } }}
      >
        {active ? <active.Icon size={15} /> : <List size={15} />}
        {active ? active.label : 'В коллекцию'}
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: 0.7 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: '#180c12', border: '1px solid #3a1a26', borderRadius: '10px',
          overflow: 'hidden', minWidth: '190px',
          boxShadow: '0 12px 40px #0a050799, 0 0 0 1px #3a1a2644',
        }}>
          {LIST_OPTIONS.map(({ key, label, Icon }) => {
            const isActive = status === key
            return (
              <button
                key={key}
                onClick={() => { onChange(isActive ? null : key); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', background: isActive ? '#280f1b' : 'transparent',
                  border: 'none', borderBottom: '1px solid #3a1a2644',
                  padding: '11px 16px',
                  color: isActive ? '#e8547a' : '#c8adb8',
                  fontFamily: '"Nunito", sans-serif', fontWeight: 600, fontSize: '13px',
                  cursor: 'pointer', transition: 'background 0.15s, color 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#1e0e16'; e.currentTarget.style.color = '#f0e4ea' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c8adb8' } }}
              >
                <Icon size={15} style={{ flexShrink: 0, color: isActive ? '#e8547a' : '#7a3f52' }} />
                <span style={{ flex: 1 }}>{label}</span>
                {isActive && <Check size={13} style={{ color: '#e8547a', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Серии')
  const [watchlisted, setWatchlisted] = useState(false)
  const [listStatus, setListStatus] = useState<ListStatus>(null)
  const [activeSeason, setActiveSeason] = useState<1 | 2>(1)
  const [hoveredEp, setHoveredEp] = useState<number | null>(null)

  const episodes = ALL_EPISODES[activeSeason]

  return (
    <div style={{ backgroundColor: '#0a0507', minHeight: '100vh', fontFamily: '"Nunito", sans-serif', color: '#f0e4ea' }}>

      {/* ── HERO / BANNER ── */}
      <div style={{ position: 'relative', height: '600px', overflow: 'hidden' }}>
        <img
          src={BANNER}
          alt="Violet Evergarden banner"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.5) saturate(1.3)' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #0a0507 28%, #0a050788 58%, transparent 78%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #0a050722 0%, transparent 30%, #0a050755 72%, #0a0507 100%)' }} />

        <div style={{ position: 'relative', maxWidth: '1100px', margin: '0 auto', padding: '0 2rem', height: '100%', display: 'flex', alignItems: 'flex-end', paddingBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2.5rem', width: '100%' }}>

            {/* ── LEFT: info ── */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {['TV-сериал', '2018–2020', 'KyoAni', '2 сезона · 24 серии'].map(b => (
                  <span key={b} style={{ background: '#3a1a2666', border: '1px solid #3a1a26', borderRadius: '4px', padding: '2px 10px', fontSize: '11px', fontWeight: 600, color: '#c47888', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{b}</span>
                ))}
              </div>

              <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1.1, fontWeight: 400, margin: '0 0 0.3rem', color: '#f8e8ef', textShadow: '0 2px 24px #0a0507cc' }}>
                Violet Evergarden
              </h1>
              <p style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', color: '#9a7585', fontSize: '1rem', margin: '0 0 1rem' }}>
                ヴァイオレット・エヴァーガーデン
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <StarRating score={9.2} />
                <span style={{ color: '#9a7585', fontSize: '13px' }}>4 821 оценка</span>
                <span style={{ width: '1px', height: '14px', background: '#3a1a26', display: 'inline-block' }} />
                <span style={{ color: '#c47888', fontSize: '13px', fontWeight: 600 }}>Топ-10 аниме всех времён</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                {['Драма', 'Фэнтези', 'Романтика', 'Сэйнэн'].map(g => (
                  <span key={g} style={{ padding: '3px 12px', borderRadius: '20px', border: '1px solid #3a1a26', fontSize: '12px', color: '#d4899e', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = '#3a1a2680'; (e.target as HTMLElement).style.borderColor = '#e8547a' }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.borderColor = '#3a1a26' }}
                  >{g}</span>
                ))}
              </div>

              <p style={{ fontSize: '0.875rem', color: '#c8adb8', lineHeight: 1.7, maxWidth: '520px', marginBottom: '1.5rem' }}>
                История Вайолет Эвергарден — девочки-солдата, привыкшей выполнять приказы, но не понимающей человеческих чувств. После войны она становится «куклой-автомемори» и пишет письма, постепенно открывая смысл последних слов: «Я тебя люблю».
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Watch */}
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#e8547a', border: 'none', borderRadius: '8px', padding: '10px 24px', color: '#fff', fontFamily: '"Nunito", sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 20px #e8547a44' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f4698a'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#e8547a'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                  Смотреть
                </button>

                {/* Favourite */}
                <button
                  onClick={() => setWatchlisted(w => !w)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: watchlisted ? '#1e0e16' : 'transparent', border: `1px solid ${watchlisted ? '#e8547a' : '#3a1a26'}`, borderRadius: '8px', padding: '10px 18px', color: watchlisted ? '#e8547a' : '#9a7585', fontFamily: '"Nunito", sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { if (!watchlisted) { e.currentTarget.style.borderColor = '#e8547a'; e.currentTarget.style.color = '#e8547a' } }}
                  onMouseLeave={e => { if (!watchlisted) { e.currentTarget.style.borderColor = '#3a1a26'; e.currentTarget.style.color = '#9a7585' } }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={watchlisted ? '#e8547a' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  {watchlisted ? 'В избранном' : 'В избранное'}
                </button>

                {/* List dropdown */}
                <ListDropdown status={listStatus} onChange={setListStatus} />
              </div>
            </div>

            {/* ── RIGHT: cover poster ── */}
            <div style={{ flexShrink: 0, width: '240px' }}>
              <div style={{ borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 64px #0a050799, 0 0 0 1px #3a1a26', position: 'relative' }}>
                <img src={COVER} alt="Violet Evergarden poster" style={{ width: '100%', aspectRatio: '5/7', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#e8547aee', borderRadius: '7px', padding: '4px 10px', fontSize: '14px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>9.2</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem 5rem' }}>

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #3a1a26', marginBottom: '2rem', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none',
                borderBottom: activeTab === tab ? '2px solid #e8547a' : '2px solid transparent',
                padding: '14px 26px',
                color: activeTab === tab ? '#e8547a' : '#9a7585',
                fontFamily: '"Nunito", sans-serif',
                fontWeight: activeTab === tab ? 700 : 600,
                fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                whiteSpace: 'nowrap', marginBottom: '-1px',
              }}
              onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = '#d48898' }}
              onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = '#9a7585' }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── EPISODES ── */}
        {activeTab === 'Серии' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ fontFamily: '"Nunito", sans-serif', fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#f0e4ea', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                {activeSeason === 1 ? 'Сезон 1 · 2018' : 'Сезон 2 · 2020'}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {([1, 2] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveSeason(s)}
                    style={{
                      background: activeSeason === s ? '#e8547a' : '#15090e',
                      border: `1px solid ${activeSeason === s ? '#e8547a' : '#3a1a26'}`,
                      borderRadius: '6px', padding: '6px 16px',
                      color: activeSeason === s ? '#fff' : '#9a7585',
                      fontFamily: '"Nunito", sans-serif', fontWeight: 700, fontSize: '13px',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (activeSeason !== s) { e.currentTarget.style.borderColor = '#e8547a'; e.currentTarget.style.color = '#e8547a' } }}
                    onMouseLeave={e => { if (activeSeason !== s) { e.currentTarget.style.borderColor = '#3a1a26'; e.currentTarget.style.color = '#9a7585' } }}
                  >
                    Сезон {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
              {episodes.map(ep => (
                <div
                  key={ep.n}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseEnter={() => setHoveredEp(ep.n + (activeSeason - 1) * 100)}
                  onMouseLeave={() => setHoveredEp(null)}
                >
                  {/* thumbnail */}
                  <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #3a1a26', marginBottom: '0.65rem', aspectRatio: '16/9', background: '#15090e' }}>
                    <img
                      src={ep.thumb}
                      alt={ep.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s', transform: hoveredEp === ep.n + (activeSeason - 1) * 100 ? 'scale(1.04)' : 'scale(1)' }}
                    />
                    {/* overlay on hover */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to bottom, transparent 50%, #0a050799)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: hoveredEp === ep.n + (activeSeason - 1) * 100 ? 1 : 0,
                      transition: 'opacity 0.2s',
                    }}>
                      <div style={{ background: '#e8547acc', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <svg width="14" height="16" viewBox="0 0 14 16" fill="white"><polygon points="0,0 14,8 0,16" /></svg>
                      </div>
                    </div>
                    {/* episode number badge */}
                    <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: '#0a0507bb', borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, color: '#c47888', backdropFilter: 'blur(4px)' }}>
                      {ep.n}
                    </div>
                  </div>

                  {/* meta below */}
                  <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: '13px', color: '#f0e4ea', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {ep.title}
                  </p>
                  <span style={{ fontSize: '11px', color: '#7a3f52', fontWeight: 600 }}>{ep.duration}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CAST ── */}
        {activeTab === 'Актёры' && (
          <div>
            <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.6rem', fontWeight: 400, margin: '0 0 1.5rem', color: '#f0e4ea' }}>Голосовые актёры</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {CAST.map(actor => (
                <div
                  key={actor.name}
                  style={{ background: '#15090e', border: '1px solid #3a1a26', borderRadius: '10px', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#e8547a44'; e.currentTarget.style.background = '#1e0e16' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a1a26'; e.currentTarget.style.background = '#15090e' }}
                >
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid #3a1a26' }}>
                    <img src={actor.img} alt={actor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '14px', color: '#f0e4ea' }}>{actor.name}</p>
                    <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#c47888', fontWeight: 600 }}>{actor.role}</p>
                    <span style={{ fontSize: '11px', color: '#9a7585' }}>{actor.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONNECTED ── */}
        {activeTab === 'Связанное' && (
          <div>
            <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.6rem', fontWeight: 400, margin: '0 0 1.5rem', color: '#f0e4ea' }}>Связанные релизы</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: '1.25rem' }}>
              {CONNECTED.map(item => (
                <div
                  key={item.title}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ borderRadius: '9px', overflow: 'hidden', position: 'relative', marginBottom: '0.65rem', border: '1px solid #3a1a26', background: '#15090e' }}>
                    <img src={item.img} alt={item.title} style={{ width: '100%', aspectRatio: '5/7', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#e8547aee', borderRadius: '5px', padding: '2px 8px', fontSize: '12px', fontWeight: 800, color: '#fff' }}>{item.score}</div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, #0a0507cc, transparent)', padding: '8px 8px 6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#e8547a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.relation}</span>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: '12px', color: '#f0e4ea', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#9a7585' }}>{item.year}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMMENTS ── */}
        {activeTab === 'Комментарии' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.6rem', fontWeight: 400, margin: 0, color: '#f0e4ea' }}>Комментарии · 1 248</h2>
              <button style={{ background: '#e8547a', border: 'none', borderRadius: '8px', padding: '8px 18px', color: '#fff', fontFamily: '"Nunito", sans-serif', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f4698a' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#e8547a' }}
              >Написать</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {COMMENTS.map((c, i) => (
                <div key={i} style={{ background: '#15090e', border: '1px solid #3a1a26', borderRadius: '10px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #e8547a, #a83858)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: '#fff', flexShrink: 0 }}>{c.avatar}</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#e8547a' }}>{c.user}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#9a7585' }}>{c.date}</p>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '14px', lineHeight: 1.6, color: '#c8adb8' }}>{c.text}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid #3a1a26', borderRadius: '20px', padding: '3px 12px', color: '#9a7585', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: '"Nunito", sans-serif' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#e8547a'; e.currentTarget.style.color = '#e8547a' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a1a26'; e.currentTarget.style.color = '#9a7585' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" /></svg>
                      {c.likes}
                    </button>
                    <button style={{ background: 'none', border: 'none', color: '#9a7585', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: '"Nunito", sans-serif', transition: 'color 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#e8547a' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#9a7585' }}
                    >Ответить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
