import { useState } from 'react'
import { changePassword, changeUsername } from '../../utils/auth'

/**
 * Self-service account settings — lets the signed-in user change their own
 * username and/or password. Both flows require the current password to
 * confirm identity (so a momentarily-unlocked machine can't be hijacked).
 *
 * The parent passes `onUpdateAccount(nextAccount)` so the App-level
 * `currentAccount` state stays in sync after a successful change.
 */
export default function AccountSettingsModal({ account, onUpdateAccount, onClose }) {
  const [tab, setTab] = useState('username')

  // Username form
  const [usernameNew, setUsernameNew] = useState(account?.username || '')
  const [usernamePw, setUsernamePw] = useState('')
  const [usernameErr, setUsernameErr] = useState('')
  const [usernameOk, setUsernameOk] = useState('')
  const [showUsernamePw, setShowUsernamePw] = useState(false)

  // Password form
  const [pwOld, setPwOld] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [pwOk, setPwOk] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Live validation hints
  const usernameTrimmed = usernameNew.trim()
  const usernameChanged = !!usernameTrimmed && usernameTrimmed.toLowerCase() !== (account?.username || '').toLowerCase()
  const canSubmitUsername = usernameChanged && !!usernamePw

  const pwLongEnough  = pwNew.length >= 6
  const pwMatches     = !!pwNew && pwNew === pwConfirm
  const canSubmitPw   = !!pwOld && pwLongEnough && pwMatches

  const submitUsername = (e) => {
    e.preventDefault()
    setUsernameErr(''); setUsernameOk('')
    const res = changeUsername(account.username, usernamePw, usernameNew)
    if (res.error) { setUsernameErr(res.error); return }
    setUsernameOk('Username updated.')
    setUsernamePw('')
    onUpdateAccount?.(res.account)
  }

  const submitPassword = (e) => {
    e.preventDefault()
    setPwErr(''); setPwOk('')
    if (pwNew !== pwConfirm) { setPwErr('New passwords do not match.'); return }
    const res = changePassword(account.username, pwOld, pwNew)
    if (res.error) { setPwErr(res.error); return }
    setPwOk('Password updated.')
    setPwOld(''); setPwNew(''); setPwConfirm('')
    onUpdateAccount?.(res.account)
  }

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 500 }}>Account settings</h2>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {account?.name} · {account?.roleLabel}
            </div>
          </div>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Tab switcher — clears both forms' success/error banners on
              switch so a stale "Updated." or error message from the other
              form doesn't haunt the new tab. */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
            <button
              className={`tab ${tab === 'username' ? 'active' : ''}`}
              onClick={() => { setTab('username'); setUsernameErr(''); setUsernameOk(''); setPwErr(''); setPwOk('') }}
            >
              Change username
            </button>
            <button
              className={`tab ${tab === 'password' ? 'active' : ''}`}
              onClick={() => { setTab('password'); setUsernameErr(''); setUsernameOk(''); setPwErr(''); setPwOk('') }}
            >
              Change password
            </button>
          </div>

          {tab === 'username' && (
            <form onSubmit={submitUsername}>
              <div style={{ marginBottom: 12 }}>
                <label>New username</label>
                <input
                  value={usernameNew}
                  onChange={(e) => setUsernameNew(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Current password (to confirm)</label>
                <PasswordInput
                  value={usernamePw}
                  onChange={setUsernamePw}
                  show={showUsernamePw}
                  toggle={() => setShowUsernamePw((s) => !s)}
                  required
                />
              </div>
              {usernameNew && !usernameChanged && (
                <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 8 }}>
                  That's already your username — change it to save.
                </div>
              )}
              {usernameErr && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{usernameErr}</div>}
              {usernameOk && <div style={{ color: '#15803d', fontSize: 12, marginBottom: 8 }}>{usernameOk}</div>}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSubmitUsername}
                style={{
                  width: '100%', justifyContent: 'center', padding: '10px 14px',
                  opacity: canSubmitUsername ? 1 : 0.5, cursor: canSubmitUsername ? 'pointer' : 'not-allowed',
                }}
              >
                Save username
              </button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={submitPassword}>
              <div style={{ marginBottom: 12 }}>
                <label>Current password</label>
                <PasswordInput
                  value={pwOld}
                  onChange={setPwOld}
                  show={showPw}
                  toggle={() => setShowPw((s) => !s)}
                  autoFocus
                  required
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>New password</label>
                <PasswordInput
                  value={pwNew}
                  onChange={setPwNew}
                  show={showPw}
                  toggle={() => setShowPw((s) => !s)}
                  required
                />
                <div style={{ fontSize: 11, color: pwNew ? (pwLongEnough ? '#15803d' : '#dc2626') : '#9ca3af', marginTop: 3 }}>
                  {pwNew ? (pwLongEnough ? '✓ At least 6 characters' : 'At least 6 characters required') : 'Minimum 6 characters'}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Confirm new password</label>
                <PasswordInput
                  value={pwConfirm}
                  onChange={setPwConfirm}
                  show={showPw}
                  toggle={() => setShowPw((s) => !s)}
                  required
                />
                {pwConfirm && (
                  <div style={{ fontSize: 11, color: pwMatches ? '#15803d' : '#dc2626', marginTop: 3 }}>
                    {pwMatches ? '✓ Passwords match' : 'Passwords do not match'}
                  </div>
                )}
              </div>
              {pwErr && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{pwErr}</div>}
              {pwOk && <div style={{ color: '#15803d', fontSize: 12, marginBottom: 8 }}>{pwOk}</div>}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSubmitPw}
                style={{
                  width: '100%', justifyContent: 'center', padding: '10px 14px',
                  opacity: canSubmitPw ? 1 : 0.5, cursor: canSubmitPw ? 'pointer' : 'not-allowed',
                }}
              >
                Save password
              </button>
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/** Password input with a Show/Hide toggle on the right. */
function PasswordInput({ value, onChange, show, toggle, autoFocus, required }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        required={required}
        style={{ width: '100%', paddingRight: 56 }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={show ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          border: 'none', background: 'transparent', color: '#6b7280',
          fontSize: 11, cursor: 'pointer', padding: '4px 6px',
        }}
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
