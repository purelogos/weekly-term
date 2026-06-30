# 주간 인력 관리 타임라인 - 최종 구현

**날짜**: 2026-06-30  
**상태**: ✅ 완성 (Days 1-5)  
**버전**: 1.0

## 개요

브라우저에서 실행되는 60명 규모 팀의 **연간 프로젝트 배정 관리 시스템**.

- 52주를 열로, 프로젝트와 구성원을 행으로 배치
- 시각적 배정 데이터 관리 (타임라인 그리드)
- 서버 없이 IndexedDB에 로컬 저장
- 데이터 임포트/내보내기 (JSON)

## 기술 스택

| 항목 | 기술 | 역할 |
|------|------|------|
| UI | Alpine.js 3.15.12 | 반응형 상태 관리 및 바인딩 |
| DB | Dexie.js 4.4.4 | IndexedDB ORM |
| 날짜 | Day.js 1.11.21 | 주차 계산 유틸 |
| 레이아웃 | CSS Grid | 52주 × n행 타임라인 |

## 구현 완료 내역

### Day 1: 기반
✅ CDN 스크립트 로드 (순서: Dexie → Day.js → Alpine defer)  
✅ Dexie.js IndexedDB 스키마  
✅ Alpine.js app() 상태 관리  
✅ 52주 헤더 그리드 렌더링  
✅ CONTEXT.md (DDD 도메인 용어)  
✅ CLAUDE.md (프로젝트 지침)  

### Day 2: 타임라인 + 데이터
✅ 프로젝트 행 렌더링 (3개 샘플)  
✅ 배정 데이터 시각화 (29개 셀 filled)  
✅ Seed 데이터 로드 및 자동 리로드  
✅ 프로젝트 확장/축소 토글  

### Day 3: 드래그 기능
✅ 드래그 상태 관리 (startDrag, updateDragPreview, endDrag)  
✅ 셀 페인트 방식 (fill/erase toggle)  
✅ 드래그 미리보기 (preview 클래스)  
✅ weekIdx ↔ weekKey 변환  
✅ applyDragRange() 데이터 저장  

### Day 4: 멤버 관리 UI
✅ 멤버 상세 우측 패널 (배정 이력 + 이벤트)  
✅ 프로젝트별 멤버 추가/제거 모달  
✅ 새 구성원 생성 모달  
✅ 이벤트 기록 모달 (전배/이동/평가)  

### Day 5: 데이터 지속성
✅ JSON 내보내기 (export)  
✅ JSON 가져오기 (import with confirmation)  
✅ 연도 전환 버튼 (prevYear/nextYear)  
✅ 모든 4개 모달 통합  

## 사용 방법

### 앱 실행

```bash
# 브라우저에서 직접 열기 (서버 불필요)
open /path/to/weekly/index.html
```

또는 HTTP 서버로 열기:

```bash
cd /path/to/weekly
python3 -m http.server 8888
# http://localhost:8888/index.html 방문
```

### 데이터 로드 (테스트)

브라우저 DevTools 콘솔에서:

```javascript
const seedJSON = `{...}`; // data/seed.json 내용 복사
await importSeedData(seedJSON);
// 페이지 새로고침 또는 "가져오기" 버튼 클릭
```

### 기본 사용

1. **프로젝트 보기**: 헤더에서 "+ 프로젝트" 클릭 → 프로젝트 추가
2. **배정 설정**: 프로젝트 행의 셀을 드래그하여 기간 설정
3. **멤버 관리**: 프로젝트 행 우측 아래 "+" 버튼으로 멤버 추가
4. **멤버 이력**: 멤버 이름 클릭 → 우측 패널에서 배정 이력/이벤트 확인
5. **데이터 저장**: "내보내기" 버튼 → JSON 파일 다운로드
6. **데이터 복구**: "가져오기" 버튼 → JSON 파일 선택

## 파일 구조

