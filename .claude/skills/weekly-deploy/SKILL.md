---
name: weekly-deploy
description: Package and email weekly personnel management system for testing
metadata:
  type: skill
---

# Weekly Deploy Skill

자동 배포: 주간 인력 관리 시스템 패키징 및 메일 전송

## Usage

```bash
/weekly-deploy [--recipient EMAIL] [--include-data] [--test-mode]
```

Examples:
```bash
/weekly-deploy
/weekly-deploy --recipient purerobus@gmail.com,yonghwan.hong@sk.com
/weekly-deploy --recipient testuser@example.com --format tar.gz
/weekly-deploy --include-data --test-mode
/weekly-deploy --format zip --recipient user@example.com
```

## Input

- **--recipient** (optional): 메일 수신자 (기본값: .run_mail에서 읽기, 쉼표로 구분하여 다중 수신자 지원)
  - 예: `--recipient user1@example.com,user2@example.com`
- **--include-data** (optional): seed.json 포함 여부 (기본값: true)
- **--test-mode** (optional): 메일 미전송, 로컬 파일만 생성 (기본값: false)
- **--format** (optional): 압축 형식 (기본값: tar.gz)
  - 선택지: `tar.gz`, `zip` (zip은 메일 서버에서 차단될 수 있음)

## Process

1. 소스 파일 확인 (index.html, app.js, styles.css 등)
2. Standalone 버전 생성 (index-standalone.html)
3. TEST_GUIDE.md 생성 (테스트 체크리스트)
4. ZIP 파일 생성 (결과물.zip)
5. .run_mail에서 메일 정보 읽기
6. mutt으로 메일 전송 (zip 첨부 불가능한 경우 본문에 경로 포함)
7. 배포 로그 기록

## Output

### 성공 시:
```
✓ 배포 완료
- 파일: /home/purelogos/Works/upload/결과물.tar.gz (25KB)
- 형식: tar.gz (메일 서버 호환)
- 메일 수신자: 
  ✓ purerobus@gmail.com
  ✓ yonghwan.hong@sk.com
- 상태: 2/2 성공
- 배포 로그: /tmp/weekly-deploy-2026-06-30.log
```

### 실패 시:
```
✗ 배포 실패
- 오류: [오류 메시지]
- 로그: /tmp/weekly-deploy-2026-06-30.log
```

## Files

포함되는 파일 (ZIP 구성):

```
결과물.zip/
├── 주간인력관리/
│   ├── index-standalone.html    # 단일 파일 버전 (권장)
│   ├── index.html               # 모듈화 버전
│   ├── app.js
│   ├── styles.css
│   ├── CONTEXT.md
│   ├── CLAUDE.md
│   ├── README.md
│   ├── TEST_GUIDE.md            # 테스트 가이드
│   └── data/
│       └── seed.json            # 샘플 데이터
```

## Domain Notes

- **소스 디렉토리**: /home/purelogos/Works/claude_remote/weekly/
- **배포 디렉토리**: /home/purelogos/Works/upload/
- **메일 설정 파일**: /home/purelogos/Works/.run_mail
- **메일 도구**: mutt (msmtp 백엔드)
- **배포 로그**: /tmp/weekly-deploy-YYYY-MM-DD.log

## 실행 흐름

```
1. 소스 파일 복사
   └─ /tmp/주간인력관리/ 에 복사

2. Standalone 병합
   ├─ index.html (헤더/본문)
   ├─ app.js (로직)
   └─ styles.css (스타일)
   → index-standalone.html 생성

3. 테스트 가이드 생성
   └─ TEST_GUIDE.md 작성

4. ZIP 압축
   └─ /home/purelogos/Works/upload/결과물.zip 생성

5. 메일 전송
   ├─ .run_mail 읽기
   ├─ 수신자 설정
   └─ mutt 실행

6. 로그 기록
   └─ 배포 결과 기록
```

## 주의사항

- **메일 서버 호환성**:
  - ZIP 파일: 많은 서버에서 차단 ⚠️
  - tar.gz 파일: 안전 (권장) ✓
  - 기본값: tar.gz (ZIP은 `--format zip`으로 지정)

- mutt 미설치: 메일 전송 실패 (파일은 생성됨)
- 기존 파일 덮어씀: 매번 새 버전으로 교체
- 권한: 배포 디렉토리 쓰기 권한 필요
- 다중 수신자: 쉼표로 구분 (스페이스 없음)

## 테스트 (Test Mode)

```bash
/weekly-deploy --test-mode
```

- ZIP 생성만 수행
- 메일 전송 스킵
- 로컬 파일 확인용

## 배포 로그 예시

```
=== Weekly Deploy Log ===
Date: 2026-06-30 11:17:45
Status: SUCCESS

Files Packaged:
- index-standalone.html: 36KB
- index.html: 11KB
- app.js: 17KB
- styles.css: 7.9KB
- CONTEXT.md, CLAUDE.md, README.md
- TEST_GUIDE.md
- data/seed.json

Archive:
- Format: tar.gz (메일 서버 호환)
- File: /home/purelogos/Works/upload/결과물.tar.gz
- Size: 25KB

Email Delivery:
- Recipients: 2/2 successful
  ✓ purerobus@gmail.com
  ✓ yonghwan.hong@sk.com
- Subject: [주간 인력 관리] 테스트 파일 - 결과물.tar.gz (첨부)
- Attachment: 결과물.tar.gz (25KB)

LogFile: /tmp/weekly-deploy-2026-06-30.log
```

---

## 관련 Skills

- `/weekly-snapshot`: 특정 주차 HTML 보고서
- `/member-search`: 구성원 배정 이력 조회
- `/evaluation-summary`: 평가 집계

