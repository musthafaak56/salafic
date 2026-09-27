import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCenter } from '../context/CenterContext'
import { useLanguage } from '../context/LanguageContext'
import ThemeToggle from './ThemeToggle'
import Button from './Button'
import { inputClass } from './Field'

export function Shell({
  children,
  title,
  eyebrow,
  description,
  actions,
  dir,
  lang,
}) {
  return (
    <>
      <PlatformHeader />
      <main className="platform-page" dir={dir} lang={lang}>
        <header className="platform-heading">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
            {description && <p className="lede">{description}</p>}
          </div>
          {actions}
        </header>
        {children}
      </main>
      <footer className="platform-footer">
        Salafic · A place for every community.
      </footer>
    </>
  )
}
export function PlatformHeader() {
  const { user, profile, logout } = useAuth()
  const context = useCenter()
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const mine = profile?.centers?.find((c) => c.id === context?.centerId)
  return (
    <header className="platform-header">
      <div className="platform-nav">
        <Link className="platform-brand" to="/">
          Salafic<span>Community, connected.</span>
        </Link>
        <button
          className="mobile-menu"
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="platform-nav"
        >
          Menu
        </button>
        <nav
          id="platform-nav"
          className={open ? 'is-open' : ''}
          aria-label="Main navigation"
        >
          <NavLink to="/centers">Find a center</NavLink>
          <NavLink to="/quran">Quran</NavLink>
          {!user && <NavLink to="/register">Register a center</NavLink>}
          {user && <NavLink to="/onboarding">My requests</NavLink>}
          {user && !!profile?.centers?.length && <NavLink to="/centers">My centers</NavLink>}
          {profile?.role === 'superadmin' && (
            <NavLink to="/platform">Review requests</NavLink>
          )}
          {context && (mine || profile?.role === 'superadmin') && (
            <Link to={`${context.base}/admin`}>Manage center</Link>
          )}
        </nav>
        <div className="platform-account">
          <select
            aria-label="Interface language"
            className="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="">Center language</option>
            <option value="en">English</option>
            <option value="ml">മലയാളം</option>
            <option value="ar">العربية</option>
          </select>
          <ThemeToggle />
          {user ? (
            <Button variant="ghost" onClick={logout}>
              Sign out
            </Button>
          ) : (
            <Link to="/login">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  )
}
export function Input({ label, value, onChange, options, ...props }) {
  const id = props.id || label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return (
    <label className="platform-field" htmlFor={id}>
      <span>{label}</span>
      {options ? (
        <select
          id={id}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        >
          {options.map((o) => (
            <option
              key={typeof o === 'string' ? o : o.value}
              value={typeof o === 'string' ? o : o.value}
            >
              {typeof o === 'string' ? o : o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className={inputClass}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      )}
    </label>
  )
}
export function Message({ error, children }) {
  return (
    <p
      className={error ? 'platform-error' : 'platform-message'}
      role={error ? 'alert' : 'status'}
    >
      {children}
    </p>
  )
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  async function run(task, success = 'Saved.') {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await task()
      setMessage(success)
      return result
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setBusy(false)
    }
  }
  return {
    busy,
    run,
    feedback: (
      <>
        {error && <Message error>{error}</Message>}
        {message && <Message>{message}</Message>}
      </>
    ),
  }
}
export const CENTER_INITIAL = {
  displayName: '',
  type: 'masjid',
  city: '',
  countryCode: '',
  address: '',
  latitude: '',
  longitude: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  currency: 'USD',
  locale: 'en',
  description: '',
  slug: '',
  designatedAdminEmail: '',
}
export function CenterFields({
  value,
  onChange,
  request = false,
  currencyLocked = false,
}) {
  const set = (key) => (val) => onChange({ ...value, [key]: val })
  return (
    <div className="platform-fields">
      <Input
        label="Center name"
        value={value.displayName}
        onChange={set('displayName')}
        required
        maxLength={120}
      />
      <Input
        label="Type"
        value={value.type}
        onChange={set('type')}
        options={['masjid', 'center']}
      />
      <Input label="City" value={value.city} onChange={set('city')} required />
      <Input
        label="Country code"
        placeholder="IN, AE, GB…"
        value={value.countryCode}
        onChange={set('countryCode')}
        required
        maxLength={2}
      />
      <Input
        label="Address"
        value={value.address}
        onChange={set('address')}
        required
        maxLength={300}
      />
      <Input
        label="Timezone"
        list="timezones"
        value={value.timezone}
        onChange={set('timezone')}
        required
      />
      <datalist id="timezones">
        {Intl.supportedValuesOf('timeZone').map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <Input
        label="Latitude"
        type="number"
        step="any"
        min="-90"
        max="90"
        value={value.latitude}
        onChange={set('latitude')}
        required
      />
      <Input
        label="Longitude"
        type="number"
        step="any"
        min="-180"
        max="180"
        value={value.longitude}
        onChange={set('longitude')}
        required
      />
      <Input
        label="Currency"
        value={value.currency}
        onChange={set('currency')}
        disabled={currencyLocked}
        options={Intl.supportedValuesOf('currency')}
      />
      <Input
        label="Display language"
        value={value.locale}
        onChange={set('locale')}
        options={[
          { value: 'en', label: 'English' },
          { value: 'ml', label: 'Malayalam' },
          { value: 'ar', label: 'Arabic' },
        ]}
      />
      <Input
        label="Description"
        value={value.description}
        onChange={set('description')}
        maxLength={1000}
      />
      {!request && (
        <>
          <Input
            label="Center URL"
            value={value.slug}
            onChange={set('slug')}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
          />
          <Input
            label="Time format"
            value={value.timeFormat || '12'}
            onChange={set('timeFormat')}
            options={[
              { value: '12', label: '12-hour' },
              { value: '24', label: '24-hour' },
            ]}
          />
          <Input
            label="Hijri date adjustment (days)"
            type="number"
            min="-2"
            max="2"
            step="1"
            value={value.hijriAdjustment || 0}
            onChange={set('hijriAdjustment')}
          />
          {['finances', 'events', 'forms'].map((key) => (
            <label className="platform-check" key={key}>
              <input
                type="checkbox"
                checked={value.modules?.[key] !== false}
                onChange={(e) =>
                  onChange({
                    ...value,
                    modules: { ...value.modules, [key]: e.target.checked },
                  })
                }
              />
              Show {key} publicly
            </label>
          ))}
        </>
      )}
      {request && (
        <>
          <Input
            label="Center URL"
            placeholder="your-center-name"
            value={value.slug}
            onChange={set('slug')}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
          />
          <Input
            label="Designated admin email"
            type="email"
            value={value.designatedAdminEmail}
            onChange={set('designatedAdminEmail')}
            required
          />
        </>
      )}
      {!request && (
        <>
          <Input
            label="Logo URL (HTTPS)"
            type="url"
            value={value.logoUrl}
            onChange={set('logoUrl')}
          />
          <Input
            label="Cover image URL (HTTPS)"
            type="url"
            value={value.coverUrl}
            onChange={set('coverUrl')}
          />
          <Input
            label="Public contact email"
            type="email"
            value={value.contactEmail}
            onChange={set('contactEmail')}
          />
          <Input
            label="Public phone number"
            type="tel"
            value={value.phone}
            onChange={set('phone')}
          />
          <Input
            label="Website (HTTPS)"
            type="url"
            value={value.websiteUrl}
            onChange={set('websiteUrl')}
          />
        </>
      )}
    </div>
  )
}
