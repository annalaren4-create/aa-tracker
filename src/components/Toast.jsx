import { createContext, useContext, useState, useCallback } from 'react'

/**
 * Minimal toast + confirm system. Wrap the app in <ToastProvider /> and
 * call `useToast()` anywhere:
 *
 *   const toast = useToast()
 *   toast.success('Saved!')
 *   toast.error('Couldn’t reach server')
 *   toast.info('Lesson cleared')
 *
 *   if (await toast.confirm('Remove this student?')) {
 *     onDelete(...)
 *   }
 *
 * Toasts auto-dismiss after 4s. `confirm()` returns a Promise<boolean>
 * resolved when the user clicks OK / Cancel. Both flows are non-blocking
 * (no `window.alert` / `window.confirm`) so they survive the eventual
 * backend migration where async error handling will surface here.
 */

const ToastCtx = createContext(null)

let _seq = 0
const nextId = () => ++_seq

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])           // { id, kind, message }
  const [confirmReq, setConfirmReq] = useState(null) // { message, resolve } | null

  const dismiss = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((kind, message) => {
    const id = nextId()
    setToasts((ts) => [...ts, { id, kind, message }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const api = {
    success: (m) => push('success', m),
    error:   (m) => push('error', m),
    info:    (m) => push('info', m),
    confirm: (message) => new Promise((resolve) => {
      setConfirmReq({ message, resolve })
    }),
  }

  const handleConfirm = (ok) => {
    confirmReq?.resolve(ok)
    setConfirmReq(null)
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}

      {/* Toast stack — top-right of the viewport. */}
      <div style={{
        position: 'fixed', top: 16, right: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              maxWidth: 360,
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
              background:
                t.kind === 'success' ? '#f0fdf4' :
                t.kind === 'error'   ? '#fef2f2' :
                                       '#eff6ff',
              border: '1px solid ' + (
                t.kind === 'success' ? '#86efac' :
                t.kind === 'error'   ? '#fecaca' :
                                       '#bfdbfe'
              ),
              color:
                t.kind === 'success' ? '#15803d' :
                t.kind === 'error'   ? '#b91c1c' :
                                       '#1d4ed8',
              fontWeight: 500,
              animation: 'aa-toast-in 0.18s ease-out',
            }}
            role="alert"
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Confirm dialog — modal overlay, returns boolean via promise. */}
      {confirmReq && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => handleConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12, padding: 20,
              maxWidth: 420, width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ fontSize: 14, color: '#111827', whiteSpace: 'pre-wrap', marginBottom: 16 }}>
              {confirmReq.message}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => handleConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleConfirm(true)} autoFocus>OK</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes aa-toast-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
