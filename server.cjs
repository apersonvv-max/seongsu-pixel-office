const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const files = ['index.html', 'style.css', 'app.js', 'art.js', 'core.js', 'legacy-data.js'];
if (process.argv.includes('--build')) {
  const target = path.join(root, 'dist');
  fs.mkdirSync(target, { recursive: true });
  for (const file of files) fs.copyFileSync(path.join(root, file), path.join(target, file));
  fs.cpSync(path.join(root, 'assets'), path.join(target, 'assets'), { recursive: true });
  console.log('Static build ready in dist/');
} else {
  const option = (name, fallback) => {
    const args = process.argv.slice(2);
    const joined = args.find(value => value.startsWith(name + '='));
    if (joined) return joined.slice(name.length + 1);
    const index = args.indexOf(name);
    return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : fallback;
  };
  const port = Number(option('--port', process.env.PORT || 3000));
  const host = option('--host', process.env.HOST || '0.0.0.0');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

  let GoogleGenAI;
  try { ({ GoogleGenAI } = require('@google/genai')); } catch(e) {}

  const PERSONAS = {
    emp_ceo: {
      name: '대표 이팀장',
      systemInstruction: "당신은 '성수동이팀장' 픽셀 오피스의 대표 이팀장(세이지 숲개구리, 큰 검은 뿔테 안경, 코발트 실크 스카프, 황동 핀 착용)입니다. 따뜻하고 사려 깊으며, 팀원의 성장을 진심으로 응원하고 사업의 큰 방향성을 차분하게 짚어주는 든든한 리더입니다. 부드럽고 친절한 한국어 존댓말(해요체)로 2~4문장으로 따뜻하게 답변하세요."
    },
    emp_miki: {
      name: '이팀장 미키',
      systemInstruction: "당신은 픽셀 오피스의 운영 총괄 미키(보라색 헤드셋을 낀 밝고 활기찬 청개구리)입니다. 팀의 분위기 메이커이자 에너지 넘치는 기획자입니다. 사운드와 음악, 감각적인 분위기를 좋아하며, 밝고 명랑한 한국어 존댓말(해요체)로 2~4문장으로 답변하세요."
    },
    emp_karina: {
      name: '카리나 과장',
      systemInstruction: "당신은 픽셀 오피스의 총괄 PM 카리나 과장(사원증과 클립보드를 든 온화한 카피바라)입니다. 늘 여유롭고 평온한 미소를 짓지만 일정 관리와 업무 우선순위는 꼼꼼히 챙깁니다. 나긋나긋하고 안정감을 주는 부드러운 한국어 존댓말로 2~4문장으로 답변하세요."
    },
    emp_son: {
      name: '손지현 부장',
      systemInstruction: "당신은 픽셀 오피스의 수석 디자이너 손지현 부장(옥색 날개와 타블렛 펜을 든 루나모스)입니다. 섬세하고 감성적이며 따뜻한 색채와 픽셀 디테일을 소중히 여깁니다. 조용하고 감각적인 한국어 존댓말로 2~4문장으로 답변하세요."
    },
    emp_yoo: {
      name: '유민철 대리',
      systemInstruction: "당신은 픽셀 오피스의 데이터 분석가 유민철 대리(둥근 안경을 쓰고 8개의 다리로 차트와 통계를 분석하는 스마트한 문어)입니다. 논리적이고 명쾌하며 팩트 기반의 인사이트를 제시합니다. 단정하고 똑부러지는 한국어 존댓말로 2~4문장으로 답변하세요."
    }
  };

  async function handleColleagueChat(body) {
    const { employeeId, message } = body || {};
    const persona = PERSONAS[employeeId] || PERSONAS.emp_ceo;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !GoogleGenAI) {
      const fallbacks = {
        emp_ceo: '안녕하세요! 우리 작은 동료들과 함께 만들어가는 다음 프로젝트, 참 기대되네요. 지금은 기본 응답 모드지만, Settings에서 GEMINI_API_KEY를 설정하시면 더 깊은 맞춤형 업무 대화를 나눌 수 있답니다.',
        emp_miki: '반가워요! 오늘도 햇살 좋은 사무실에서 신나는 음악과 함께 업무를 시작해볼까요? 언제든 업무 배정이나 피드백이 필요하면 말씀해주세요!',
        emp_karina: '안녕하세요~ 오늘도 칸반 보드 확인하고 차근차근 진행해볼게요. 무리하지 마시고 차 한 잔 하면서 여유롭게 이어가요.',
        emp_son: '안녕하세요. 따뜻한 색감과 디테일한 픽셀이 마음에 드시나요? 시각적인 부분에서 제안이 있다면 언제든 편하게 알려주세요.',
        emp_yoo: '안녕하세요! 데이터 대시보드와 지표는 정상 범위에서 순항 중입니다. 궁금한 분석 항목이나 검증할 데이터가 있으신가요?'
      };
      return { text: fallbacks[employeeId] || fallbacks.emp_ceo, isFallback: true, colleague: persona.name };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message || '안녕하세요! 오늘 업무에 대해 조언 부탁드려요.',
        config: { systemInstruction: persona.systemInstruction, temperature: 0.7, maxOutputTokens: 250 }
      });
      return { text: response.text || '오늘도 함께 힘내봐요!', isFallback: false, colleague: persona.name };
    } catch (err) {
      const fallbacks = {
        emp_ceo: '안녕하세요! 우리 작은 동료들과 함께 만들어가는 다음 프로젝트, 참 기대되네요. 지금은 포근한 오피스 모드로 안내해 드리고 있어요. 언제든 편하게 말씀해 주세요.',
        emp_miki: '반가워요! 오늘도 햇살 좋은 사무실에서 신나는 음악과 함께 업무를 시작해볼까요? 언제든 업무 배정이나 피드백이 필요하면 말씀해주세요!',
        emp_karina: '안녕하세요~ 오늘도 칸반 보드 확인하고 차근차근 진행해볼게요. 무리하지 마시고 차 한 잔 하면서 여유롭게 이어가요.',
        emp_son: '안녕하세요. 따뜻한 색감과 디테일한 픽셀이 마음에 드시나요? 시각적인 부분에서 제안이 있다면 언제든 편하게 알려주세요.',
        emp_yoo: '안녕하세요! 데이터 대시보드와 지표는 정상 범위에서 순항 중입니다. 궁금한 분석 항목이나 검증할 데이터가 있으신가요?'
      };
      return { text: fallbacks[employeeId] || fallbacks.emp_ceo, isFallback: true, colleague: persona.name, note: 'Gemini AI 연결 대기' };
    }
  }

  http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); return res.end(); }

    if (req.method === 'POST') {
      let bodyData = '';
      req.on('data', chunk => { bodyData += chunk; if (bodyData.length > 1000000) req.destroy(); });
      req.on('end', async () => {
        let parsed = {};
        try { parsed = JSON.parse(bodyData || '{}'); } catch(e) {}
        if (pathname === '/api/chat') {
          const result = await handleColleagueChat(parsed);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify(result));
        }
        if (pathname === '/qa-report') {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ ok: true }));
        }
        res.writeHead(404);
        res.end();
      });
      return;
    }

    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(root, file);
    const allowed = files.includes(relative) || relative === 'browser-qa.js' || relative === 'responsive-qa.html' || relative.startsWith('assets' + path.sep) || relative.startsWith('public' + path.sep);
    if (!allowed || relative.split(path.sep).some(part => part.startsWith('.'))) { res.writeHead(404); return res.end(); }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  }).listen(port, host, () => console.log(`Pixel office ready on http://${host}:${port}`));
}