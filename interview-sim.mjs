#!/usr/bin/env node
/**
 * interview-sim.mjs — AI Interview Simulator & Feedback Orchestrator
 *
 * Usage:
 *   CLI 모드 (직접 연습):
 *     node interview-sim.mjs --interactive
 *
 *   백엔드 API 호출 모드:
 *     node interview-sim.mjs --action first-question --company "카카오" --role "서버 개발자"
 *     node interview-sim.mjs --action feedback --question "..." --answer "..." --difficulty "practice"
 *     node interview-sim.mjs --action next-question --company "..." --role "..." --history-json "..."
 *     node interview-sim.mjs --action final-report --history-json "..."
 */

import { readFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

try {
  const { config } = await import('dotenv');
  config();
} catch {
  // dotenv is optional
}

import { GoogleGenerativeAI } from '@google/generative-ai';

const ROOT = dirname(fileURLToPath(import.meta.url));
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash';

if (!GEMINI_KEY && process.argv.includes('--action')) {
  console.error('Error: GEMINI_API_KEY environment variable is required.');
  process.exit(1);
}

// AI 초기화
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

// 로컬 데이터 로드 헬퍼
function loadUserContext() {
  let cv = '';
  let profile = '';
  if (existsSync('cv.md')) cv = readFileSync('cv.md', 'utf-8');
  if (existsSync('config/profile.yml')) profile = readFileSync('config/profile.yml', 'utf-8');
  return { cv, profile };
}

// ---------------------------------------------------------------------------
// AI 호출 코어 함수들
// ---------------------------------------------------------------------------

async function getFirstQuestion(company, role) {
  const { cv, profile } = loadUserContext();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
당신은 ${company}의 채용 면접관입니다. 지원 직무는 [${role}]입니다.
아래 지원자의 이력서(cv.md)와 프로필 설정(profile.yml)을 참고하여 첫 번째 질문으로 1분 자기소개 및 지원 동기를 정중하고 전문적인 어조로 물어보세요.
질문 텍스트만 깔끔하게 반환하세요. 다른 불필요한 설명이나 친절한 문구는 제외하세요.

[지원자 이력서]
${cv}

[지원자 프로필]
${profile}
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

async function getFeedback(question, answer, difficulty) {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
당신은 아주 날카롭고 객관적인 IT 면접관입니다. 
아래 질문에 대한 면접자의 답변을 듣고, 기획서의 Step 2 형식에 부합하는 피드백을 JSON 형식으로 작성하세요.
난이도: ${difficulty} (real인 경우 좀 더 차갑고 압박 면접 느낌의 피드백을 제공하고, practice인 경우 친절하고 실용적인 예시를 강조합니다)

반드시 아래 스키마를 따르는 JSON 데이터만 출력하세요:
{
  "score": 8, // 1에서 10 사이의 정수 점수
  "content": "**잘한 점:** [여기에 구체적으로 작성]\\n**보완 포인트:** [여기에 구체적으로 작성]\\n**이렇게 바꾸면:** [여기에 개선된 답변 예시 1~2문장 작성]"
}

[질문]
${question}

[답변]
${answer}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  try {
    return JSON.parse(text);
  } catch (err) {
    // 파싱 오류 폴백
    return {
      score: 5,
      content: `**잘한 점:** 답변을 포기하지 않고 제출했습니다.\n**보완 포인트:** 형식이 올바르지 않은 응답이 반환되었습니다.\n**이렇게 바꾸면:** 구체적인 기술 성과 중심으로 다시 설명해 보세요.`
    };
  }
}

async function getNextQuestion(company, role, history) {
  const { cv } = loadUserContext();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const historyStr = history.map((h, i) => `[Q${i+1}] ${h.question}\n[A${i+1}] ${h.answer}`).join('\n\n');

  const prompt = `
당신은 ${company}의 채용 면접관입니다. 지원 직무는 [${role}]입니다.
지금까지 진행된 문답 역사와 지원자의 이력서(cv.md)를 바탕으로, 다음 질문을 던져주세요.
이전 답변에서 미흡했던 점에 대한 꼬리 질문(압박 질문)이거나 다음 면접 단계를 위한 새로운 직무/인성 질문이어야 합니다.
한 번에 질문은 하나만 던져야 합니다.
질문 텍스트만 깔끔하게 반환하세요.

[지원자 이력서]
${cv}

[문답 역사]
${historyStr}
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

async function getFinalReport(history) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const historyStr = history.map((h, i) => `[Q${i+1}] ${h.question}\n[A${i+1}] ${h.answer}\n[F${i+1}] ${h.feedback}`).join('\n\n');

  const prompt = `
당신은 면접 종합 평가를 내리는 헤드헌팅 전문가이자 채용 위원입니다.
진행된 전체 면접 문답 및 각 턴별 피드백 역사를 종합 분석하여 기획서 Step 3 규격에 맞는 최종 종합 평가 보고서를 마크다운 형식으로 작성하세요.

반드시 아래 마크다운 포맷을 그대로 준수하여 출력하세요:

## 면접 종합 평가

**총점: [평균 점수 기반의 100점 만점 환산 점수]/100**

| 항목 | 점수 | 평가 |
|------|------|------|
| 논리성 | X/20 | [한 줄 평가] |
| 구체성(STAR) | X/20 | [한 줄 평가] |
| 직무 적합성 | X/20 | [한 줄 평가] |
| 열의·태도 | X/20 | [한 줄 평가] |
| 커뮤니케이션 | X/20 | [한 줄 평가] |

**가장 잘한 답변:** [해당 질문명] (이유 요약)
**가장 아쉬운 답변:** [해당 질문명] (보완 방향 요약)

**합격 가능성 판단:** [상 / 중 / 하]
**다음 연습 추천:** [실제 구체적인 다음 구직/연습 액션 1~2개]

[전체 면접 역사]
${historyStr}
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ---------------------------------------------------------------------------
// CLI 대화형 모드 (Interactive Mode)
// ---------------------------------------------------------------------------
async function startCliInteractive() {
  if (!genAI) {
    console.error('Error: GEMINI_API_KEY is not set. CLI mode cannot run without API Key.');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log('\n🤖 AI 면접 시뮬레이터 (CLI 모드)를 가동합니다.');
  const company = await ask('1. 지원할 회사명을 입력하세요: ') || '가상의 기업';
  const role = await ask('2. 지원할 직무를 입력하세요: ') || '소프트웨어 엔지니어';
  const difficulty = await ask('3. 난이도를 선택하세요 (practice/real): ') || 'practice';

  console.log('\n[알림] 이력서 및 맞춤 설정을 읽어 면접관 페르소나를 구성하고 있습니다...\n');

  let history = [];
  let currentQuestion = await getFirstQuestion(company, role);

  for (let i = 0; i < 10; i++) {
    console.log(`\n💬 [질문 ${i + 1}/10] ${currentQuestion}`);
    const answer = await ask('\n✍️  나의 답변 (종료하려면 exit 입력): ');

    if (answer.trim().toLowerCase() === 'exit') {
      console.log('\n[알림] 면접을 중도 하차하여 조기 종료합니다.');
      break;
    }

    console.log('\n[AI] 답변을 정밀 채점하는 중...');
    const feedbackObj = await getFeedback(currentQuestion, answer, difficulty);

    console.log('\n======================================');
    console.log(feedbackObj.content);
    console.log(`점수: ${feedbackObj.score}/10`);
    console.log('======================================');

    history.push({
      question: currentQuestion,
      answer: answer,
      feedback: feedbackObj.content
    });

    if (i < 9) {
      console.log('\n[AI] 다음 꼬리 질문을 생각하는 중...');
      currentQuestion = await getNextQuestion(company, role, history);
    }
  }

  console.log('\n[AI] 전체 문답 데이터베이스를 기반으로 최종 종합 보고서를 추출하는 중...');
  const finalReport = await getFinalReport(history);
  console.log('\n======================================');
  console.log(finalReport);
  console.log('======================================');

  rl.close();
}

// ---------------------------------------------------------------------------
// 메인 CLI 엔트리포인트 (인자 매핑)
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--interactive')) {
    await startCliInteractive();
    return;
  }

  const actionIdx = args.indexOf('--action');
  if (actionIdx === -1) {
    console.log('Usage:');
    console.log('  node interview-sim.mjs --interactive (CLI 대화형 모드)');
    console.log('  node interview-sim.mjs --action [first-question/feedback/next-question/final-report] [arguments...]');
    return;
  }

  const action = args[actionIdx + 1];

  if (action === 'first-question') {
    const compIdx = args.indexOf('--company');
    const roleIdx = args.indexOf('--role');
    const company = compIdx !== -1 ? args[compIdx + 1] : 'Unknown';
    const role = roleIdx !== -1 ? args[roleIdx + 1] : 'Developer';
    const res = await getFirstQuestion(company, role);
    console.log(res);
  } 
  else if (action === 'feedback') {
    const qIdx = args.indexOf('--question');
    const aIdx = args.indexOf('--answer');
    const dIdx = args.indexOf('--difficulty');
    const question = qIdx !== -1 ? args[qIdx + 1] : '';
    const answer = aIdx !== -1 ? args[aIdx + 1] : '';
    const difficulty = dIdx !== -1 ? args[dIdx + 1] : 'practice';
    const res = await getFeedback(question, answer, difficulty);
    console.log(JSON.stringify(res));
  } 
  else if (action === 'next-question') {
    const compIdx = args.indexOf('--company');
    const roleIdx = args.indexOf('--role');
    const histIdx = args.indexOf('--history-json');
    const company = compIdx !== -1 ? args[compIdx + 1] : 'Unknown';
    const role = roleIdx !== -1 ? args[roleIdx + 1] : 'Developer';
    const history = histIdx !== -1 ? JSON.parse(args[histIdx + 1]) : [];
    const res = await getNextQuestion(company, role, history);
    console.log(res);
  } 
  else if (action === 'final-report') {
    const histIdx = args.indexOf('--history-json');
    const history = histIdx !== -1 ? JSON.parse(args[histIdx + 1]) : [];
    const res = await getFinalReport(history);
    console.log(res);
  }
}

main().catch(console.error);
