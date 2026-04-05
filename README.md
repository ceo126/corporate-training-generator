# 기업교육 발표자료 생성기 v3.0

> 교육자료(PDF, DOCX, TXT, MD, PPTX, HWP)를 넣으면 **PPT + 동적 웹 발표자료**를 자동 생성하는 도구

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **파일 파싱** | PDF, DOCX, TXT, MD, PPTX, HWP 파일에서 텍스트 자동 추출 |
| **PPT 생성** | PptxGenJS 기반 23종 슬라이드 타입 + 10종 테마로 PPTX 생성 |
| **웹 발표자료** | 인포그래픽 스타일의 인터랙티브 HTML 프레젠테이션 생성 |
| **텍스트 직접 입력** | 텍스트를 붙여넣으면 자동으로 슬라이드 구조 생성 |
| **슬라이드 에디터** | 드래그 앤 드롭, 실시간 미리보기, 다중 선택 지원 |
| **발표자 모드** | 발표 노트, 타이머, 레이저 포인터 기능 |
| **템플릿 갤러리** | 19종 슬라이드 템플릿 미리보기 및 즉시 적용 |
| **일괄 생성** | 최대 20개 파일을 한 번에 변환 |
| **파일 업로드** | 드래그 앤 드롭 또는 클릭으로 파일 업로드 (최대 100MB) |
| **즐겨찾기** | 자주 쓰는 결과물 즐겨찾기 등록 |
| **통합 검색** | 소스 파일 + 결과물을 한 번에 검색 |
| **Rate Limiting** | IP당 분당 60회 요청 제한 |

## 스크린샷

> 추후 추가 예정

## 빠른 시작

```bash
npm install
npm start
# http://localhost:8220
```

**요구 사항**: Node.js >= 18.0.0

## 페이지 구성

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 메인 대시보드 | `/` | 파일 목록, 업로드, 결과물 관리, 빠른 생성 |
| 슬라이드 에디터 | `/editor` | 슬라이드 편집, 미리보기, 테마 변경, 내보내기 |
| 템플릿 갤러리 | `/templates` | 19종 슬라이드 템플릿 탐색 및 적용 |
| 발표자 모드 | `/presenter` | 발표 노트, 타이머, 레이저 포인터 |
| API 문서 | `/api-docs` | 인터랙티브 API 문서 |
| 404 페이지 | 없는 경로 | 커스텀 404 페이지 |

## API 엔드포인트

### 시스템

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/health` | 서버 상태 (업타임, 메모리, 파일 수) |
| `GET` | `/api/version` | 버전 정보 + 변경 로그 |
| `GET` | `/api/recent` | 최근 활동 목록 (최대 20건) |
| `GET` | `/api/docs` | API 문서 JSON |
| `GET` | `/api/stats` | 상세 통계 |

### 파일 관리

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/files` | 소스 파일 목록 조회 |
| `POST` | `/api/upload` | 파일 업로드 (multipart/form-data) |
| `DELETE` | `/api/files/:name` | input 폴더 내 파일 삭제 |
| `GET` | `/api/files/:sourceDir/:filePath/preview` | 파일 내용 미리보기 (base64 인코딩) |
| `POST` | `/api/parse` | 파일 텍스트 추출 |

### 소스 디렉토리

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/sources` | 등록된 소스 디렉토리 목록 |
| `POST` | `/api/source` | 소스 디렉토리 추가 |
| `DELETE` | `/api/source` | 소스 디렉토리 제거 |

### 발표자료 생성

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/generate/pptx` | PPTX 발표자료 생성 |
| `POST` | `/api/generate/web` | HTML 직접 저장 |
| `POST` | `/api/generate/web-from-data` | 슬라이드 데이터로 웹 발표자료 생성 |
| `POST` | `/api/generate/from-text` | 텍스트 → 슬라이드 자동 생성 |
| `POST` | `/api/generate/bulk` | 일괄 생성 (최대 20개) |
| `POST` | `/api/preview` | 웹 미리보기 HTML 생성 |

### 결과물 관리

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/outputs` | 결과물 목록 (PPTX + Web) |
| `GET` | `/api/outputs/:type/:name/info` | 결과물 상세 정보 |
| `DELETE` | `/api/outputs/:type/:name` | 결과물 삭제 |
| `POST` | `/api/outputs/:type/:name/rename` | 결과물 이름 변경 |
| `POST` | `/api/outputs/:type/:name/duplicate` | 결과물 복제 |
| `POST` | `/api/export-all` | 모든 결과물 다운로드 링크 |

### 사용자 설정

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/settings` | 사용자 설정 조회 |
| `POST` | `/api/settings` | 사용자 설정 저장 |
| `GET` | `/api/favorites` | 즐겨찾기 목록 |
| `POST` | `/api/favorite/:type/:name` | 즐겨찾기 토글 |
| `GET` | `/api/search` | 파일 + 결과물 통합 검색 |
| `GET` | `/api/templates` | 슬라이드 템플릿 목록 |
| `GET` | `/api/themes` | 테마 목록 |

## 슬라이드 타입 (19종)

