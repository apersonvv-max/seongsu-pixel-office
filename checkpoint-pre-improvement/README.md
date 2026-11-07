# 복구 체크포인트: 디자인 1차 개선 전 원본 상태 (Checkpoint 001)

- **생성 일시**: 2026-11-06 (디자인 1차 개선 직전)
- **보관 내용**:
  - `art.js`: 기존 48×48 절차형 픽셀 렌더러
  - `app.js`: 시연 상태 및 가구 깊이 렌더러
  - `core.js`: 45개 검사 통과 상태, 5명 직원 및 가구 충돌/경로 데이터
  - `assets/`: 기존 종별 atlas 및 가구 레이어 원본
  - `index.html`, `style.css`, `legacy-data.js`, `server.cjs`, `package.json` 등

## 복구 방법 (Rollback Instruction)
이 체크포인트로 되돌리려면 루트 디렉토리에서 아래 명령을 실행합니다:
```bash
cp -r checkpoint-pre-improvement/* .
```
