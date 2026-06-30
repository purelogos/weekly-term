# CLAUDE.md — 주간 인력 관리 시스템

## 프로젝트 개요

브라우저 전용 인력 관리 타임라인 시스템.
- 60명 규모 팀의 연간 프로젝트 배정을 시각적으로 관리
- 52주를 열로, 프로젝트와 구성원을 행으로 배치
- 엑셀 스타일 셀 드래그로 기간 설정
- 서버 없이 로컬 브라우저에서 100% 실행

## 실행 방법

```bash
# 간단히 브라우저에서 열기 (서버 불필요)
open /path/to/weekly/index.html
# 또는 drag-and-drop to browser
```

## 기술 스택

| 역할 | 라이브러리 | 비고 |
|---|---|---|
| 반응형 UI | Alpine.js 3.15.12 | CDN, defer |
| IndexedDB ORM | Dexie.js 4.4.4 | CDN, sync (Alpine 전 로드) |
| 주차 계산 | Day.js 1.11.21 | CDN, isoWeek 플러그인 |
| 타임라인 그리드 | 커스텀 CSS Grid | 52주 열 + sticky 이름 열 |

## 핵심 파일 설명

- **index.html**: 단일 진입점, 모든 UI 인라인 (fetch() 없음)
- **app.js**: Alpine app() 함수 + Dexie 스키마 + 드래그 로직
- **styles.css**: CSS Grid 타임라인 레이아웃 + 모달/패널 스타일
- **CONTEXT.md**: 도메인 용어 사전 (DDD 패턴)
- **data/seed.json**: 테스트용 시드 데이터

## 도메인 언어 (Domain Language)

모든 코드와 대화에서 `CONTEXT.md`의 영문 용어 사용:

- member (구성원)
- project (프로젝트)
- assignment (배정)
- event (이력)
- weekKey (주차, 'YYYY-WXX' 형식)
- transfer/move/evaluation (이벤트 타입)

## 주요 기능

### 1. 타임라인 그리드
- 현재 연도 52주 수평 스크롤 뷰
- 프로젝트별 색상 구분
- 고정 이름 열 (좌측 sticky)
- 확장/축소 가능한 프로젝트 (구성원 서브-행)

### 2. 셀 드래그 (Paint Drag)
- 빈 셀 범위 드래그 → 채우기 (배정)
- 채운 셀 범위 드래그 → 지우기 (배정 해제)
- 미리보기: 드래그 중 반투명 하이라이트
- 토글: 같은 범위 재드래그 → 상태 반대

### 3. 멤버 관리
- 프로젝트에 구성원 추가 (드롭다운)
- 새 구성원 생성 (모달)
- 구성원 클릭 → 배정 이력 + 이벤트 타임라인 (우측 패널)

### 4. 이벤트 기록
- 전배 (permanent transfer)
- 이동 (temporary move)
- 평가 (evaluation score 1-5 + memo)

### 5. Import/Export
- **Export JSON**: 모든 데이터 JSON 파일로 다운로드
- **Import JSON**: 파일 선택 후 DB 초기화 및 데이터 복원

### 6. 연도 전환
- 헤더의 ◀ / ▶ 버튼으로 연도 이동
- 해당 연도 프로젝트/배정만 로드

## 데이터 저장소

모든 데이터는 브라우저 **IndexedDB** (`WeeklyStaffDB`) 에 저장:
- **members**: 구성원
- **projects**: 프로젝트 (연도별)
- **assignments**: 배정 (구성원-프로젝트-주차)
- **events**: 이벤트 (전배/이동/평가 기록)

**데이터 백업**: 헤더의 "내보내기" 버튼 클릭 → JSON 다운로드
**데이터 복구**: 헤더의 "가져오기" 버튼 → JSON 파일 선택 → 데이터 복원

## 테스트 데이터 로드

브라우저 DevTools 콘솔에서:

```javascript
const seedJSON = `
{
  "members": [
    {"id":1, "name":"김철수", "department":"개발1팀", "grade":"과장", "status":"active", "skills":["React","Node.js"]},
    ...
  ],
  "projects": [
    {"id":1, "name":"Project Alpha", "year":2026, "color":"#3b82f6", "sortOrder":1},
    ...
  ],
  "assignments": [
    {"id":1, "memberId":1, "projectId":1, "weeks":["2026-W01","2026-W02"]},
    ...
  ],
  "events": []
}
`;

await importSeedData(seedJSON);
// 콘솔에 "✓ Seed data imported. Reload the page to see changes." 표시 → 새로고침
```

또는 data/seed.json 파일 내용 복사 → 위 과정 반복.

## 주의사항

### Script 로드 순서 (Critical)
1. Day.js (sync)
2. Day.js plugins: isoWeek, weekOfYear 등록
3. Dexie.js (sync)
4. Alpine.js (defer) ← 마지막에 실행
5. app.js ← Alpine 초기화 후 실행

