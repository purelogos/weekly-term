# CONTEXT.md — 주간 인력 관리 시스템 도메인 용어 사전

## 목적
이 파일은 인력 관리 타임라인 시스템의 **domain-driven design (DDD) 도메인 용어**를 정의합니다.
코드, 스킬 프롬프트, 변수명은 이 용어들을 따릅니다.

---

## 핵심 엔티티

### Member (구성원)
조직에 속한 개인.
- 필드: `id`, `name`, `department` (부서), `grade` (직급), `status`, `skills[]`
- Status 값: `active` (재직) | `transferred` (전배 완료) | `on-leave` (휴직)
- 예상 규모: ~60명
- 중요: 구성원은 프로젝트와 무관하게 존재. 프로젝트에 배정되지 않을 수도 있음.

### Project (프로젝트)
조직이 진행하는 작업 단위.
- 필드: `id`, `name`, `year`, `color` (UI용 색상 16진 코드), `sortOrder` (정렬 순서)
- year: 프로젝트가 속한 연도 (예: 2026)
- color: 타임라인에서 시각적 구분용 색상 (예: #3b82f6)
- 같은 이름의 프로젝트도 연도별로 구분됨

### Assignment (배정)
구성원이 프로젝트에 속한 기간 기록.
- 필드: `id`, `memberId`, `projectId`, `weeks: string[]`
- weeks: ISO 8601 주차 형식 배열 (예: ["2026-W01", "2026-W02", "2026-W03"])
- 의미: 구성원이 해당 프로젝트에 속한 주차들의 집합
- 주차는 연속일 필요 없음 (임의의 조합 가능)
- 중요: 한 구성원이 같은 프로젝트에 여러 기간 동안 배정될 수 있음 (weeks 배열로 관리)

### Event (이력 이벤트)
구성원의 생명주기 변화 기록. **승인 워크플로우 없음** — 단순 기록만.
- 필드: `id`, `memberId`, `type`, `date`, `fromProject`, `toProject`, `note`, `score`
- type 값:
  - `전배` (jeonbae): 부서 간 영구 이동
  - `이동` (idong): 프로젝트 간 일시적 이동
  - `평가` (pyeongga): 성과 평가 (score 1-5)

---

## 주요 관계

- A **Member** holds many **Assignments** across projects and years
- A **Project** holds many **Assignments** (its roster in a given year)
- An **Assignment** belongs to exactly one **Member** and one **Project**
- An **Event** belongs to one **Member** and records a point-in-time change

---

## 주차 (Week) 포맷

모든 주차 참조는 ISO 8601 표준 주차 표기법: `YYYY-WXX`
- 예: `2026-W01`, `2026-W26`, `2026-W52`
- 월요일 시작 (ISO 표준)
- Day.js `isoWeek` 플러그인으로 처리
- 연도별로 1주차부터 52/53주차까지 존재 (윤년 등에 따라 53주일 수 있음)

---

## UI 용어 매핑 (Korean ↔ English)

| UI 레이블 (한글) | 코드 용어 (EN) | 설명 |
|---|---|---|
| 구성원 | member | |
| 프로젝트 | project | |
| 배정 | assignment | |
| 부서 | department | |
| 직급 | grade | 사원/주임/대리/과장/차장/부장 등 |
| 상태 | status | active/transferred/on-leave |
| 주차 | weekKey | YYYY-WXX 형식 |
| 전배 | transfer | Event type: 영구적 조직 이동 |
| 이동 | move | Event type: 임시 프로젝트 이동 |
| 평가 | evaluation | Event type: 성과 평가 |
| 드래그 | drag | 셀 페인트 방식의 기간 설정 |
| 타임라인 | timeline | 52주 수평 격자 뷰 |

---

## 시스템 설계 원칙

### 1. 타임라인 그리드 모델
- **행**: 프로젝트 및 그 아래 구성원들
- **열**: 연도의 52주
- **셀**: 구성원-프로젝트-주차의 교점 (채워지거나 비어있음)

### 2. 드래그 방식 (Paint Drag)
- 빈 셀 드래그 → **채우기 (fill)**
- 채운 셀 드래그 → **지우기 (erase)**
- 엑셀 스타일 페인트 브러시와 동일

### 3. 프로젝트 vs 구성원 기간
- **프로젝트 행**: 프로젝트에 누구든 배정된 주차 표시 (집계)
- **구성원 행**: 그 구성원이 이 프로젝트에 배정된 주차만 표시 (개별)
- 프로젝트 기간과 구성원 기간은 독립적 (구성원이 프로젝트보다 일찍 들어가거나 늦게 나갈 수 있음)

### 4. 다중 연도 지원
- DB에 프로젝트는 year별로 존재
- UI 헤더 "이전/다음 해" 버튼으로 연도 전환
- 같은 이름의 프로젝트도 연도별로 구분됨

---

## Dexie.js 스키마

```javascript
db.version(1).stores({
  members:     '++id, name, department, grade, status',
  projects:    '++id, name, year, sortOrder',
  assignments: '++id, [memberId+projectId], memberId, projectId',
  events:      '++id, memberId, type, date'
});
```

### 인덱스 설명
- `members`: 이름, 부서, 직급, 상태로 빠른 검색
- `projects`: 연도별 필터링
- `assignments`: 복합 인덱스 `[memberId+projectId]`로 중복 방지, 각각 단일 인덱스로 역방향 조인 가능
- `events`: 구성원별 이벤트 조회 및 날짜 정렬

---

## 데이터 흐름

### 타임라인 로드
1. DB에서 현재 연도의 프로젝트 로드
2. 전체 배정(assignment) 로드
3. 프로젝트별로 배정 그룹화 + 구성원 정보 조인
4. 구성원별 주차 Set 구성
5. UI 렌더링

### 드래그 후 저장
1. 사용자 드래그 → 범위(weekIdx) 결정
2. weekIdx → weekKey 변환
3. 구성원의 weeks 배열 업데이트 (fill/erase)
4. DB assignment 행 갱신

### 구성원 상세 조회
1. 구성원 클릭 → selectedMember 설정
2. 해당 구성원의 모든 배정 로드 (연도 무관)
3. 해당 구성원의 모든 이벤트 로드
4. 우측 패널 렌더링

---

## 플래그된 모호함 (Flagged Ambiguities)

### Q: 구성원이 프로젝트에서 제거되면?
**A**: 배정(assignment)을 삭제. 이벤트는 유지 (이력 기록).

### Q: 프로젝트 기간과 구성원 기간이 겹치지 않으면?
**A**: 허용. 시스템은 강제하지 않음. 실제 효율성은 조직 책임.

### Q: 같은 주에 여러 프로젝트에 배정되면?
**A**: 허용. "투입률" 개념 없음. 배정은 ON/OFF만 (타임라인에서 셀로 표현).

### Q: 과거 연도 데이터 어디에?
**A**: DB에 계속 저장. year 필터로 조회 가능. 삭제하지 않는 한 유지.

---

## 피드백 (V2 - 2026-06-30)

### Bug #1: 구성원 추가 불가 (멤버 추가 UI 부재)
**현상**: 프로젝트를 확장해도 구성원을 추가할 방법이 없음.
**원인**: 프로젝트 행에 "구성원 추가" 버튼 없음.
**수정**: 프로젝트 행의 name-cell 우측에 "+ 구성원" 버튼 추가 → showAddMemberModal 트리거, addMemberTargetProjectId 설정

### Bug #2: 프로젝트 드래그 표시 미저장
**현상**: 프로젝트 행에서 드래그해서 주차 채우는데 새로고침하면 사라짐.
**원인**: applyDragRange에서 project mode일 때 DB 저장 로직 생략됨 (주석: "simplified").
**수정**: 프로젝트 행은 **멤버 배정의 집계**이므로, 실제로는 멤버를 먼저 추가한 후 멤버 행에서 드래그하는 워크플로우가 의도된 설계. 단, 사용자 편의를 위해 프로젝트 행 드래그 시 해당 프로젝트의 *모든* 멤버에게 같은 주차를 추가하는 옵션 검토 필요 (현재는 구현 생략, 대신 UI에 "먼저 구성원을 추가한 후 개별 드래그하세요" 안내 추가 권장).
- **우선 수정**: addMemberToProject() 함수 호출 후 loadTimeline() 확인 + 멤버 행 렌더링 확인

### Feature #3: 헤더 열 구조 확장
**요청**: 
1. 기존 52주 열 앞에 2칸 추가: **시작날짜** (월~금), **종료날짜** (월~금)
2. 맨 왼쪽에 1칸: 현재 날짜 기준 **프로젝트 수** (구성원이 소속된 활성 프로젝트 개수)
3. 프로젝트별 색상 배지로 표시

**구현**:
- State에 새로운 columns 정보 추가 (startDate, endDate, activeProjectCount 등)
- loadTimeline() 개선: 멤버별로 현재 날짜(today)를 기준으로 배정된 프로젝트 수 계산
- Header row 수정: [이름열] | [프로젝트수] | [시작] | [종료] | W01...W52
- 프로젝트수 셀은 색상 배지로 표시 (예: 프로젝트 A, B, C에 배정되면 3개 배지 표시)

**날짜 표기 규칙**:
- startDate: 해당 주차의 월요일 (ISO 8601 주차 기준)
- endDate: 해당 주차의 금요일
- 포맷: "YYYY-MM-DD" (각 날짜 별도 셀)
- 공백 허용: 멤버가 배정되지 않은 경우 "-" 표시
