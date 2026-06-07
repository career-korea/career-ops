import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { hc } from 'hono/client'
// Backend의 라우트 스키마 및 Shared의 DTO 공유
import type { AppType } from '../../backend/src/index'
import type { UserProfileDto } from '@career-ops/shared'

// Hono RPC Client 인스턴스 생성 (백엔드 경로 지정)
const client = hc<AppType>('http://localhost:8000')

function App() {
  const [status, setStatus] = useState<string>('Connecting...')
  const [profile, setProfile] = useState<UserProfileDto | null>(null)

  useEffect(() => {
    // Hono RPC 타입-안전 API 호출 실행
    client.api.health.$get()
      .then(res => res.json())
      .then(data => {
        setStatus(`Backend Online: ${data.status}`)

        // Shared DTO 데이터 적용
        const mockProfile: UserProfileDto = {
          userId: 'usr_01',
          email: 'candidate@careerops.io',
          createdAt: new Date().toISOString()
        }
        setProfile(mockProfile)
      })
      .catch(() => setStatus('Backend Offline'))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>career-ops Monorepo Integration Demo</h1>
      <p><strong>System Status:</strong> {status}</p>
      {profile && (
        <div>
          <h3>User Profile (Shared DTO Check):</h3>
          <p>Email: {profile.email}</p>
          <p>Created At: {profile.createdAt}</p>
        </div>
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)