오류 시 콘솔에서 `typeof Dexie === 'undefined'` 확인.

### file:// 프로토콜 제약
- `fetch()` 로컬 파일 로드 불가
- 모든 HTML/CSS는 index.html에 인라인
- components/ 폴더는 참조용 (실제 사용 없음)

### 주차 형식
- 모든 주차는 ISO 8601: `YYYY-WXX` (예: 2026-W26)
- weekKey ↔ weekIdx 변환: app.weekIdxToKey() / app.weekKeyToIdx()
- Day.js `isoWeek()` 플러그인 필수

### IndexedDB 데이터 손실 방지
- 정기적으로 "내보내기" 클릭 → JSON 파일 저장
- 브라우저 캐시 삭제, 개인정보 삭제 시 IndexedDB도 초기화됨
- 프로덕션: 정기 자동 백업 권장

## Claude Code Skills

`.claude/skills/` 에 3개 스킬 배치:

### /weekly-snapshot [weekKey]
특정 주차의 배정 현황 HTML 보고서 생성.

```bash
/weekly-snapshot 2026-W26
# → weekly-report-2026-W26.html 생성
```

### /member-search [이름]
구성원의 연간 배정 이력 + 이벤트 조회.

```bash
/member-search 김철수
# → 배정 테이블 + 이벤트 타임라인 마크다운 출력
```

### /evaluation-summary [--year 2026] [--member 김철수]
평가 집계 요약.

```bash
/evaluation-summary --year 2026
# → 모든 구성원의 평가 점수 및 메모 집계 출력
```

## 아키텍처 결정 (ADR)

### ADR-001: IndexedDB vs 파일 저장
- **결정**: IndexedDB 사용 (다중-탭 동기화, 성능)
- **대안 검토**: localStorage (너무 작음, 60명×52주 데이터 미달), FileSystem API (권한 복잡)

### ADR-002: Frappe Gantt vs 커스텀 Grid
- **결정**: 커스텀 CSS Grid (셀 페인트 드래그 지원)
- **이유**: Frappe Gantt는 바(bar) 드래그만 지원, 셀 단위 toggle 불가

### ADR-003: Alpine.js vs 다른 프레임워크
- **결정**: Alpine.js (가볍고 CDN-first, 빌드 불필요)
- **대안**: React/Vue (오버킬, npm 필요)

## 일반적인 작업

### 새 멤버 추가
1. 헤더 "+ 프로젝트" → 해당 프로젝트 클릭 → "구성원 추가"
2. 기존 멤버 선택 또는 새 멤버 생성
3. 멤버 행이 프로젝트 아래 나타남

### 배정 설정
1. 멤버 행에서 원하는 주차 범위 드래그
2. 셀이 채워짐 (프로젝트 색상)
3. 같은 범위 재드래그 → 지워짐 (토글)

### 이벤트 기록 (전배/이동/평가)
1. 멤버 클릭 → 우측 패널 + "+ 이벤트 기록" 버튼
2. 타입 선택 + 날짜 + 메모 + 점수 (평가일 때)
3. "기록" 클릭 → 타임라인에 반영

### 데이터 백업
1. 헤더 "내보내기" → JSON 파일 다운로드
2. 안전한 위치에 저장

### 데이터 복구
1. 헤더 "가져오기" → 백업 JSON 선택
2. "계속하시겠습니까?" 확인 → 데이터 초기화 + 복원

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| "Dexie is not defined" | Day.js 또는 Dexie 스크립트 로드 실패 | DevTools Network 탭 확인, CDN 링크 유효성 검사 |
| 드래그가 작동하지 않음 | 마우스 이벤트 리스너 미등록 | 콘솔: `app.drag` 객체 확인 |
| 데이터가 저장되지 않음 | IndexedDB 쓰기 권한 거부 또는 할당량 초과 | DevTools > Application > Storage 확인, 캐시 삭제 후 재시작 |
| 버튼이 반응하지 않음 | Alpine 초기화 실패 | 콘솔: `Alpine` 객체 존재 확인, x-data/x-init 확인 |

## 개발 팁

### Console에서 상태 확인
```javascript
console.log(app); // Alpine 앱 인스턴스 확인
db.members.toArray().then(console.log); // 모든 구성원 출력
db.assignments.where('memberId').equals(1).toArray().then(console.log); // 구성원 1의 배정
```

### IndexedDB 수동 삭제
DevTools > Application > Storage > IndexedDB > WeeklyStaffDB > Delete Database

### CSS 수정
styles.css 편집 후 브라우저 새로고침 (Ctrl+Shift+R 강제 새로고침)

## 라이선스 & 저작권

개인 프로젝트. 자유로운 수정/배포 가능.
