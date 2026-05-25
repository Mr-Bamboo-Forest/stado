import { useState, useEffect, useRef } from 'react'
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth'
import { auth } from '../firebase'

export default function SignIn({ onSuccess }) {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const confirmationRef = useRef(null)
  const recaptchaVerifierRef = useRef(null)
  const [recaptchaReady, setRecaptchaReady] = useState(false)

  useEffect(() => {
    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        setRecaptchaReady(true)
      },
      'expired-callback': () => {
        setRecaptchaReady(false)
      },
    })

    recaptchaVerifierRef.current.render().then(() => {
      setRecaptchaReady(true)
    }).catch((err) => {
      console.error('reCAPTCHA render error:', err)
    })

    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
      }
    }
  }, [])

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length === 0) return ''
    if (digits.startsWith('61')) return '+' + digits
    if (digits.startsWith('0')) return '+61' + digits.slice(1)
    return '+61' + digits
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const formattedPhone = formatPhone(phone)

      if (!recaptchaVerifierRef.current) {
        throw new Error('reCAPTCHA not initialized')
      }

      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifierRef.current
      )
      confirmationRef.current = confirmation
      setStep('code')
    } catch (err) {
      console.error('Error sending code:', err)
      if (err.code === 'auth/invalid-phone-number') {
        setError('Please enter a valid Australian phone number')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.')
      } else if (err.message?.includes('reCAPTCHA')) {
        setError('Security check failed. Please refresh and try again.')
      } else {
        setError('Failed to send code. Please try again.')
      }

      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.render()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await confirmationRef.current.confirm(code)
      onSuccess()
    } catch (err) {
      console.error('Error verifying code:', err)
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid code. Please try again.')
      } else if (err.code === 'auth/code-expired') {
        setError('Code expired. Please request a new one.')
        setStep('phone')
        setCode('')
      } else {
        setError('Failed to verify code. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.screen}>
      <div style={styles.content}>
        <span style={styles.wordmark}>stado</span>
        <h1 style={styles.title}>
          {step === 'phone' ? 'Sign in' : 'Enter code'}
        </h1>
        <p style={styles.subtitle}>
          {step === 'phone'
            ? 'Enter your phone number to get started'
            : `We sent a code to ${formatPhone(phone)}`}
        </p>

        {step === 'phone' ? (
          <form style={styles.form} onSubmit={handleSendCode}>
            <div style={styles.inputGroup}>
              <span style={styles.prefix}>+61</span>
              <input
                style={styles.input}
                type="tel"
                placeholder="4XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button
              style={{ ...styles.button, opacity: loading || !recaptchaReady ? 0.7 : 1 }}
              type="submit"
              disabled={loading || !recaptchaReady}
            >
              {loading ? 'Sending...' : 'Send code'}
            </button>
          </form>
        ) : (
          <form style={styles.form} onSubmit={handleVerifyCode}>
            <input
              style={styles.codeInput}
              type="text"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              disabled={loading}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={{ ...styles.button, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button style={styles.resendBtn} type="button" onClick={() => {
              setStep('phone')
              setCode('')
              setError('')
            }}>
              Use a different number
            </button>
          </form>
        )}

        <div id="recaptcha-container"></div>
      </div>
    </div>
  )
}

const styles = {
  screen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#F1EFE8',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    textAlign: 'center',
  },
  wordmark: {
    fontSize: '32px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    color: '#085041',
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2C2C2A',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#7A7A72',
    marginBottom: '32px',
    maxWidth: '260px',
  },
  form: {
    width: '100%',
    maxWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    border: '1px solid #E0DDD5',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  prefix: {
    padding: '14px 12px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#555550',
    background: '#F1EFE8',
    borderRight: '1px solid #E0DDD5',
  },
  input: {
    flex: 1,
    padding: '14px 12px',
    fontSize: '15px',
    border: 'none',
    outline: 'none',
    background: 'white',
    color: '#2C2C2A',
  },
  codeInput: {
    width: '100%',
    padding: '14px',
    fontSize: '20px',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: '8px',
    background: 'white',
    border: '1px solid #E0DDD5',
    borderRadius: '12px',
    outline: 'none',
    color: '#2C2C2A',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#1D9E75',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
  },
  error: {
    fontSize: '13px',
    color: '#D63D3D',
    margin: '-8px 0',
  },
  resendBtn: {
    background: 'none',
    border: 'none',
    color: '#1D9E75',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
}
