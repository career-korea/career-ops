import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import celery from 'celery-node'
import type { EvaluationRequestDto, EvaluationResultDto } from '@career-ops/shared'

const app = new Hono()

// 모든 API 요청에 대해 CORS 적용으로 프론트엔드 연동 에러 방지
app.use('/api/*', cors())

// 1. Node 환경 변수 기반으로 Redis 클라이언트 설정 구성
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379/0'
console.log(`[HONO-INIT] Connecting to Celery Broker at: ${redisUrl}`)

const celeryClient = celery.createClient(redisUrl, redisUrl)

// 2. Python Celery 워커 내에 등록된 테스트용 add_numbers 태스크 바인딩
const addNumbersTask = celeryClient.createTask('src.tasks.test_tasks.add_numbers')

const routes = app
  .get('/api/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    })
  })
  .post('/api/dummy-eval', async (c) => {
    // Shared 패키지 DTO 타입 강제
    const reqData: EvaluationRequestDto = await c.req.json()

    console.log(`Evaluating JD for company: ${reqData.companyName}`)

    const result: EvaluationResultDto = {
      score: 4.2,
      gapAnalysis: 'Need more TypeScript experience.',
      interviewPrepSTAR: 'Describe a time you solved a monorepo version mismatch.'
    }

    return c.json(result)
  })
  // 3. [Task 1.2.2 추가] Redis 비동기 태스크 발행용 테스트 API 엔드포인트
  .post('/api/tasks/test', async (c) => {
    try {
      const { x, y } = await c.req.json<{ x: number; y: number }>()

      if (typeof x !== 'number' || typeof y !== 'number') {
        return c.json({ error: 'Parameters "x" and "y" must be valid numbers.' }, 400)
      }

      console.log(`[HONO-PUBLISH] Enqueuing task to Redis -> add_numbers(${x}, ${y})`)

      // Celery 브로커 큐로 비동기 호출 이벤트 전송
      const result = addNumbersTask.delay(x, y)

      return c.json({
        status: 'queued',
        taskId: result.taskId,
        message: `Task successfully enqueued. Computing: ${x} + ${y}`
      }, 202)
    } catch (err: any) {
      console.error('[HONO-ERROR] Failed to enqueue task:', err)
      return c.json({ error: 'Internal server error while enqueuing task.' }, 500)
    }
  })

export type AppType = typeof routes

const port = 8000
console.log(`Backend server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})