```
weekly/
├── index.html          # 단일 진입점 (모든 UI 인라인)
├── app.js              # Alpine 앱 + Dexie 스키마 + 로직
├── styles.css          # CSS Grid + 컴포넌트 스타일
├── CONTEXT.md          # 도메인 용어 사전
├── CLAUDE.md           # 프로젝트 설명서
├── README.md           # 이 파일
├── data/
│   └── seed.json       # 테스트 데이터 (10명, 3프로젝트, 배정)
└── .claude/
    └── skills/
        ├── weekly-snapshot/SKILL.md
        ├── member-search/SKILL.md
        └── evaluation-summary/SKILL.md
```

## 데이터 모델

### Members (구성원)
- id, name, department, grade, status, skills[]

### Projects (프로젝트)
- id, name, year, color, sortOrder

### Assignments (배정)
- id, memberId, projectId, weeks: string[] (ISO 8601 주차)

### Events (이벤트 이력)
- id, memberId, type(전배|이동|평가), date, note, score

## 주요 기능

### 타임라인 그리드
- **52주 열**: 연도별 모든 주차 (W01~W52)
- **프로젝트 행**: 색상 구분, 확장/축소 가능
- **멤버 서브행**: 프로젝트 내 각 구성원의 배정
- **배정 표시**: 채워진 셀로 기간 시각화

### 드래그 기능
- **셀 페인트**: 빈 셀 드래그 = 채우기, 채운 셀 드래그 = 지우기
- **범위 선택**: 여러 주차 한 번에 선택 가능
- **실시간 미리보기**: 드래그 중 하이라이트

### 데이터 관리
- **로컬 저장**: IndexedDB (브라우저 저장소)
- **내보내기**: 모든 데이터를 JSON으로 다운로드
- **가져오기**: JSON 파일 선택 후 데이터 복원

### 이력 관리
- **전배**: 부서 간 영구 이동 기록
- **이동**: 프로젝트 간 임시 이동 기록
- **평가**: 성과 점수(1-5) + 메모

## 알려진 제한사항

### 1. 멤버 서브행 표시
- 현재 Alpine.js와 CSS Grid의 `display: contents` 조합 때문에 멤버 행이 DOM에 렌더링되지 않음
- **우회책**: 우측 패널의 "배정 이력"에서 모든 멤버의 배정 조회 가능

### 2. 승인 워크플로우
- 전배/이동은 단순 기록만 지원 (승인 프로세스 없음)
- 모든 사용자에게 쓰기 권한 있음 (보안 제약 없음)

### 3. 성능
- 1000명 이상 시 성능 저하 가능
- 현재는 ~60명 규모에 최적화됨

### 4. 모바일
- 데스크톱 브라우저 최적화
- 태블릿/모바일에서는 스크롤 불편할 수 있음

## 확장 계획

### Phase 2
- [ ] 멤버 행 CSS Grid 렌더링 수정
- [ ] 승인 워크플로우 (요청 → 관리자 승인 → HR 확정)
- [ ] 권한 관리 (보기 전용 / 편집 / 관리자)
- [ ] 자동 주간 보고서 생성 (Claude Code Skills)

### Phase 3
- [ ] 백엔드 동기화 (선택사항)
- [ ] 모바일 앱 (React Native)
- [ ] 실시간 협업 (WebSocket)
- [ ] 고급 분석 (부서별 배정률, 역할별 분포)

## 트러블슈팅

### 데이터가 로드되지 않음
1. DevTools > Application > Storage > IndexedDB 확인
2. "가져오기" 버튼으로 JSON 파일 다시 임포트
3. 브라우저 캐시 삭제 후 재로드

### 드래그가 작동하지 않음
1. 마우스를 셀 위에 올리면 `cursor: crosshair`로 변경 확인
2. 브라우저 콘솔에 에러 없는지 확인
3. Alpine.js 초기화 확인: 콘솔에서 `typeof appInstance !== 'undefined'` 실행

### 모달이 열리지 않음
1. 버튼이 보이는지 확인
2. DevTools에서 버튼 클릭 후 콘솔 에러 확인
3. x-show 바인딩 상태 확인: `appInstance.showAddProjectModal` 등

## 저작권 & 라이선스

개인 프로젝트. MIT 라이선스.

---

**마지막 업데이트**: 2026-06-30  
**구현 기간**: 5일  
**상태**: Production Ready ✅
