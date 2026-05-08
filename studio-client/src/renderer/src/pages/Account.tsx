import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type User } from '../api/client'


const CURRENCIES = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
]

export default function Account(): React.ReactElement {
  const qc = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['account'],
    queryFn: () => api.account.get(),
  })

  const [profileForm, setProfileForm] = useState({ email: '', username: '', currency: '' })
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [profileMsg, setProfileMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [profileError, setProfileError] = useState('')
  const [pwError, setPwError] = useState('')
  const [apiKey, setApiKey] = useState('')

  const updateProfile = useMutation({
    mutationFn: () =>
      api.account.update({
        email: profileForm.email || undefined,
        username: profileForm.username || undefined,
        currency: profileForm.currency || undefined,
      }),
    onSuccess: (result) => {
      if ('error' in result) {
        setProfileError(result.error)
        return
      }
      const updated = result.data as User
      localStorage.setItem('user', JSON.stringify(updated))
      qc.invalidateQueries({ queryKey: ['account'] })
      setProfileMsg('Saved!')
      setProfileForm({ email: '', username: '', currency: '' })
      setTimeout(() => setProfileMsg(''), 2500)
    },
    onError: (e: Error) => setProfileError(e.message),
  })

  const generateApiKey = useMutation({
    mutationFn: () => api.account.generateApiKey(),
    onSuccess: (res) => setApiKey(res.api_key),
  })

  const updatePassword = useMutation({
    mutationFn: () => api.account.updatePassword(pwForm.current, pwForm.next),
    onSuccess: (result) => {
      if ('error' in result) {
        setPwError(result.error)
        return
      }
      setPwMsg('Password changed!')
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwMsg(''), 2500)
    },
    onError: (e: Error) => setPwError(e.message),
  })

  const handleProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setProfileMsg('')
    updateProfile.mutate()
  }

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwMsg('')
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match')
      return
    }
    if (pwForm.next.length < 6) {
      setPwError('New password must be at least 6 characters')
      return
    }
    updatePassword.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/15 border-t-light-blue rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-white">Account</h1>
          <p className="text-white/40 text-sm mt-0.5">Manage your profile and preferences</p>
        </div>

        {/* Current info */}
        <div className="glass rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Current profile</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-dark-teal/50 border border-light-blue/30 flex items-center justify-center text-lg text-light-blue font-semibold uppercase">
              {user?.username?.[0] ?? '?'}
            </div>
            <div>
              <p className="text-white/80 font-medium">{user?.username}</p>
              <p className="text-white/40 text-sm">{user?.email}</p>
              <p className="text-white/30 text-xs mt-0.5">Currency: {user?.currency ?? 'USD'}</p>
            </div>
          </div>
        </div>

        {/* Profile edit */}
        <form onSubmit={handleProfile} className="glass rounded-xl p-5 space-y-4">
          <p className="text-white/50 text-xs uppercase tracking-wider">Edit profile</p>

          {profileError && (
            <p className="text-sm text-vibrant-orange/90 bg-vibrant-orange/10 border border-vibrant-orange/20 rounded-lg px-3 py-2">
              {profileError}
            </p>
          )}
          {profileMsg && (
            <p className="text-sm text-vibrant-green/90 bg-vibrant-green/10 border border-vibrant-green/20 rounded-lg px-3 py-2">
              {profileMsg}
            </p>
          )}

          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
              New email <span className="text-white/25 normal-case">(leave blank to keep current)</span>
            </label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
              placeholder={user?.email}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 placeholder-white/20"
            />
          </div>

          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
              New username <span className="text-white/25 normal-case">(leave blank to keep current)</span>
            </label>
            <input
              type="text"
              value={profileForm.username}
              onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))}
              placeholder={user?.username}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 placeholder-white/20"
            />
          </div>

          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Currency</label>
            <select
              value={profileForm.currency || user?.currency || 'USD'}
              onChange={(e) => setProfileForm((p) => ({ ...p, currency: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="w-full py-2.5 rounded-lg bg-vibrant-orange hover:bg-vibrant-orange/90 text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            {updateProfile.isPending ? 'Saving...' : 'Save profile'}
          </button>
        </form>

        {/* Password change */}
        <form onSubmit={handlePassword} className="glass rounded-xl p-5 space-y-4">
          <p className="text-white/50 text-xs uppercase tracking-wider">Change password</p>

          {pwError && (
            <p className="text-sm text-vibrant-orange/90 bg-vibrant-orange/10 border border-vibrant-orange/20 rounded-lg px-3 py-2">
              {pwError}
            </p>
          )}
          {pwMsg && (
            <p className="text-sm text-vibrant-green/90 bg-vibrant-green/10 border border-vibrant-green/20 rounded-lg px-3 py-2">
              {pwMsg}
            </p>
          )}

          {[
            { key: 'current' as const, label: 'Current password', placeholder: '••••••••' },
            { key: 'next' as const, label: 'New password', placeholder: '••••••••' },
            { key: 'confirm' as const, label: 'Confirm new password', placeholder: '••••••••' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">{label}</label>
              <input
                type="password"
                value={pwForm[key]}
                onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 placeholder-white/20"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={updatePassword.isPending}
            className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            {updatePassword.isPending ? 'Changing...' : 'Change password'}
          </button>
        </form>

        {/* API key for RFID devices */}
        <div className="glass rounded-xl p-5 space-y-4">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider">RFID device API key</p>
            <p className="text-white/30 text-xs mt-1">Used by scales and readers to update spool weights via <code className="text-light-blue/70">X-API-Key</code> header.</p>
          </div>

          {apiKey && (
            <div className="bg-deep-purple/40 border border-light-blue/20 rounded-lg px-3 py-2">
              <p className="text-white/40 text-xs mb-1">New key — copy it now, it won't be shown again:</p>
              <p className="font-mono text-light-blue text-xs break-all select-all">{apiKey}</p>
            </div>
          )}

          <button
            onClick={() => {
              if (window.confirm('Generate a new API key? The previous key will stop working.'))
                generateApiKey.mutate()
            }}
            disabled={generateApiKey.isPending}
            className="w-full py-2.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            {generateApiKey.isPending ? 'Generating...' : 'Generate new API key'}
          </button>
        </div>
      </div>
    </div>
  )
}
