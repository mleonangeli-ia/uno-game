import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  roomCode: string
}

export default function QRCard({ roomCode }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [joinUrl, setJoinUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function build() {
      try {
        // Pide las IPs de red local al servidor
        const res = await fetch('/api/network-info')
        const { ips } = await res.json()
        const ip = ips[0] ?? 'localhost'
        const port = window.location.port || '5174'
        const url = `http://${ip}:${port}/?join=${roomCode}`
        setJoinUrl(url)
        const dataUrl = await QRCode.toDataURL(url, {
          width: 220,
          margin: 2,
          color: { dark: '#111', light: '#FAFAFA' },
          errorCorrectionLevel: 'M',
        })
        setQrDataUrl(dataUrl)
      } catch {
        // Fallback a localhost
        const url = `${window.location.origin}/?join=${roomCode}`
        setJoinUrl(url)
        QRCode.toDataURL(url, { width: 220, margin: 2 }).then(setQrDataUrl)
      }
    }
    build()
  }, [roomCode])

  function copyUrl() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      background: 'rgba(0,0,0,0.35)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 20,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
    }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
        Escaneá para unirte
      </p>

      {/* QR */}
      <div style={{
        background: '#FAFAFA',
        borderRadius: 14,
        padding: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}>
        {qrDataUrl
          ? <img src={qrDataUrl} alt="QR Code" style={{ display: 'block', borderRadius: 8 }} />
          : <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 32, height: 32, border: '3px solid #ccc',
                borderTopColor: '#333', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
        }
      </div>

      {/* URL copiable */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 10, padding: '8px 12px',
        width: '100%', maxWidth: 280,
        border: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
      }} onClick={copyUrl}>
        <span style={{
          flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: 11,
          fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {joinUrl || '...'}
        </span>
        <span style={{
          color: copied ? '#4CAF50' : 'rgba(255,255,255,0.4)',
          fontSize: 11, fontWeight: 700, flexShrink: 0,
          transition: 'color 0.2s',
        }}>
          {copied ? '✓ Copiado' : '📋 Copiar'}
        </span>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0, textAlign: 'center' }}>
        Abrí la URL o escaneá el QR desde cualquier dispositivo en la misma red
      </p>
    </div>
  )
}
