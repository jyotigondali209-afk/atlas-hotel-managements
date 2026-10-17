import { useEffect, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  ArrowDownRight, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown,
  CircleDollarSign, ClipboardList, Download, Hotel, LayoutDashboard,
  Menu, Plus, Search, Settings2, Sparkles, TrendingUp, Users, Wallet,
  X,
} from 'lucide-react'
import './App.css'
import './GuestSite.css'
import './ExpenseEntry.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'
const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`

const demoDashboard = {
  source: 'demo',
  metrics: { revenue: 1248500, revenueChange: 12.8, occupancy: 78, occupancyChange: 4.2, adr: 6840, adrChange: 3.6, operatingProfit: 728400, profitChange: 8.1 },
  revenueTrend: [
    { day: '01', revenue: 68000, forecast: 65000 }, { day: '03', revenue: 72500, forecast: 70000 },
    { day: '05', revenue: 61000, forecast: 66000 }, { day: '07', revenue: 81000, forecast: 74000 },
    { day: '09', revenue: 77000, forecast: 78000 }, { day: '11', revenue: 93000, forecast: 82000 },
    { day: '13', revenue: 86000, forecast: 85000 }, { day: '15', revenue: 105000, forecast: 90000 },
    { day: '17', revenue: 99000, forecast: 94000 }, { day: '19', revenue: 112000, forecast: 98000 },
    { day: '21', revenue: 101000, forecast: 102000 }, { day: '23', revenue: 126000, forecast: 108000 },
    { day: '25', revenue: 117000, forecast: 112000 }, { day: '27', revenue: 139000, forecast: 118000 },
    { day: '29', revenue: 132000, forecast: 124000 }, { day: '31', revenue: 151000, forecast: 130000 },
  ],
  roomMix: [{ name: 'Deluxe', value: 42 }, { name: 'Executive', value: 31 }, { name: 'Suite', value: 18 }, { name: 'Standard', value: 9 }],
  recentBookings: [
    { guest: 'Ananya Mehta', initials: 'AM', room: 'Executive Suite · 402', dates: 'Oct 18 – Oct 21', amount: 28600, status: 'Confirmed' },
    { guest: 'Oliver Chen', initials: 'OC', room: 'Deluxe King · 215', dates: 'Oct 18 – Oct 20', amount: 17400, status: 'Checked in' },
    { guest: 'Priya Sharma', initials: 'PS', room: 'Garden Room · 108', dates: 'Oct 19 – Oct 22', amount: 19200, status: 'Confirmed' },
    { guest: 'Marcus Williams', initials: 'MW', room: 'Deluxe Twin · 306', dates: 'Oct 20 – Oct 23', amount: 21300, status: 'Pending' },
  ],
}

const initialPrices = [
  { id: 1, room: 'Executive Suite', dates: 'Oct 18 – 20', base: 14200, current: 14900, recommended: 16800, occupancy: 91, demand: 'Very high', reason: 'Weekend demand is 28% above the 30-day average.', status: 'Pending' },
  { id: 2, room: 'Deluxe King', dates: 'Oct 18 – 20', base: 8700, current: 8700, recommended: 9400, occupancy: 84, demand: 'High', reason: 'Occupancy is nearing the configured 85% threshold.', status: 'Pending' },
  { id: 3, room: 'Garden Room', dates: 'Oct 21 – 23', base: 6400, current: 6900, recommended: 6100, occupancy: 42, demand: 'Low', reason: 'Midweek pickup is soft; a small reduction may improve conversion.', status: 'Pending' },
]

const forecastData = [
  { day: 'Today', occupancy: 78, bookings: 24 }, { day: 'Sat', occupancy: 91, bookings: 31 },
  { day: 'Sun', occupancy: 87, bookings: 28 }, { day: 'Mon', occupancy: 63, bookings: 18 },
  { day: 'Tue', occupancy: 58, bookings: 16 }, { day: 'Wed', occupancy: 69, bookings: 21 },
  { day: 'Thu', occupancy: 82, bookings: 27 },
]

const expenses = [
  { category: 'Staff & payroll', amount: 284000, share: 38, color: '#234f42' },
  { category: 'Food & beverage', amount: 176000, share: 24, color: '#9e6b42' },
  { category: 'Utilities', amount: 142000, share: 19, color: '#c5a66c' },
  { category: 'Housekeeping', amount: 88000, share: 12, color: '#748a75' },
  { category: 'Maintenance', amount: 51000, share: 7, color: '#a9b4a8' },
]

const navItems = [
  { id: 'guest', label: 'Guest website', icon: Hotel },
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'reservations', label: 'Reservations', icon: ClipboardList, count: '12' },
  { id: 'pricing', label: 'Smart pricing', icon: CircleDollarSign, count: '3' },
  { id: 'forecast', label: 'Demand forecast', icon: TrendingUp },
  { id: 'costs', label: 'Cost control', icon: Wallet },
]

function App() {
  const [page, setPage] = useState('overview')
  const [dashboard, setDashboard] = useState(demoDashboard)
  const [apiState, setApiState] = useState('demo')
  const [prices, setPrices] = useState(initialPrices)
  const [bookings, setBookings] = useState(demoDashboard.recentBookings)
  const [expenseData, setExpenseData] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [reservationDraft, setReservationDraft] = useState(null)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [query, setQuery] = useState('')
  const [todayLabel] = useState(() => new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).toUpperCase())

  useEffect(() => {
    fetch(`${API_BASE}/dashboard`)
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable')
        return response.json()
      })
      .then((data) => {
        setDashboard(data)
        setBookings(data.recentBookings || demoDashboard.recentBookings)
        setApiState('live')
      })
      .catch(() => setApiState('demo'))
    fetch(`${API_BASE}/bookings?limit=100`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('API unavailable')))
      .then((data) => setBookings(data.items || []))
      .catch(() => {})
    fetch(`${API_BASE}/pricing`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('API unavailable')))
      .then((data) => { if (data.length) setPrices(data) })
      .catch(() => {})
    fetch(`${API_BASE}/expenses`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('API unavailable')))
      .then(setExpenseData)
      .catch(() => {})
    fetch(`${API_BASE}/forecast`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('API unavailable')))
      .then(setForecastData)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function resolvePrice(id, status) {
    setPrices((current) => current.map((item) => item.id === id ? { ...item, status } : item))
    if (apiState === 'live') {
      try {
        const response = await fetch(`${API_BASE}/pricing/${id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
        })
        if (!response.ok) throw new Error('The API rejected this price decision.')
        setToast(`Recommendation ${status.toLowerCase()} and saved.`)
      } catch (error) {
        setPrices((current) => current.map((item) => item.id === id ? { ...item, status: 'Pending' } : item))
        setToast(error.message || 'Could not save the price decision.')
      }
      return
    }
    setToast(`Recommendation ${status.toLowerCase()} for this demo session.`)
  }

  async function addReservation(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const request = {
      guest_name: form.get('guest'),
      room_type: form.get('room'),
      check_in: form.get('checkin'),
      check_out: form.get('checkout'),
      guests: Number(form.get('guests')),
    }
    if (!request.guest_name.trim() || !request.check_in || !request.check_out || request.check_out <= request.check_in) {
      setToast('Enter a guest name and valid check-in / check-out dates.')
      return
    }
    try {
      const response = await fetch(`${API_BASE}/bookings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
      })
      if (!response.ok) throw new Error('Could not save reservation')
      const created = await response.json()
      setBookings((current) => [{ guest: created.guest_name, initials: created.guest_name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(), room: `${created.room_type} · New`, dates: `${created.check_in} – ${created.check_out}`, amount: created.total_price, status: 'Confirmed' }, ...current])
      setToast('Reservation saved to the hotel database.')
    } catch (error) {
      if (apiState === 'live') {
        setToast(error.message || 'Could not save this reservation.')
        return
      }
      const guest = request.guest_name.trim()
      setBookings((current) => [{ guest, initials: guest.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(), room: `${request.room_type} · Demo`, dates: `${request.check_in} – ${request.check_out}`, amount: 0, status: 'Local demo' }, ...current])
      setToast('Added to this demo session only. Connect the API to persist it.')
    }
    formElement.reset()
  }

  async function addExpense(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const expense = {
      category: form.get('category'),
      amount: Number(form.get('amount')),
      expense_date: form.get('expense_date'),
      description: form.get('description'),
    }
    if (!expense.category || expense.amount <= 0 || !expense.expense_date) {
      setToast('Choose a category, date and positive expense amount.')
      return
    }
    if (apiState === 'live') {
      try {
        const response = await fetch(`${API_BASE}/expenses`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(expense),
        })
        if (!response.ok) throw new Error('Expense could not be saved.')
        const refreshed = await fetch(`${API_BASE}/expenses`).then((result) => result.json())
        setExpenseData(refreshed)
        setToast('Expense saved to the hotel database.')
      } catch (error) {
        setToast(error.message || 'Could not save this expense.')
        return
      }
    } else {
      const items = expenseData?.items || expenses.map(({ category, amount, share }) => ({ category, amount, share }))
      const updated = [...items]
      const existing = updated.find((item) => item.category === expense.category)
      if (existing) existing.amount += expense.amount
      else updated.push({ category: expense.category, amount: expense.amount, share: 0 })
      const total = updated.reduce((sum, item) => sum + item.amount, 0)
      setExpenseData({ total, items: updated.map((item) => ({ ...item, share: Math.round(item.amount / total * 100) })) })
      setToast('Added to this demo session only. Connect the API to persist it.')
    }
    formElement.reset()
  }

  function exportCsv() {
    const rows = [['Guest', 'Room', 'Stay', 'Amount INR', 'Status'], ...bookings.map((booking) => [booking.guest, booking.room, booking.dates, booking.amount, booking.status])]
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.download = 'atlas-reservations.csv'
    link.click()
    URL.revokeObjectURL(link.href)
    setToast('Reservation report exported.')
  }

  const title = navItems.find((item) => item.id === page)?.label || 'Overview'
  const metrics = dashboard.metrics || demoDashboard.metrics
  const filteredBookings = bookings.filter((booking) => `${booking.guest} ${booking.room} ${booking.status}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="app-shell">
      {page !== 'guest' && <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview" onClick={() => setPage('overview')}>
          <span className="brand-mark"><Hotel size={21} strokeWidth={1.7} /></span>
          <span><strong>ATLAS</strong><small>HOTEL GROUP</small></span>
        </a>
        <div className="property-select"><span className="property-icon">A</span><span><strong>Atlas Residency</strong><small>Jaipur, Rajasthan</small></span><ChevronDown size={15} /></div>
        <p className="nav-label">MANAGEMENT</p>
        <nav className="side-nav" aria-label="Management">
          {navItems.map(({ id, label, icon: Icon, count }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => { setPage(id); setMobileNav(false) }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{count && <small>{count}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="insight-prompt"><span className="insight-icon"><Sparkles size={16} /></span><strong>Atlas Intelligence</strong><p>Daily performance brief is ready.</p><button onClick={() => setPage('forecast')}>View insights <span>→</span></button></div>
          <button className="nav-item settings-button" onClick={() => setToast('Property settings are available in the API-backed edition.')}><Settings2 size={18} /><span>Settings</span></button>
          <div className="user-profile"><span className="avatar admin-avatar">RK</span><span><strong>Riya Kapoor</strong><small>Hotel administrator</small></span><ChevronDown size={15} /></div>
        </div>
      </aside>}

      {mobileNav && page !== 'guest' && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

      <main className={`main-shell ${page === 'guest' ? 'guest-main-shell' : ''}`}>
        {page !== 'guest' && <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="breadcrumb">Atlas Residency <span>/</span> <strong>{title}</strong></div>
          <div className="top-actions"><span className={`connection-state ${apiState}`}><i />{apiState === 'live' ? 'Live data' : 'Demo data'}</span><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setToast('You are all caught up.')}><Bell size={19} /><i /></button><span className="top-avatar">RK</span></div>
        </header>}

        <div className={`page-content ${page === 'guest' ? 'guest-content' : ''}`}>
          {page !== 'guest' && <div className="page-heading">
            <div><p className="eyebrow">{todayLabel} <span>·</span> JAIPUR</p><h1>{page === 'overview' ? 'Good morning, Riya' : title}</h1><p className="subheading">{page === 'overview' ? 'Here’s what’s happening at your property today.' : pageDescription(page)}</p></div>
            <div className="heading-actions"><button className="button secondary-button" onClick={exportCsv}><Download size={16} /> Export report</button><button className="button primary-button" onClick={() => setPage('reservations')}><Plus size={17} /> New reservation</button></div>
          </div>}

          {apiState === 'demo' && page !== 'guest' && <div className="demo-banner"><span className="demo-dot" /><span><strong>Sample workspace</strong> · Illustrative values only. Start the API to use persisted hotel records.</span><button onClick={() => setPage('reservations')}>Try a reservation <span>→</span></button></div>}

          {page === 'guest' && <GuestSite onBook={(draft) => { setReservationDraft(draft); setPage('reservations') }} onReturn={() => setPage('overview')} />}
          {page === 'overview' && <Overview dashboard={{ ...dashboard, metrics }} prices={prices} setPage={setPage} bookings={bookings} />}
          {page === 'reservations' && <Reservations bookings={filteredBookings} query={query} setQuery={setQuery} onSubmit={addReservation} initialDraft={reservationDraft} />}
          {page === 'pricing' && <Pricing prices={prices} resolvePrice={resolvePrice} />}
          {page === 'forecast' && <Forecast forecast={forecastData} />}
          {page === 'costs' && <Costs data={expenseData} onAddExpense={addExpense} />}
        </div>
        {page !== 'guest' && <footer className="page-footer"><span>ATLAS HOTEL GROUP</span><span>Revenue intelligence <i /> {apiState === 'live' ? 'Connected to API' : 'Demo environment'}</span></footer>}
      </main>
      {toast && <div className="toast" role="status"><Check size={16} />{toast}<button aria-label="Dismiss" onClick={() => setToast('')}><X size={15} /></button></div>}
    </div>
  )
}

const guestRooms = [
  { room_type: 'Deluxe King', name: 'The Courtyard King', detail: 'A calm retreat with garden views and a private balcony.', price: 8700, image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=82', alt: 'Sunlit king bedroom with warm wood furniture' },
  { room_type: 'Executive Suite', name: 'The Atlas Suite', detail: 'Generous living space, considered details and a deep-soak bath.', price: 14200, image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=82', alt: 'Elegant hotel suite with lounge seating' },
  { room_type: 'Garden Room', name: 'The Garden Room', detail: 'An intimate room that opens onto a quiet green courtyard.', price: 6400, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=82', alt: 'Boutique hotel room opening to a garden' },
  { room_type: 'Standard Twin', name: 'The Twin Room', detail: 'Thoughtful comfort for two, with room to settle in.', price: 5900, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=82', alt: 'Modern twin hotel room with two beds' },
]

function dateOffset(days) {
  const value = new Date()
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}

function GuestSite({ onBook, onReturn }) {
  const [checkIn, setCheckIn] = useState(() => dateOffset(3))
  const [checkOut, setCheckOut] = useState(() => dateOffset(5))
  const [guestCount, setGuestCount] = useState('2')
  const [availability, setAvailability] = useState(null)
  const [searchNotice, setSearchNotice] = useState('')
  const [availabilitySource, setAvailabilitySource] = useState('sample')

  async function searchRooms(event) {
    event.preventDefault()
    if (checkOut <= checkIn) {
      setSearchNotice('Choose a check-out date after your check-in date.')
      return
    }
    const params = new URLSearchParams({ check_in: checkIn, check_out: checkOut, guests: guestCount })
    try {
      const response = await fetch(`${API_BASE}/availability?${params}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Availability could not be checked.')
      setAvailability(data.items)
      setAvailabilitySource('live')
      setSearchNotice(`${data.items.filter((item) => item.available).length} room types available for your dates.`)
    } catch {
      const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))
      setAvailability(guestRooms.map((room) => ({ room_type: room.room_type, available_rooms: 2, nightly_price: room.price, total_price: room.price * nights, nights, available: true })))
      setAvailabilitySource('sample')
      setSearchNotice('Showing sample availability. Start the API to check live room inventory.')
    }
  }

  const cards = guestRooms.map((room) => ({ ...room, ...(availability?.find((item) => item.room_type === room.room_type) || {}) }))
  return <div className="guest-site">
    <div className="guest-topline"><span>ATLAS RESIDENCY <i /> JAIPUR, RAJASTHAN</span><span>RESERVATIONS <strong>+91 141 555 0180</strong></span></div>
    <section className="guest-hero">
      <nav className="guest-nav"><a href="#guest-home" className="guest-brand"><span className="guest-brand-mark">A</span><span><strong>ATLAS</strong><small>RESIDENCY · JAIPUR</small></span></a><div><a href="#guest-rooms">Rooms</a><a href="#guest-experience">The experience</a><a href="#guest-location">Location</a></div><button className="guest-nav-tag" aria-label="Return to operations dashboard" onClick={onReturn}><span className="nav-operator-label">OPERATOR VIEW ↗</span><span className="nav-operator-short">OPS ↗</span></button></nav>
      <div className="guest-hero-copy" id="guest-home"><span className="guest-kicker">A PRIVATE ADDRESS IN THE PINK CITY</span><h2>Atlas Residency</h2><p>Find a little more room to breathe in the heart of Jaipur.</p><a href="#guest-rooms" className="guest-discover">DISCOVER YOUR STAY <span>↓</span></a></div>
      <form className="guest-search" onSubmit={searchRooms}>
        <label><span>CHECK IN</span><input type="date" min={dateOffset(0)} value={checkIn} onChange={(event) => setCheckIn(event.target.value)} required /></label>
        <label><span>CHECK OUT</span><input type="date" min={checkIn} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} required /></label>
        <label><span>GUESTS</span><select value={guestCount} onChange={(event) => setGuestCount(event.target.value)}><option value="1">1 guest</option><option value="2">2 guests</option><option value="3">3 guests</option><option value="4">4 guests</option></select></label>
        <button type="submit"><Search size={16} /> CHECK AVAILABILITY</button>
      </form>
    </section>
    <section className="guest-intro" id="guest-experience"><span className="guest-section-index">01 / THE RESIDENCY</span><div><h3>Quietly rooted in Jaipur.</h3><p>Thoughtful hospitality, locally grounded. A welcoming base for unhurried mornings, old-city afternoons and evenings that linger.</p></div><span className="guest-intro-seal">J<br /><i>✳</i><br />26</span></section>
    <section className="guest-rooms" id="guest-rooms"><div className="guest-section-head"><div><span className="guest-section-index">02 / A PLACE TO UNWIND</span><h3>Rooms with room to be.</h3></div><span>{availabilitySource === 'live' ? 'LIVE RATES · INR' : 'SAMPLE STARTING RATES · INR'}</span></div>{searchNotice && <div className={`availability-notice ${availabilitySource}`}>{searchNotice}</div>}<div className="guest-room-grid">{cards.map((room) => <article className="guest-room-card" key={room.room_type}><div className="guest-room-image"><img src={room.image} alt={room.alt} loading="lazy" /><span>{availabilitySource === 'live' && availability ? `${room.available_rooms} AVAILABLE` : 'ATLAS COLLECTION'}</span></div><div className="guest-room-copy"><h4>{room.name}</h4><p>{room.detail}</p><div><span><strong>{money(room.nightly_price || room.price)}</strong> / night</span><button disabled={room.available === false} onClick={() => onBook({ room_type: room.room_type, check_in: checkIn, check_out: checkOut, guests: Number(guestCount) })}>{room.available === false ? 'Unavailable' : 'Choose room'} <span>→</span></button></div></div></article>)}</div></section>
    <section className="guest-extras" id="guest-location"><div><span className="guest-section-index">03 / YOUR TIME HERE</span><h3>Space to settle in.</h3></div><div className="guest-extra-list"><span><i>01</i> Courtyard pool</span><span><i>02</i> Rooftop dining</span><span><i>03</i> Stillwater spa</span><span><i>04</i> City concierge</span></div></section>
    <footer className="guest-footer"><span>ATLAS RESIDENCY <i /> JAIPUR</span><span>HOSPITALITY, IN ITS OWN TIME.</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>BACK TO TOP ↑</button></footer>
  </div>
}

function pageDescription(page) {
  return ({
    guest: 'Explore rooms and find your stay at Atlas Residency.',
    reservations: 'Manage arrivals, stays and guest requests.',
    pricing: 'Review explainable rate recommendations before publishing.',
    forecast: 'A seven-day view of expected demand and room pickup.',
    costs: 'Track operating spend and protect room contribution.',
  })[page]
}

function MetricCard({ label, value, change, context, icon: Icon, tone, suffix = '' }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17} /></span></div><strong className="metric-value">{value}{suffix}</strong><div className="metric-foot">{change == null ? <span>{context}</span> : <><span className="positive-change"><ArrowUpRight size={14} /> {change}%</span><span>vs last month</span></>}</div></article>
}

function Overview({ dashboard, prices, setPage, bookings }) {
  const metrics = dashboard.metrics
  const trend = dashboard.revenueTrend || demoDashboard.revenueTrend
  const roomMix = dashboard.roomMix || demoDashboard.roomMix
  const pieColors = ['#315d4d', '#c49b62', '#a5b99b', '#dfe5dd']
  return <>
    <section className="metric-grid">
      <MetricCard label="Total revenue" value={money(metrics.revenue)} change={metrics.revenueChange} context="Month-to-date room revenue" icon={CircleDollarSign} tone="green" />
      <MetricCard label="Occupancy" value={metrics.occupancy} suffix="%" change={metrics.occupancyChange} context="Current room inventory" icon={Users} tone="gold" />
      <MetricCard label="Average daily rate" value={money(metrics.adr)} change={metrics.adrChange} context="Revenue per occupied night" icon={Hotel} tone="sage" />
      <MetricCard label="Operating profit" value={money(metrics.operatingProfit)} change={metrics.profitChange} context="Revenue less recorded expenses" icon={Wallet} tone="clay" />
    </section>

    <section className="overview-grid">
      <article className="panel revenue-panel">
        <div className="panel-heading"><div><h2>Revenue performance</h2><p>Daily room revenue and forecast</p></div><button className="select-button">This month <ChevronDown size={14} /></button></div>
        <div className="chart-legend"><span><i className="legend-actual" /> Room revenue</span>{dashboard.source === 'demo' && <span><i className="legend-forecast" /> Sample forecast</span>}<b>{money(metrics.revenue)} <small>month to date</small></b></div>
        <div className="revenue-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 12, right: 8, left: -15, bottom: 0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#315d4d" stopOpacity={0.18} /><stop offset="100%" stopColor="#315d4d" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0eb" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#98a19a', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#98a19a', fontSize: 11 }} tickFormatter={(value) => `${value / 1000}k`} /><Tooltip formatter={(value) => money(value)} contentStyle={{ border: '1px solid #e8ece6', borderRadius: 4, fontSize: 12 }} /><Area type="monotone" dataKey="revenue" stroke="#315d4d" strokeWidth={2.2} fill="url(#revenueFill)" />{dashboard.source === 'demo' && <Area type="monotone" dataKey="forecast" stroke="#c69b62" strokeWidth={1.8} strokeDasharray="5 5" fill="transparent" />}</AreaChart></ResponsiveContainer></div>
      </article>
      <article className="panel room-panel">
        <div className="panel-heading"><div><h2>Room-night mix</h2><p>Share of occupied room nights</p></div><button className="more-button" aria-label="View forecast" onClick={() => setPage('forecast')}>•••</button></div>
        <div className="occupancy-summary"><strong>{metrics.occupancy}<span>%</span></strong><span><b>Property</b><small>current occupancy</small></span></div>
        <div className="room-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={roomMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={80} paddingAngle={3} stroke="none">{roomMix.map((entry, index) => <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />)}</Pie><Tooltip formatter={(value) => `${value}%`} contentStyle={{ border: '1px solid #e8ece6', borderRadius: 4, fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{metrics.occupancy}%</strong><small>occupied</small></div></div>
        <div className="room-legend">{roomMix.map((room, index) => <div key={room.name}><i style={{ background: pieColors[index % pieColors.length] }} /><span>{room.name}</span><b>{room.value}%</b></div>)}</div>
      </article>
    </section>

    <section className="lower-grid">
      <article className="panel booking-panel"><div className="panel-heading"><div><h2>Recent reservations</h2><p>Latest activity across your property</p></div><button className="text-button" onClick={() => setPage('reservations')}>View all <span>→</span></button></div><BookingTable bookings={bookings.slice(0, 4)} compact /></article>
      <article className="panel recommendation-panel"><div className="panel-heading"><div><h2>Pricing actions</h2><p>Needs your review</p></div><span className="pending-count">{prices.filter((item) => item.status === 'Pending').length} pending</span></div><div className="pricing-peek">{prices.filter((item) => item.status === 'Pending').slice(0, 2).map((item) => <div className="peek-row" key={item.id}><span className="sparkle-small"><Sparkles size={15} /></span><div><strong>{item.room}</strong><small>{item.demand} demand · {item.occupancy}% occupancy</small></div><b>{money(item.recommended)}</b></div>)}</div><button className="full-width-link" onClick={() => setPage('pricing')}>Review recommendations <span>→</span></button></article>
    </section>
  </>
}

function BookingTable({ bookings, compact = false }) {
  return <div className={`table-wrap ${compact ? 'compact-table' : ''}`}><table><thead><tr><th>GUEST</th><th>ROOM</th><th>STAY</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>{bookings.length ? bookings.map((booking, index) => <tr key={`${booking.guest}-${index}`}><td><span className="guest-cell"><span className={`avatar guest-${index % 4}`}>{booking.initials || booking.guest.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><strong>{booking.guest}</strong></span></td><td>{booking.room}</td><td>{booking.dates}</td><td className="amount-cell">{money(booking.amount || 0)}</td><td><span className={`status-badge ${booking.status.toLowerCase().replaceAll(' ', '-')}`}>{booking.status}</span></td></tr>) : <tr><td colSpan="5" className="empty-state">No reservations match this search.</td></tr>}</tbody></table></div>
}

function Reservations({ bookings, query, setQuery, onSubmit, initialDraft }) {
  const [todayDate] = useState(() => dateOffset(0))
  return <div className="single-column-page"><section className="panel reservation-form-panel"><div className="panel-heading"><div><h2>Create a reservation</h2><p>New stays are checked against live room inventory when the API is connected.</p></div><CalendarDays size={20} className="heading-icon" /></div><form className="reservation-form" onSubmit={onSubmit}><label>Guest name<input name="guest" placeholder="e.g. Aditi Rao" required /></label><label>Room type<select name="room" defaultValue={initialDraft?.room_type || 'Deluxe King'}><option>Deluxe King</option><option>Executive Suite</option><option>Garden Room</option><option>Standard Twin</option></select></label><label>Check-in<input name="checkin" type="date" min={todayDate} defaultValue={initialDraft?.check_in} required /></label><label>Check-out<input name="checkout" type="date" min={todayDate} defaultValue={initialDraft?.check_out} required /></label><label>Guests<select name="guests" defaultValue={String(initialDraft?.guests || 1)}><option value="1">1 guest</option><option value="2">2 guests</option><option value="3">3 guests</option><option value="4">4 guests</option></select></label><button className="button primary-button form-submit" type="submit"><Plus size={16} /> Add reservation</button></form></section><section className="panel full-booking-panel"><div className="panel-heading"><div><h2>All reservations</h2><p>{bookings.length} stays in the current view</p></div><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guest or room" /></div></div><BookingTable bookings={bookings} /></section></div>
}

function Pricing({ prices, resolvePrice }) {
  return <div className="single-column-page"><div className="pricing-summary-strip"><div><span className="summary-icon"><Sparkles size={17} /></span><span><strong>Transparent rate guidance</strong><small>Recommendations respect each room’s cost floor and configured price limits.</small></span></div><span className="recommendation-total">{prices.filter((item) => item.status === 'Pending').length} to review</span></div><section className="recommendation-list">{prices.map((item) => <article className={`panel price-card ${item.status !== 'Pending' ? 'resolved' : ''}`} key={item.id}><div className="price-card-head"><div><span className="demand-label"><i className={item.demand.toLowerCase().replace(' ', '-')} />{item.demand} demand</span><h2>{item.room}</h2><p>{item.dates} <span>·</span> {item.occupancy}% predicted occupancy</p></div><span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span></div><div className="price-values"><div><small>Base rate</small><strong>{money(item.base)}</strong></div><div><small>Current rate</small><strong>{money(item.current)}</strong></div><div className="suggested-price"><small>Recommended</small><strong>{money(item.recommended)}</strong></div><div className="price-delta"><span>{item.recommended >= item.current ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{Math.round((item.recommended / item.current - 1) * 100)}%</span></div></div><div className="reason-line"><Sparkles size={15} /><span>{item.reason}</span></div>{item.status === 'Pending' && <div className="price-actions"><button className="button secondary-button" onClick={() => resolvePrice(item.id, 'Rejected')}><X size={15} /> Reject</button><button className="button primary-button" onClick={() => resolvePrice(item.id, 'Approved')}><Check size={15} /> Approve rate</button></div>}</article>)}</section></div>
}

function Forecast({ forecast }) {
  const days = forecast?.predictions?.length ? forecast.predictions.map((item) => ({ ...item, day: item.day || item.date })) : forecastData
  const peak = days.reduce((best, item) => item.occupancy > best.occupancy ? item : best, days[0])
  const isModelForecast = forecast?.model === 'random-forest'
  return <div className="single-column-page"><section className="forecast-highlight"><div className="forecast-highlight-copy"><span className="eyebrow">7-DAY OUTLOOK · {isModelForecast ? 'RANDOM FOREST MODEL' : 'BASELINE'}</span><h2>{peak.occupancy >= 85 ? 'Demand is building into the weekend.' : 'Demand is steady across the week.'}</h2><p>{peak.day} is projected to reach {peak.occupancy}% occupancy. Review inventory and staffing before the arrival peak.</p></div><div className="forecast-highlight-stat"><strong>{peak.occupancy}%</strong><small>{peak.day} occupancy</small><span><ArrowUpRight size={14} /> {forecast ? `${forecast.source} forecast` : 'Sample data'}</span></div></section><section className="panel forecast-panel"><div className="panel-heading"><div><h2>Occupancy forecast</h2><p>{forecast ? `Source: ${forecast.source}` : 'Illustrative prediction · waiting for forecast API'}</p></div><span className="forecast-chip">{days.length} days</span></div><div className="forecast-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={days} margin={{ top: 20, right: 10, left: -15, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0eb" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#849087', fontSize: 12 }} dy={9} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#98a19a', fontSize: 11 }} tickFormatter={(value) => `${value}%`} /><Tooltip formatter={(value, name) => [name === 'occupancy' ? `${value}%` : value, name === 'occupancy' ? 'Occupancy' : 'Bookings']} contentStyle={{ border: '1px solid #e8ece6', borderRadius: 4, fontSize: 12 }} /><Bar dataKey="occupancy" radius={[3, 3, 0, 0]} barSize={32}>{days.map((entry) => <Cell key={entry.day} fill={entry.occupancy >= 85 ? '#c28e55' : '#557b67'} />)}</Bar></BarChart></ResponsiveContainer></div><div className="forecast-note"><Sparkles size={16} /><span><strong>Evaluation:</strong> train with chronological holdout data; the bundled dataset is synthetic and should not be treated as operational history.</span></div></section><section className="panel forecast-table-panel"><div className="panel-heading"><div><h2>Daily outlook</h2><p>Expected room demand by date</p></div></div><div className="outlook-list">{days.map((day) => <div className="outlook-row" key={day.day}><span className="outlook-day">{day.day}</span><div className="outlook-meter"><i style={{ width: `${day.occupancy}%` }} /></div><strong>{day.occupancy}%</strong><span>{day.bookings} expected bookings</span><span className={`demand-pill ${day.occupancy >= 85 ? 'high' : day.occupancy >= 65 ? 'moderate' : 'low'}`}>{day.occupancy >= 85 ? 'High' : day.occupancy >= 65 ? 'Moderate' : 'Low'}</span></div>)}</div></section></div>
}

function Costs({ data, onAddExpense }) {
  const palette = ['#234f42', '#9e6b42', '#c5a66c', '#748a75', '#a9b4a8']
  const costItems = data?.items?.length ? data.items.map((item, index) => ({ ...item, color: palette[index % palette.length] })) : expenses
  const total = data?.total ?? costItems.reduce((sum, item) => sum + item.amount, 0)
  return <div className="single-column-page"><section className="cost-kpis"><article className="panel cost-kpi"><span>Operating expenses</span><strong>{money(total)}</strong><small>{data ? 'Database · month to date' : 'Month to date · illustrative sample'}</small></article><article className="panel cost-kpi"><span>Cost per occupied room</span><strong>{money(2140)}</strong><small>Room-level allocation pending</small></article><article className="panel cost-kpi"><span>Room contribution</span><strong>{money(4700)}</strong><small>Illustrative ADR less allocated costs</small></article></section><section className="panel expense-panel"><div className="panel-heading"><div><h2>Operating spend</h2><p>Expense categories · this month</p></div><span className="forecast-chip">{data ? 'Database' : 'Sample data'}</span></div><form className="expense-entry" onSubmit={onAddExpense}><label>Category<select name="category"><option>Electricity</option><option>Water</option><option>Housekeeping</option><option>Laundry</option><option>Food & beverage</option><option>Staff & payroll</option><option>Maintenance</option><option>Utilities</option></select></label><label>Amount<input name="amount" type="number" min="1" step="1" placeholder="0" required /></label><label>Date<input name="expense_date" type="date" defaultValue={dateOffset(0)} required /></label><label>Description<input name="description" maxLength="240" placeholder="Optional note" /></label><button className="button primary-button" type="submit"><Plus size={15} /> Add expense</button></form><div className="expense-list">{costItems.map((item) => <div className="expense-row" key={item.category}><div className="expense-label"><i style={{ background: item.color }} /><strong>{item.category}</strong></div><div className="expense-meter"><i style={{ width: `${item.share}%`, background: item.color }} /></div><strong className="expense-amount">{money(item.amount)}</strong><span className="expense-share">{item.share}%</span></div>)}</div><div className="expense-total"><span>Total operating expense</span><strong>{money(total)}</strong></div></section><div className="cost-callout"><span><Sparkles size={18} /></span><div><strong>Cost watch</strong><p>Utilities account for {costItems.find((item) => item.category === 'Utilities')?.share || 0}% of tracked monthly spend. Compare against the previous month before adjusting your room cost floor.</p></div><button className="text-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top <span>↑</span></button></div></div>
}

export default App