| 타입 | 이름 | 설명 |
|------|------|------|
| `bullets` | 글머리 기호 | 핵심 포인트를 목록으로 정리 |
| `cards` | 카드 레이아웃 | 정보를 카드 형태로 나열 |
| `steps` | 단계별 프로세스 | 순차적인 단계를 시각적으로 표현 |
| `stats` | 통계/숫자 강조 | 주요 수치를 크게 표시 |
| `two-column` | 2단 비교 | 두 가지를 좌우로 비교 |
| `timeline` | 타임라인 | 시간순 이벤트 표시 |
| `checklist` | 체크리스트 | 완료/미완료 항목 표시 |
| `quote` | 인용구 | 명언이나 핵심 메시지 강조 |
| `progress` | 프로그레스 바 | 진행률을 바 형태로 표시 |
| `pyramid` | 피라미드 | 계층 구조를 피라미드로 표현 |
| `icon-grid` | 아이콘 그리드 | 아이콘과 함께 항목 나열 |
| `donut` | 도넛 차트 | 비율을 도넛 그래프로 표시 |
| `matrix` | 2x2 매트릭스 | 4개 영역으로 분류 |
| `cycle` | 순환 다이어그램 | 반복 프로세스를 원형으로 표현 |
| `process-arrow` | 프로세스 화살표 | 단계별 쉐브론 형태 |
| `bar-chart` | 막대 차트 | 수치를 막대 그래프로 비교 |
| `highlight` | 강조 슬라이드 | 핵심 메시지를 크게 강조 |
| `swot` | SWOT 분석 | 강점/약점/기회/위협 분석 |
| `roadmap` | 로드맵 | 단계별 계획을 타임라인으로 표시 |

## 테마 (10종)

| ID | 이름 | 설명 | 주요 색상 |
|----|------|------|-----------|
| `modern` | 모던 블루 | 기본 테마, 깔끔한 블루 계열 | `#2563EB` `#7C3AED` |
| `light` | 라이트 | 밝고 깨끗한 화이트 배경 | `#2563EB` `#FFFFFF` |
| `dark` | 다크 모드 | 어두운 배경, 보라색 포인트 | `#8B5CF6` `#0F172A` |
| `corporate` | 기업 스타일 | 신뢰감 있는 틸 계열 | `#0F766E` `#0284C7` |
| `warm` | 따뜻한 오렌지 | 따뜻하고 에너지 넘치는 톤 | `#EA580C` `#DC2626` |
| `nature` | 자연 그린 | 자연 친화적 초록 계열 | `#16A34A` `#0D9488` |
| `tech` | 테크 사이버 | 미래지향적 사이버 느낌 | `#06B6D4` `#10B981` |
| `elegant` | 엘레강스 | 고급스러운 골드+다크 조합 | `#D4A017` `#1A1A1A` |
| `creative` | 크리에이티브 | 창의적인 핑크-퍼플 계열 | `#D946EF` `#A855F7` |
| `minimal` | 미니멀 | 흑백 기반의 극도로 심플한 디자인 | `#262626` `#FFFFFF` |

## 기술 스택

- **런타임**: Node.js (>= 18.0.0)
- **서버**: Express 4
- **PPT 생성**: PptxGenJS
- **파일 파싱**: pdf-parse (PDF), mammoth (DOCX)
- **파일 업로드**: multer
- **프론트엔드**: Vanilla JS, CSS (프레임워크 없음)
- **보안**: Rate Limiting, 보안 헤더 (XSS, CSRF, Clickjacking 방지), Path Traversal 방지
- **성능**: 파일 스캔 캐시 (10초 TTL), ETag, Cache-Control

## 프로젝트 구조

```
기업교육-발표자료-생성기/
├── server.js              # Express 메인 서버 (port 8220)
├── package.json
├── start.bat              # Windows 실행 배치 파일
├── lib/
│   ├── fileParser.js      # 파일 파싱 (PDF, DOCX, TXT, MD, PPTX, HWP)
│   ├── pptGenerator.js    # PPTX 생성기 (10 테마, 다양한 슬라이드 타입)
│   └── webGenerator.js    # 웹 발표자료 HTML 생성기
├── public/
│   ├── index.html         # 메인 대시보드
│   ├── editor.html        # 슬라이드 에디터
│   ├── templates.html     # 템플릿 갤러리
│   ├── presenter.html     # 발표자 모드
│   ├── api-docs.html      # 인터랙티브 API 문서
│   ├── 404.html           # 커스텀 404 페이지
│   ├── css/               # 스타일시트
│   ├── js/                # 클라이언트 스크립트
│   └── icons/             # 아이콘 리소스
├── input/                 # 교육자료 입력 폴더
│   └── .gitkeep
├── output/
│   ├── pptx/              # 생성된 PPTX 파일
│   └── web/               # 생성된 웹 발표자료
└── tests/                 # 테스트 파일
```

## 키보드 단축키

### 슬라이드 에디터 (`/editor`)

| 단축키 | 기능 |
|--------|------|
| `Ctrl + S` | 저장 |
| `Ctrl + D` | 슬라이드 복제 |
| `Ctrl + Z` | 실행 취소 |
| `Ctrl + Y` | 다시 실행 |
| `Ctrl + N` | 새 슬라이드 추가 |
| `Ctrl + E` | JSON 내보내기 |
| `Ctrl + F` | 찾기 |
| `Ctrl + H` | 바꾸기 |
| `Ctrl + Shift + Up` | 슬라이드 위로 이동 |
| `Ctrl + Shift + Down` | 슬라이드 아래로 이동 |
| `Ctrl + 클릭` | 다중 선택 |
| `Up / Down` | 이전/다음 슬라이드 |
| `Delete` | 슬라이드 삭제 |
| `F5` | 전체화면 미리보기 |
| `F2` | 포커스 모드 |
| `Esc` | 전체화면/모달 종료 |
| `?` | 단축키 도움말 |

## 개발

```bash
npm run dev    # watch 모드 (파일 변경 시 자동 재시작)
npm test       # 테스트 실행
```

## 라이선스

MIT
