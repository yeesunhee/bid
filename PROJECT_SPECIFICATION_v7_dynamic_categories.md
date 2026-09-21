# 구매 입찰 지원 시스템 - 프롬프트 보관소 (POSCO STEELEON)
## 프로젝트 명세서 및 바이브코딩 가이드라인 (PROJECT_SPECIFICATION.md)

본 문서는 **포스코스틸리온 구매 입찰 지원 시스템**을 위한 AI 프롬프트 템플릿 관리 웹 애플리케이션의 개발 사양서입니다. 타 바이브 코딩 툴(Cursor, Windsurf, Bolt, VSCode AI 등)에서도 동일한 구조와 스펙으로 프로젝트를 정확하게 복원 및 확장할 수 있도록 컴포넌트 스펙과 재생성 프롬프트를 보완하여 제작되었습니다.

> **v6 개정 사항**: 기존에 소스 코드에 고정되어 있던 **단계 1 / 단계 2 카테고리 구조를 관리자 사용자가 직접 생성·수정·삭제·정렬할 수 있는 동적 카테고리 구조**로 변경합니다. 카테고리는 SQLite DB에 저장되며, 프롬프트는 고정된 AI 툴 문자열이 아니라 단계 2 카테고리 ID를 참조합니다. 기존의 2단계 트리 UI와 프롬프트 상세보기 방식은 그대로 유지합니다.

> **v7 개정 사항**: 앱 **초기 화면(기본 진입 화면)**에 **입찰 경제지표 대시보드**를 추가합니다. 대시보드 데이터 공급자는 한국은행 ECOS, 미국 EIA, IMF PCPS **정확히 3개만** 사용하며, 상세 수집·정규화·표시·검증 규칙은 `bid-economic-dashboard-SKILL.md`를 단일 기준으로 따릅니다. 기존 프롬프트 관리(2단 레이아웃·동적 카테고리) 기능은 유지하고, 헤더 네비게이션으로 대시보드 ↔ 프롬프트 관리를 전환합니다.

> **v8 개정 사항**: 기본 시드에 단계 1 **계약 품의서**와 그 하위 단계 2 4개(계약 품의서, 예정가격 조사(컨설팅 용역), 예정가격(T/P) 산출 및 원가 검토, 입찰 진행 품의)를 추가합니다. `샘플 데이터 입력용.md`의 에이전트 프롬프트 4건을 각 단계 2에 1건씩 시드로 넣으며, 구현은 `server/seedPrompts.ts`를 따릅니다. DB 리셋 시 이 카테고리·프롬프트도 함께 복원합니다.

> **v9 개정 사항**: 단계 1 **바이브코딩툴**과 그 하위 단계 2(VSCODE, 제미나이CLI, Cursor AI)를 시드에서 제거합니다. 단계 1 **대형언어모델**의 표시 이름을 **기타**로 바꾸고, 하위 단계 2는 **도움말**(기존 GPT) 1개만 남깁니다. 제미나이·클로드는 시드에서 제외합니다.

> **v10 개정 사항**: 프롬프트 관리에서 단계 1 **기타** → 단계 2 **도움말**을 열면, 기존 PromptBox(에이전트 이름/설명/프롬프트 3필드) 대신 **도움말 게시판**을 표시합니다. 게시물 목록 → 상세 조회, 게시물 추가, 게시물 삭제, 첨부 파일 업로드·다운로드를 지원합니다. 글쓰기·삭제는 관리자 인증이 필요합니다.

> **v11 개정 사항**: (1) 도움말 게시판 첨부파일의 **한글 파일명이 깨지는 현상**을 고칩니다. Multer가 `originalname`을 Latin-1로 해석하는 값을 UTF-8로 복원해 DB·화면에 저장하고, 다운로드 `Content-Disposition`은 RFC 5987(`filename*=UTF-8''`)을 사용합니다. (2) 데이터 저장소를 로컬 SQLite 파일에서 **PostgreSQL**로 전환합니다. 접속 문자열은 프로세스 환경변수 **`DATABASE_URL`만** 사용하며, **`.env` 파일에 `DATABASE_URL`을 두지 않습니다**.

> **v12 개정 사항**: 초기 시드 메뉴 표시 이름을 변경합니다. 단계 1 **기타** → **게시판**, 단계 2 **도움말** → **참고 문서 모음**. `viewType === 'board'`로 게시판 여부를 판단하는 규칙은 유지하며, ID(`l1-etc`, `l2-help`)는 바꾸지 않습니다.

> **v13 개정 사항**: **참고 문서 모음**에 **최초 시드 글 1건**을 넣습니다. `help_posts`가 비어 있으면 서버 기동 시 `hp-intro`(이용 안내)를 삽입합니다. 이미 글이 있으면 넣지 않습니다. 관리자는 기존처럼 추가 글을 등록할 수 있고, 글이 없을 때는 Empty State에서 **첫 글 등록**으로 작성 화면을 엽니다.

---

## 1. 프로젝트 개요 (Overview)

- **앱 이름**: 구매 입찰 지원 시스템 - 프롬프트 관리자
- **주요 목적**:
  1. **(신규, 초기 화면)** 입찰·견적 산정에 필요한 거시경제·원자재 지표를 한 화면에서 추적하고, 원가 상승 압력과 투찰 리스크를 판단할 수 있는 **입찰 경제지표 대시보드** 제공
  2. 구매 및 입찰 업무 담당자가 품의·원가 검토 등 업무 프롬프트 및 에이전트를 손쉽게 조회, 개별 항목 복사, 생성, 관리(CRUD)할 수 있는 웹 플랫폼 구축
  3. **(v10)** 프롬프트 관리의 **게시판 > 참고 문서 모음**에서 사용 안내·참고 자료를 **게시판**으로 공유하고, 첨부 파일을 올리거나 받을 수 있게 함
- **데이터 저장 방식**: **PostgreSQL**을 사용합니다. 서버는 프로세스 환경변수 **`DATABASE_URL`** 로만 접속하며, 이 값은 **`.env` 파일에 두지 않습니다**(OS·서비스·컨테이너에서 주입). 프론트엔드(React)는 함께 구동되는 경량 백엔드(Node.js/Express API 서버)를 통해 DB에 접근하며, 브라우저 저장소(localStorage)에는 프롬프트/카테고리 데이터를 두지 않습니다. 도움말 첨부파일은 서버 로컬 디스크(`server/data/help-uploads/`)에 저장합니다. 프론트+API는 기존처럼 `npm run dev`로 함께 기동합니다.
- **화면 구성 (v7)**:
  - **기본 진입 화면**: 입찰 경제지표 대시보드 (`EconomicDashboard`)
  - **프롬프트 관리 화면**: 기존과 동일하게 **좌측 사이드바 + 우측 상세보기의 2단(2-Column) 구성**. 사이드바와 상세보기 사이에 별도의 "프롬프트 목록" 중간 패널은 두지 않습니다. (하단 5장 참고)
  - **(v10)** 단계 2의 `viewType`이 `'board'`인 항목(시드: **참고 문서 모음**)을 선택하면 우측은 `PromptBox`가 아니라 **도움말 게시판(`HelpBoard`)** 입니다. 일반 단계 2는 기존 PromptBox를 유지합니다.
  - 상단 헤더에서 **경제지표 / 프롬프트 관리**를 전환합니다.

### 대시보드 핵심 질문 (제품 목표)

대시보드의 목표는 지표를 많이 나열하는 것이 아니라, 다음 질문에 답하는 것입니다.

> 현재 시장환경을 기준으로 이 입찰의 원가는 얼마나 변하고 있으며, 그 변화의 가장 큰 원인은 무엇인가?

상세 지표 카탈로그·계산·장애 처리·Acceptance Criteria는 **`bid-economic-dashboard-SKILL.md`**를 따릅니다. 본 명세는 그 Skill을 본 프로젝트(React/Vite + Express + PostgreSQL)에 어떻게 배치할지에 대한 **통합 개발 사양**입니다.

---

## 2. 기술 스택 (Tech Stack)

| 구분 | 기술 / 라이브러리 |
| :--- | :-------------------- |
| **Framework** | React 18, Vite |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS (Dark Mode 컨셉 `#080E18` / `#0f172a` 배경) |
| **Icons** | Lucide React (`Bot`, `FileText`, `Terminal`, `Copy`, `Check`, `ShieldAlert`, `LayoutDashboard`, `TrendingUp`, `Paperclip`, `Upload`, `Trash2`, `Plus` 등) |
| **Charts (대시보드)** | 기존 프로젝트에 맞는 경량 차트 라이브러리 (예: Recharts). 새 UI 프레임워크를 도입하지 않음 |
| **State** | React Context + Custom Hook (`usePromptStore`, `useEconomicDashboard` 등 — 내부적으로 API 클라이언트 호출) |
| **Backend** | Node.js + Express 기반 로컬 API 서버 (`/api/prompts`, `/api/auth`, `/api/categories/*`, `/api/economic/*`, `/api/help-posts/*` 등) |
| **File upload (v10/v11)** | 도움말 게시판 첨부파일은 서버 로컬 디스크(`server/data/help-uploads/`)에 저장. 클라우드 스토리지·외부 파일 서버를 사용하지 않음. 업로드는 Express `multipart/form-data`로 처리. **한글 원본 파일명은 UTF-8로 복원·저장** (하단 첨부파일 규칙) |
| **Database** | **PostgreSQL** — `pg`(node-postgres) `Pool`로 연결. 접속 문자열은 환경변수 **`DATABASE_URL`만** 사용. **`.env`에 `DATABASE_URL`을 두지 않음**. 로컬 SQLite 파일·`node:sqlite`·`better-sqlite3`/`sqlite3` 사용 금지 |
| **Persistence** | PostgreSQL (`DATABASE_URL`). 도움말 첨부파일은 `server/data/help-uploads/`. 브라우저 localStorage에 업무 데이터를 두지 않음. `server/data/posco_prompts.db`는 사용하지 않음 |
| **External APIs (대시보드)** | 한국은행 ECOS, U.S. EIA Open Data API v2, IMF PCPS (SDMX) — **이 3개만** 사용 |
| **Secrets** | 서버 환경변수. `DATABASE_URL`은 `.env`가 아니라 프로세스 환경변수. `ECOS_API_KEY`, `EIA_API_KEY` 등은 `.env` 등 서버 측에서만 로드. 클라이언트·Git·로그에 키·접속문자열 노출 금지 |

---

## 3. 2단계 카테고리 아키텍처 (Category Hierarchy)

시스템은 **2단계 위계 구조**를 유지하되, 단계의 이름과 항목을 소스 코드에 고정하지 않습니다. 관리자 사용자가 **단계 1과 단계 2를 직접 생성·수정·삭제·정렬**할 수 있으며, 변경 결과는 즉시 PostgreSQL에 저장되고 좌측 사이드바에 반영됩니다. 개별 프롬프트는 트리의 3번째 단계로 노출하지 않고, 우측 상세보기 상단의 **프롬프트 선택 탭**에서 고릅니다.

> 경제지표 대시보드의 지표 카테고리(`inflation`, `fx`, `interest_rate` 등)는 아래 프롬프트용 단계 1/단계 2와 **별개**입니다. 혼동하지 않습니다.

### 기본 시드 데이터
최초 실행 시 아래 구조를 기본값으로 생성하지만, 이후에는 관리자 화면에서 자유롭게 변경할 수 있습니다. 표시 순서는 **계약 품의서 → 게시판** 입니다.

### **[단계 1] 계약 품의서**
구매·입찰 품의 에이전트. 각 단계 2에는 `샘플 데이터 입력용.md`의 해당 프롬프트 **1건**을 시드로 넣습니다. 단계 2당 프롬프트가 1개이므로 우측 PromptBox에는 전환 탭이 표시되지 않습니다.

1. **계약 품의서**: 입찰결과를 반영해 최종 계약 체결용 계약 품의서 초안을 작성합니다
2. **예정가격 조사(컨설팅 용역)**: 용역 계약 문서를 분석해 예정가격 조사서 비교표를 정리하고 검토가를 산출합니다
3. **예정가격(T/P) 산출 및 원가 검토**: 공사·구매 내역과 업체 견적을 바탕으로 예정가격(T/P)과 원가 검토 보고서를 작성합니다
4. **입찰 진행 품의**: 구매요청 품의서·사양서 등 첨부자료를 분석해 입찰 진행 품의 초안을 작성합니다

### **[단계 1] 게시판**
사용 안내 등 업무 품의 외 항목. 하위 단계 2는 **1개만** 둡니다.

1. **참고 문서 모음**: 사용 안내 및 참고 자료용 **게시판**. 이 단계 2의 `viewType`은 `'board'`이며, 선택 시 우측은 PromptBox가 아니라 도움말 게시판입니다.

> **시드 프롬프트**: `샘플 데이터 입력용.md`의 4개 에이전트 프롬프트를 단계 1 `계약 품의서` 하위 단계 2에 각각 1건씩 삽입합니다 (`server/seedPrompts.ts`). 구 샘플(`견적 비교 요약`, `규격서 핵심 요구사항 추출` 등)은 시드에 넣지 않습니다. 단계 1 `게시판` / 단계 2 `참고 문서 모음`에는 **프롬프트를 넣지 않으며**, 프롬프트 CRUD 대상도 아닙니다. **(v13)** 대신 `help_posts`에 최초 시드 글 1건(`hp-intro`, 제목 `참고 문서 모음 이용 안내`)을 넣습니다. 첨부는 없습니다. 단계 1 `바이브코딩툴`과 제미나이·클로드·VSCODE·제미나이CLI·Cursor AI는 시드에 포함하지 않습니다.

### 동적 단계 관리 규칙
- **단계 1 생성**: 관리자가 단계 1 이름과 표시 순서를 지정하여 새 대분류를 추가할 수 있습니다.
- **단계 1 수정**: 이름 및 표시 순서를 변경할 수 있으며, 하위 단계 2와 프롬프트 연결 관계는 유지됩니다.
- **단계 1 삭제**: 하위 단계 2가 존재하는 단계 1은 즉시 삭제하지 않습니다. 먼저 하위 단계 2를 다른 단계 1로 이동하거나 삭제한 뒤 삭제할 수 있도록 제한합니다.
- **단계 2 생성**: 반드시 하나의 단계 1 아래에 생성하며, 이름·설명·표시 순서를 관리할 수 있습니다.
- **단계 2 수정**: 이름·설명·표시 순서뿐 아니라 소속 단계 1도 변경할 수 있습니다. 소속을 변경해도 연결된 프롬프트는 함께 이동합니다.
- **단계 2 삭제**: 연결된 프롬프트가 존재하는 단계 2는 즉시 삭제하지 않습니다. 프롬프트를 다른 단계 2로 이동하거나 삭제한 뒤 삭제할 수 있도록 제한합니다. `viewType === 'board'`인 단계 2(시드: 참고 문서 모음)는 게시물이 남아 있으면 삭제하지 못하게 제한합니다.
- **정렬**: 단계 1끼리, 동일 단계 1 내부의 단계 2끼리 표시 순서를 변경할 수 있어야 하며, 저장된 순서대로 사이드바에 표시합니다.
- **이름 중복**: 동일한 부모 아래에서는 같은 이름의 단계 2를 허용하지 않습니다. 단계 1 이름도 중복 생성하지 않는 것을 기본 규칙으로 합니다.
- **최소 구조**: 카테고리가 모두 삭제되어도 애플리케이션이 오류 없이 빈 상태(Empty State)를 표시해야 하며, 관리자는 빈 상태에서 새 단계 1부터 다시 생성할 수 있어야 합니다.
- **(v10) 게시판 단계 2**: 시드 `참고 문서 모음`만 `viewType = 'board'`입니다. 관리자 단계 생성 UI에서 `viewType`을 임의로 바꾸지 않는 것을 기본으로 합니다. `board` 단계 2에는 프롬프트를 생성·이동할 수 없습니다.

---

## 4. 핵심 데이터 구조 (`/src/types/index.ts`)

기존처럼 `AIToolType`을 고정 문자열 유니언으로 관리하지 않습니다. **단계 1 / 단계 2는 별도의 카테고리 데이터로 관리**하고, 각 프롬프트는 자신이 속한 **단계 2 카테고리의 ID**를 참조합니다. 실제 구현 시 아래 개념 구조를 기준으로 프론트엔드 타입과 PostgreSQL 테이블을 매핑합니다.

```typescript
export interface CategoryLevel1 {
  id: string;
  name: string;
  sortOrder: number;
}

export interface CategoryLevel2 {
  id: string;
  parentId: string;
  name: string;
  description?: string;
  sortOrder: number;
  viewType: 'prompt' | 'board';  // 기본값 'prompt'. 시드 참고 문서 모음만 'board'
}

export interface PromptTemplate {
  id: string;
  categoryLevel2Id: string;
  title: string;
  subtitle: string;
  agentName: string;         // 1. 에이전트 이름
  agentDescription: string;  // 2. 에이전트 설명
  content: string;           // 3. 프롬프트 복사용 원문 (본문 내용)
  tags: string[];
}
```

- `CategoryLevel1`과 `CategoryLevel2`는 관리자 CRUD 대상입니다.
- `PromptTemplate.categoryLevel2Id`는 반드시 존재하는 단계 2를 참조해야 합니다.
- 단계 이름을 바꾸더라도 ID는 유지하여 기존 프롬프트 연결이 끊어지지 않도록 합니다.
- 화면 표시 순서는 `sortOrder` 기준으로 정렬합니다.
- `viewType === 'board'`인 단계 2에는 프롬프트를 연결하지 않습니다. 우측 화면은 `HelpBoard`입니다. 카테고리 **이름이 아니라** `viewType`으로 게시판 여부를 판단합니다 (`참고 문서 모음`을 개명해도 게시판이 유지됨).

### 4.1 앱 뷰 모드 (v7)

```typescript
export type AppViewMode = 'dashboard' | 'prompts';
```

- 앱 최초 로드 시 기본값은 **`'dashboard'`** 입니다.
- 헤더 네비게이션으로 `'prompts'`로 전환하면 기존 2단 프롬프트 관리 화면을 표시합니다.

### 4.3 도움말 게시판 데이터 모델 (v10)

```typescript
export type HelpBoardView = 'list' | 'detail' | 'create';

export interface HelpPost {
  id: string;
  title: string;
  body: string;
  createdAt: string;           // ISO 8601
  updatedAt: string;
  attachments: HelpAttachment[];
}

export interface HelpAttachment {
  id: string;
  postId: string;
  originalName: string;        // 사용자가 올린 원본 파일명 (UTF-8, 한글 깨짐 없이 저장. 다운로드 시 사용)
  storedName: string;          // 서버 저장 파일명 (충돌 방지용)
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
```

- 게시물 본문(`body`)은 일반 텍스트(또는 간단한 줄바꿈 유지)로 저장합니다. 리치 에디터·HTML 렌더링은 MVP에 넣지 않습니다.
- 파일 바이너리는 PostgreSQL에 넣지 않고 디스크에 저장하며, 메타데이터만 DB에 둡니다. `originalName`은 **UTF-8 한글이 깨지지 않은 원본 파일명**이어야 합니다.
- 게시물 수정(edit)은 v10 MVP 범위에 **포함하지 않습니다**. 목록·추가·삭제·첨부 업로드/다운로드만 제공합니다.

### 4.2 경제지표 공통 데이터 모델 (v7)

모든 외부 API 응답은 서버에서 아래 구조로 정규화한 뒤 프론트에 전달합니다. 필드 의미·검증 규칙은 `bid-economic-dashboard-SKILL.md` §8을 따릅니다.

```typescript
export type EconomicProvider = 'ECOS' | 'EIA' | 'IMF';
export type EconomicFrequency = 'daily' | 'monthly' | 'other';
export type EconomicCategory =
  | 'inflation'
  | 'fx'
  | 'interest_rate'
  | 'energy'
  | 'nonferrous_metal'
  | 'steel_proxy';

export interface NormalizedIndicatorPoint {
  indicatorKey: string;
  provider: EconomicProvider;
  indicatorName: string;
  category: EconomicCategory;
  period: string;              // 기준일 또는 기준월 (YYYY-MM-DD / YYYY-MM)
  frequency: EconomicFrequency;
  value: number;
  unit: string;
  currency?: string;
  sourceTimestamp: string;     // 원본 발표/기준 시점
  fetchedAt: string;           // 서버 수집 시각
  sourceReference: string;     // 통계표/시리즈 식별 정보
  isEstimated: boolean;        // 원본이 아닌 추정값이면 true
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
```

- 원본 관측값과 파생 계산값(변화율, 평균, 스프레드, 원화 환산 효과, Risk Score 등)은 **논리적으로 구분**하여 저장·표시합니다.
- 통계표 코드·시리즈 키는 추측하지 않고, 각 공급자의 공식 메타데이터 확인 후 프로젝트 지표 카탈로그에 기록합니다.

---

## 5. 주요 화면 및 컴포넌트 명세 (Component Specifications)

### 0) 앱 셸 및 네비게이션 (`MainLayout.tsx`) — v7

- 상단 헤더에 다음을 배치합니다.
  - 포스코스틸리온 아이콘 및 시스템 타이틀
  - **뷰 전환 네비게이션**: `경제지표` | `프롬프트 관리` (기본 선택: 경제지표)
  - 프롬프트 관리 뷰일 때만: 실시간 키워드 검색바 (`searchQuery`)
  - **[관리자 로그인]** 버튼 (비밀번호 인증 모달 호출)
- **초기 화면**: `AppViewMode === 'dashboard'` → 우측(또는 전체 메인 영역)에 `EconomicDashboard`를 렌더링합니다.
- **프롬프트 관리 화면**: `AppViewMode === 'prompts'` → 기존 좌측 `CategoryTree.tsx` + 우측 영역 2단 레이아웃을 렌더링합니다.
  - 선택된 단계 2의 `viewType === 'prompt'`(또는 미지정) → `PromptBox.tsx`
  - 선택된 단계 2의 `viewType === 'board'` → `HelpBoard.tsx` (PromptBox를 렌더링하지 않음)
- 대시보드 뷰에서는 프롬프트용 사이드바 트리를 숨기거나 접어, 대시보드가 첫 화면의 주 콘텐츠가 되도록 합니다.

### 1) 좌측 사이드바 (`CategoryTree.tsx`)
- **표시 조건**: 프롬프트 관리 뷰(`prompts`)에서만 필수
- **2단계 트리 메뉴**: DB에 저장된 단계 1 → 단계 2 구조를 동적으로 렌더링하며, 특정 카테고리 이름을 소스 코드에 고정하지 않음
- **단계 2(AI 툴) 노드 클릭 시**:
  - `viewType === 'board'`이면 우측 `HelpBoard.tsx`를 **목록 화면부터** 표시합니다. PromptBox·프롬프트 탭을 쓰지 않습니다.
  - 그 외(`prompt`)는 해당 툴에 속한 프롬프트 중 **첫 번째 항목이 즉시 우측 `PromptBox.tsx`에 표시**됨 (별도의 중간 목록 패널 없이 바로 상세보기로 연결)
- 해당 툴에 프롬프트가 2개 이상이면, 나머지 항목은 사이드바가 아니라 **`PromptBox.tsx` 상단의 프롬프트 선택 탭**에서 전환 (하단 3) 참고)
- 사이드바 접기/펼치기 지원
- 검색바(`searchQuery`)로 검색 시: 매칭되는 프롬프트가 속한 단계 2(AI 툴) 노드를 강조 표시하고, 검색어와 가장 먼저 일치하는 프롬프트를 우측 `PromptBox.tsx`에 자동으로 띄워줌. **도움말 게시판 글 제목/본문은 헤더 검색 대상이 아닙니다.**

### 2) 상단 헤더 (`MainLayout.tsx`)
- 포스코스틸리온 아이콘 및 시스템 타이틀
- **(v7)** `경제지표` / `프롬프트 관리` 뷰 전환
- 실시간 키워드 검색바 (`searchQuery`) — 프롬프트 관리 뷰에서 사용
- **[관리자 로그인]** 버튼 (비밀번호 인증 모달 호출)

### 3) 메인 내용 보기 핵심 컴포넌트 (`PromptBox.tsx`) - ★ 핵심 필수 사양
**프롬프트 관리 화면**은 좌측 사이드바(`CategoryTree.tsx`)와 우측 영역 2개로만 구성되는 2단(2-Column) 레이아웃입니다. 두 영역 사이에 프롬프트 목록을 보여주는 별도의 중간 패널(예: `PromptList.tsx` 등)은 두지 않습니다. 우측은 선택 단계 2의 `viewType`에 따라 `PromptBox.tsx` 또는 `HelpBoard.tsx`입니다.

- **상단 프롬프트 선택 탭 (같은 AI 툴 내 여러 프롬프트가 있을 때만 노출)**:
  - 현재 선택된 단계 2(AI 툴)에 속한 프롬프트 제목들을 `PromptBox.tsx` 최상단에 **가로 스크롤 가능한 칩(chip)/탭 형태**로 나열
  - 프롬프트가 1개뿐인 툴은 탭 없이 상세 카드만 표시
  - 탭 클릭 시 사이드바나 별도 패널 이동 없이 같은 화면에서 카드 내용만 즉시 전환

이어서 그 아래에, 선택한 프롬프트 템플릿의 세부 내용을 보여주는 메인 카드는 **반드시 아래 3개의 독립된 라벨 필드와 개별 복사 버튼**을 명시적으로 구성해야 합니다:

1. **`에이전트 이름` 필드**:
   - `Bot` 아이콘 + `에이전트 이름` 라벨
   - 상단 우측 `📋 복사` 버튼 (클릭 시 해당 이름만 클립보드 복사 및 `✓ 복사 완료` 토스트)
   - `input` 단일행 편집/조회 필드
2. **`에이전트 설명` 필드**:
   - `FileText` 아이콘 + `에이전트 설명` 라벨
   - 상단 우측 `📋 복사` 버튼 (클릭 시 해당 설명만 클립보드 복사)
   - `textarea` 다중행(3줄) 편집/조회 필드
3. **`프롬프트` 필드**:
   - `Terminal` 아이콘 + `프롬프트` 라벨 (황색 마크)
   - 상단 우측 `📋 복사` 버튼 (클릭 시 프롬프트 본문 전체 복사)
   - `textarea` 다중행(10줄 모노스페이스 폰트) 본문 편집/조회 필드

### 3-B) 도움말 게시판 (`HelpBoard.tsx`) — ★ v10 신규

**표시 조건**: 프롬프트 관리 뷰에서 선택한 단계 2의 `viewType === 'board'`일 때 우측 영역에 표시합니다. 시드 기준은 **게시판 > 참고 문서 모음**입니다.

기존 2단 레이아웃은 유지합니다. 사이드바와 게시판 사이에 별도 중간 패널을 두지 않으며, **목록 → 상세 → 작성** 전환은 모두 우측 `HelpBoard` 안에서 처리합니다.

#### 권한
| 동작 | 일반 사용자 | 관리자(로그인) |
| :--- | :--- | :--- |
| 목록 조회 | 가능 | 가능 |
| 게시물 상세 조회 | 가능 | 가능 |
| 첨부파일 다운로드 | 가능 | 가능 |
| 게시물 추가 | 불가 (글쓰기 버튼 숨김 또는 로그인 안내) | 가능 |
| 게시물 삭제 | 불가 | 가능 |
| 파일 업로드 | 불가 | 글 작성 시에만 가능 |

게시물 **수정(edit)** 은 v10에 포함하지 않습니다. 내용을 바꾸려면 삭제 후 다시 작성합니다.

#### 화면 A — 목록 (`HelpBoardView === 'list'`)
참고 문서 모음을 열면 **반드시 목록부터** 보여 줍니다.

- 상단: 제목 `참고 문서 모음`, 게시물 건수, 관리자일 때만 **`+ 새 글`** 버튼
- 테이블(또는 동등한 리스트) 컬럼:
  1. 제목
  2. 첨부 (`Paperclip` 아이콘 + 파일 개수, 없으면 `-`)
  3. 등록일 (`YYYY-MM-DD HH:mm`)
  4. 관리자일 때만 **삭제** 버튼 (`Trash2`)
- 정렬: **최신 글이 위** (`createdAt` 내림차순)
- 제목 클릭 → 상세 화면으로 전환
- **(v13)** 최초 실행(또는 `help_posts`가 비어 있는 기동) 후에는 시드 글 1건이 목록에 보입니다.
- 게시물이 없으면 Empty State: `등록된 참고 문서가 없습니다.`
  - 관리자: **`첫 글 등록`** 버튼으로 작성 화면을 엽니다. 안내 문구 `새 글을 작성해 주세요.`
  - 일반 사용자: `관리자로 로그인하면 첫 글을 등록할 수 있습니다.`
- 삭제 클릭 시 확인 대화상자(`이 게시물과 첨부파일을 삭제할까요?`) 후 삭제. 성공하면 목록을 다시 불러옵니다.

#### 화면 B — 상세 (`HelpBoardView === 'detail'`)
- 상단: **`← 목록`** 으로 목록 복귀, 관리자이면 **삭제** 버튼
- 제목, 등록일
- 본문 (`whitespace-pre-wrap`로 줄바꿈 유지)
- 첨부파일 목록: 원본 파일명, 크기(KB/MB), **다운로드** 링크
- 첨부가 없으면 첨부 영역을 숨기거나 `첨부파일 없음`을 표시

#### 화면 C — 작성 (`HelpBoardView === 'create'`, 관리자 전용)
- 상단: **`← 목록`** (작성 취소, 확인 후 목록 복귀)
- 필드:
  1. **제목** (필수, 단일 행). 빈 제목이면 저장 불가
  2. **내용** (선택 가능, 다중행 textarea)
  3. **첨부파일**: `input type="file"` **다중 선택** 허용. 선택 파일 목록을 보여주고 개별 제거 가능
- **등록** 버튼: `multipart/form-data`로 제목·본문·파일을 한 번에 전송. 성공 시 목록으로 돌아가 새 글이 맨 위에 보여야 함
- 제목만 있고 본문·파일이 없어도 등록할 수 있습니다. 제목 없는 글은 등록할 수 없습니다.

#### 첨부파일 규칙
- 저장 위치: `server/data/help-uploads/{postId}/{storedName}`
- Git에 업로드 파일을 넣지 않음 (`.gitignore`)
- **파일당 최대 크기**: 20MB. 초과 시 해당 파일만 거부하고 안내
- **한 글당 최대 파일 수**: 10개
- **허용 확장자(권장)**: `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `txt`, `csv`, `zip`, `png`, `jpg`, `jpeg`, `gif`, `webp`
- 허용 목록 외 확장자는 거부. 실행 파일(`.exe`, `.bat`, `.cmd`, `.js`, `.sh` 등)은 금지
- 게시물 삭제 시 DB의 첨부 행과 **디스크 파일·폴더를 함께 삭제**

##### 한글 파일명 (v11) — 필수
브라우저가 `multipart/form-data`로 UTF-8 한글 파일명을 보내도, Multer는 `file.originalname`을 **Latin-1(ISO-8859-1)** 로 해석하는 경우가 많습니다. 그대로 저장하면 `견적서.pdf`가 `ê²¬ì ì.pdf`처럼 깨집니다.

- 업로드 직후, DB·확장자 판정·화면에 쓰기 **전에** 원본명을 UTF-8로 복원합니다.
  - 복원: `Buffer.from(file.originalname, 'latin1').toString('utf8')`
  - 이미 올바른 UTF-8이면 결과가 같거나 안전한 범위에서만 적용합니다. 복원 후 `path.basename`으로 경로 구분자를 제거합니다.
- `help_attachments.original_name`에는 **복원된 한글 원본 파일명**만 저장합니다. 깨진 Latin-1 문자열을 넣지 않습니다.
- 디스크의 `storedName`은 `{attachmentId}{확장자}`처럼 ASCII만 사용합니다. 한글을 파일 시스템 경로에 넣지 않습니다. 확장자는 **복원된 원본명**에서 추출합니다.
- 목록·상세 UI는 DB의 `originalName`을 그대로 표시하며, 한글이 모지바케로 보이면 안 됩니다.
- 다운로드 시 `Content-Disposition`은 다음을 함께 지정합니다.
  - RFC 5987: `filename*=UTF-8''` + `encodeURIComponent(원본파일명)`
  - ASCII fallback `filename="..."`: 비ASCII는 `_` 등으로 치환한 안전 이름 (UTF-8 percent-encoding만 넣은 `filename=`에 한글을 넣지 않음)
- 원본 파일명을 헤더·로그에 넣을 때 개행·따옴표·경로 구분자(`..`, `/`, `\`)를 제거합니다.

#### UX
- 기존 Dark Mode 톤(`#080E18` / `#0f172a`)과 타이포·간격 체계를 유지합니다.
- 로딩·실패를 구분하고, 실패를 빈 목록으로 위장하지 않습니다.
- 헤더의 프롬프트 검색바는 게시판 글에 적용하지 않습니다. 목록에 별도의 검색창은 MVP에 넣지 않습니다.

### 4) 관리자 C.R.U.D 모달 (`AdminEditor.tsx`)
- **보안**: 관리자 암호 인증 후 접근 가능
- **관리 영역 분리**: 관리자 모달 내부에 `단계 관리`와 `프롬프트 관리` 영역(탭 또는 명확한 섹션)을 제공
- **단계 관리 — 단계 1**:
  1. 단계 1 목록 조회
  2. 새 단계 1 생성
  3. 단계 1 이름 수정
  4. 표시 순서 변경
  5. 빈 단계 1 삭제
- **단계 관리 — 단계 2**:
  1. 선택한 단계 1하의 단계 2 목록 조회
  2. 새 단계 2 생성
  3. 단계 2 이름·설명 수정
  4. 소속 단계 1 변경
  5. 표시 순서 변경
  6. 연결된 프롬프트가 없는 단계 2 삭제 (`board` 단계는 게시물이 없으면 삭제 가능)
- **삭제 보호**: 단계 삭제 시 하위 단계 또는 연결 프롬프트 개수를 표시하고, 데이터가 연결되어 있으면 삭제 버튼을 비활성화하거나 이동/정리 필요 안내를 표시하여 실수로 연쇄 삭제되지 않도록 함. `board` 단계 2는 도움말 게시물 건수를 표시하고, 글이 남아 있으면 삭제하지 못하게 함
- **프롬프트 편집 항목**:
  1. 제목 & DB에서 조회한 단계 2 선택 (**`viewType === 'board'`인 단계 2는 선택 목록에서 제외**)
  2. **1. 에이전트 이름** 편집 input
  3. **2. 에이전트 설명** 편집 input
  4. **3. 프롬프트 복사용 원문 (본문 내용)** 편집 textarea
- **도움말 게시판**: 글·파일은 `AdminEditor`가 아니라 우측 `HelpBoard`에서 관리합니다. 관리자 모달에 게시판 CRUD를 중복 구현하지 않습니다.
- **즉시 반영**: 단계 및 프롬프트의 추가/삭제/수정/순서 변경은 로컬 API 서버를 통해 **즉시 PostgreSQL에 반영(commit)**되며, 성공 후 사이드바와 선택 상태를 다시 동기화
- **초기화**: "DB 초기 데이터로 리셋" 기능은 단계 1/단계 2 구조와 `샘플 데이터 입력용.md` 기준 시드 프롬프트 4건을 기본 시드 상태로 복원합니다. 관리자가 추가한 프롬프트는 삭제됩니다. **도움말 게시물과 첨부파일은 유지**합니다. 경제지표 캐시/원가 모델 설정의 리셋 범위는 별도 명시합니다 (하단 8장 참고).

### 5) 입찰 경제지표 대시보드 (`EconomicDashboard`) — ★ v7 신규 / 초기 화면

**진입**: 앱 최초 로드 시 기본으로 표시되는 초기 화면입니다.  
**참조 Skill**: `bid-economic-dashboard-SKILL.md` (지표 정의·계산·장애 처리·Acceptance Criteria의 단일 기준)

#### 5-A. 절대 제약 (본 프로젝트에서도 동일 적용)
1. 외부 API 공급자는 **ECOS, EIA, IMF 정확히 3개만** 사용한다.
2. KOSIS, 한국수출입은행, FRED, LME, Investing.com, Yahoo Finance 등 **제4 공급자를 추가하지 않는다**. 스크래핑·HTML 파싱·LLM 가격 생성/추정도 금지한다.
3. 화면에 표시되는 모든 지표는 원본 공급자를 식별할 수 있어야 한다.
4. 원본 값과 계산된 값을 구분한다. 추정값은 `isEstimated` 및 UI 라벨로 명시한다.
5. 서로 다른 주기(일간/월간)의 데이터를 같은 날짜의 실시간 데이터처럼 보이게 하지 않는다.
6. 휴일·주말·결측치를 **0으로 채우지 않는다**. 없으면 N/A 또는 데이터 미수신으로 표시한다.
7. API 장애 시 마지막 정상값을 쓸 수 있으나 **기준 시각을 반드시 함께** 표시하고 stale 상태를 구분한다.
8. API 키는 서버 환경변수로만 주입하며, 브라우저·소스코드·로그에 노출하지 않는다.
9. 통계표/시리즈 코드는 공식 메타데이터 확인 후 매핑한다. 추측 금지.

#### 5-B. 화면 섹션 구조
대시보드는 단일 스크롤 페이지로 구성하며, 섹션 순서는 아래와 같습니다.

| 섹션 | 컴포넌트(권장명) | 내용 |
| :--- | :--- | :--- |
| **A. Executive Summary** | `ExecutiveSummary` | 추정 원가 변화율, Risk Level, 상승/하락 요인 Top 3, 데이터 최신 기준일(가장 오래된 핵심 지표 기준일 식별 가능) |
| **B. Inflation** | `InflationSection` | PPI/CPI 카드 + 최근 24개월 추세 차트 |
| **C. FX** | `FxSection` | USD/KRW(필수), 선택 시 JPY/EUR/CNY + 12개월 추세 및 1M/3M/6M 평균선 |
| **D. Commodities** | `CommoditiesSection` | WTI, Brent, Natural Gas, Copper, Aluminum, Nickel, Zinc 카드·추세·기간별 변화율 |
| **E. Interest Rates** | `InterestRatesSection` | 기준금리, CD 91일, 국고채 3년, 회사채 AA- 3년 + 스프레드 차트 |
| **F. Bid Cost Model** | `BidCostModel` | 사용자 원가 비중 입력 → 항목별 영향도·총 추정 원가 변화율·Risk 등급·기여도 순위 |

#### 5-C. MVP 필수 지표
Skill §23 MVP와 동일하게 다음만 필수로 한다.

| Provider | 지표 |
| :--- | :--- |
| **ECOS** | PPI, CPI, USD/KRW, 기준금리, CD 91일, 국고채 3년, 회사채 AA- 3년, 수입물가지수 |
| **EIA** | WTI, Brent, Natural Gas |
| **IMF PCPS** | Copper, Aluminum, Nickel, Zinc |

#### 5-D. 필수 파생·표시
- 변화율: 1M / 3M / 6M / 12M (지표 frequency에 맞게)
- 일간 데이터: 30일·90일 평균 (결측 0 대입 금지)
- 금리 스프레드: 회사채 AA- 3년 − 국고채 3년 (둘 다 있을 때만)
- 국제 원자재의 **Commodity Effect / FX Effect / Combined KRW Effect** 분리 표시(가능한 범위)
- 카드마다 기준일·기준월·발표일 중 하나 이상 + 공급자 표기  
  (`Bank of Korea ECOS` / `U.S. EIA` / `IMF PCPS`)
- Risk Level: 최소 `LOW` / `MEDIUM` / `HIGH` (필요 시 `VERY_HIGH`). 규칙은 투명하게 노출하고, 임의 AI 판단만으로 부여하지 않음

#### 5-E. Bid Cost Model (입찰 원가 모델)
사용자 입력:
- 프로젝트/입찰명, 기준 원가, 기준 환율
- 원가 항목별 비중 (합이 100%가 아니면 자동 보정하지 말고 경고)
- 항목별 적용 지표

권장 기본 연결 (Skill §10):
- 철강 → ECOS 철강 PPI(+관련 수입물가) + USD/KRW *(국제 철강 현물은 3-provider 제약으로 미제공 — UI에 제한 명시)*
- 알루미늄/구리/니켈 → IMF 해당 금속 + USD/KRW
- 수입부품 → 수입물가지수 + USD/KRW
- 에너지 → EIA WTI 또는 Brent
- 금융비용 → 회사채 AA- 또는 국고채
- 일반 물가 → CPI

출력:
- 원가 항목별 영향도, 총 추정 원가 변화율, 추정 원가, 리스크 등급, 기여도 순위
- 핵심 데이터 누락 시 확정값처럼 보이지 않게 하고 `Partial` / `Incomplete` 상태 표시

#### 5-F. UX / 시각 규칙
- 기존 앱의 Dark Mode 톤(`#080E18` / `#0f172a`)과 타이포·간격 체계를 유지한다.
- 대시보드는 “한 화면 요약 → 섹션별 심화” 흐름이 읽히게 한다. 카드에 출처·기준시점이 빠져서는 안 된다.
- 로딩/부분 실패/전체 실패 상태를 구분한다. 실패를 숨기거나 0으로 위장하지 않는다.

#### 5-G. MVP에서 제외
실시간 스트리밍, LME 유료 데이터, KOSIS, 수은 환율 API, FRED, Investing.com, 뉴스 감성분석, AI 가격예측, 자동 투찰 의사결정

---

## 6. DB 및 API 설계 (PostgreSQL & API) — v5 신규 / v7 확장 / v11 PostgreSQL 전환

기존 `localStorage`(이후 v5의 로컬 SQLite)를 대체하는 **PostgreSQL 아키텍처**입니다. API 서버는 프로젝트의 Node.js/Express로 기동하고, 업무 데이터는 PostgreSQL에 저장합니다.

### 1) DB 선택: PostgreSQL (v11)
- **엔진**: PostgreSQL
- **Node.js 연동 방식**: `pg`(node-postgres)의 `Pool`. 연결은 **비동기(async/await)** 입니다. `node:sqlite` `DatabaseSync` 등 동기 SQLite API를 사용하지 않습니다.
- **접속**: 프로세스 환경변수 **`DATABASE_URL`만** 사용합니다.
  - 형식 예: `postgresql://사용자:비밀번호@호스트:5432/데이터베이스`
  - 서버 기동 시 `process.env.DATABASE_URL`을 읽고, 값이 없거나 비어 있으면 **즉시 실패**(명확한 오류 메시지). 기본 접속 문자열을 코드에 넣지 않습니다.
  - **`.env` 파일에 `DATABASE_URL`을 작성하지 않습니다.** 이 값은 OS·Windows 시스템/사용자 환경변수, 서비스 매니저, 컨테이너 런타임 등에서만 주입합니다.
  - `dotenv`는 `ECOS_API_KEY` 등 기존 `.env` 용도로 남을 수 있으나, **이미 설정된 프로세스 환경변수를 덮어쓰지 않아야** 하며, `.env`에 `DATABASE_URL` 키 자체를 두지 않는 것이 원칙입니다.
  - `DATABASE_URL`을 로그·에러 응답·프론트 번들에 출력하지 않습니다.
- **금지**:
  - 로컬 SQLite 파일 (`server/data/posco_prompts.db`) 사용 금지
  - `node:sqlite`, `better-sqlite3`, `sqlite3` 사용 금지
  - 접속 정보를 소스 코드·Git·`.env`에 하드코딩하는 것 금지
- 도움말 첨부파일은 계속 `server/data/help-uploads/` 디스크에 둡니다. Git에 넣지 않습니다.
- 서버 최초 기동 시 `DATABASE_URL`로 연결한 뒤, 테이블이 없으면 `CREATE TABLE IF NOT EXISTS`로 스키마를 보장합니다. SQLite 파일을 자동 생성하던 동작은 제거합니다.
- SQL 플레이스홀더는 PostgreSQL 방식(`$1`, `$2`, …)을 사용합니다. SQLite의 `?` 바인딩을 쓰지 않습니다.

### 2) 테이블 스키마
카테고리를 고정 문자열이 아닌 실제 데이터로 관리하기 위해 단계 1과 단계 2 테이블을 분리합니다. 프롬프트는 단계 2의 ID를 외래키로 참조합니다.

```sql
CREATE TABLE category_level1 (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE category_level2 (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  view_type TEXT NOT NULL DEFAULT 'prompt' CHECK (view_type IN ('prompt', 'board')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES category_level1(id) ON DELETE RESTRICT,
  UNIQUE(parent_id, name)
);

CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  category_level2_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  agent_name TEXT NOT NULL,
  agent_description TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_level2_id) REFERENCES category_level2(id) ON DELETE RESTRICT
);

CREATE TABLE admin_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL
);

-- 도움말 게시판 (v10)
CREATE TABLE help_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE help_attachments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES help_posts(id) ON DELETE CASCADE
);
```

#### 2-A) 경제지표 관련 테이블 (v7 신규)

프롬프트 테이블과 분리하여 경제지표 카탈로그·시계열 캐시·원가 모델 설정을 저장합니다. 컬럼명은 구현 시 snake_case로 맞추되, 개념은 아래를 따릅니다.

```sql
-- 지표 카탈로그 (공식 메타데이터 확인 후 기록한 매핑)
CREATE TABLE economic_indicator_catalog (
  indicator_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('ECOS', 'EIA', 'IMF')),
  display_name_ko TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL,
  unit TEXT,
  currency TEXT,
  -- provider별 매핑 메타 (JSON 또는 개별 컬럼)
  mapping_json TEXT NOT NULL,
  source_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  verified_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 정규화된 시계열 관측값 캐시 (원본)
CREATE TABLE economic_observations (
  id TEXT PRIMARY KEY,
  indicator_key TEXT NOT NULL,
  period TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit TEXT,
  currency TEXT,
  source_timestamp TEXT,
  fetched_at TEXT NOT NULL,
  source_reference TEXT,
  is_estimated INTEGER NOT NULL DEFAULT 0,
  UNIQUE(indicator_key, period),
  FOREIGN KEY (indicator_key) REFERENCES economic_indicator_catalog(indicator_key)
);

-- 입찰 원가 모델 시나리오 (사용자 설정)
CREATE TABLE bid_cost_scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_cost DOUBLE PRECISION,
  base_fx DOUBLE PRECISION,
  weights_json TEXT NOT NULL,      -- 원가 항목별 비중·연결 지표
  risk_weights_json TEXT,          -- Risk Score 가중치(선택)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

- `mapping_json`에는 Skill §5–7에 정의된 provider별 필수 메타데이터(ECOS 통계표/항목 코드, EIA route/facet, IMF series_key 등)를 저장합니다.
- 파생 지표(변화율·평균·스프레드·KRW effect·Risk)는 **요청 시 계산**하거나 별도 파생 캐시 테이블에 둘 수 있으나, 원본 관측과 반드시 구분합니다.
- 외래키 삭제 정책은 `RESTRICT`를 기본으로 하여, 하위 데이터가 있는 카테고리가 실수로 연쇄 삭제되지 않도록 합니다. `help_attachments`만 게시물 삭제 시 `CASCADE`로 메타를 함께 지우고, 서버는 디스크 파일도 삭제해야 합니다.
- 단계 이동은 ID를 유지한 채 `parent_id`만 변경하고, 프롬프트 이동은 `category_level2_id`를 변경합니다.
- `sort_order`는 관리자 화면의 정렬 결과를 저장하는 용도로 사용합니다.
- `category_level2.view_type` 기본값은 `'prompt'`입니다. 시드 단계 2 `참고 문서 모음`만 `'board'`입니다.
- 기존 PostgreSQL에 테이블이 있으면 서버 기동 시 `view_type` 컬럼·`help_posts`·`help_attachments` 테이블이 없으면 추가하는 마이그레이션을 수행합니다. 기존 게시판 단계 2(`id`가 시드의 `l2-help`이거나, 이름이 `도움말` 또는 `참고 문서 모음`이며 부모 단계 1이 `기타` 또는 `게시판`인 행)는 `view_type = 'board'`로 보정합니다. **(v12)** 시드 표시 이름은 단계 1 `게시판`, 단계 2 `참고 문서 모음`입니다. 기존 DB에 `기타`/`도움말`이 남아 있으면 기동 또는 `/api/prompts/reset` 시 해당 표시 이름으로 갱신합니다. ID는 유지합니다.

### 3) 로컬 API 서버
- **구성**: Node.js + Express 기반 경량 REST API 서버 (`/server` 디렉토리), 프론트엔드(Vite dev server)와 함께 `npm run dev`로 동시 기동 (예: `concurrently` 사용)
- **외부 API 호출은 서버에서만 수행**합니다. 브라우저가 ECOS/EIA/IMF 키를 직접 사용하지 않습니다.

#### 3-A) 프롬프트·카테고리·인증 엔드포인트

| Method | Endpoint | 설명 |
| :----- | :------- | :------- |
| GET | `/api/categories/level1` | 단계1 전체 조회 |
| POST | `/api/categories/level1` | 단계1 생성 (관리자 인증 필요) |
| PUT | `/api/categories/level1/:id` | 단계1 이름/순서 수정 (관리자 인증 필요) |
| DELETE | `/api/categories/level1/:id` | 빈 단계1 삭제 (관리자 인증 필요) |
| GET | `/api/categories/level2` | 단계2 전체 조회, `?parentId=` 필터 지원. 응답에 `viewType` 포함 |
| POST | `/api/categories/level2` | 단계2 생성 (관리자 인증 필요). 기본 `viewType`은 `'prompt'` |
| PUT | `/api/categories/level2/:id` | 단계2 이름/설명/부모/순서 수정 (관리자 인증 필요) |
| DELETE | `/api/categories/level2/:id` | 프롬프트가 없는 단계2 삭제. `board` 단계 2는 게시물이 있으면 삭제 불가 (관리자 인증 필요) |
| GET | `/api/prompts` | 전체 프롬프트 목록 조회 (`?q=`, `?categoryLevel2Id=` 지원) |
| GET | `/api/prompts/:id` | 단일 프롬프트 조회 |
| POST | `/api/prompts` | 신규 프롬프트 생성 (관리자 인증 필요) |
| PUT | `/api/prompts/:id` | 프롬프트 수정 및 단계2 이동 (관리자 인증 필요) |
| DELETE | `/api/prompts/:id` | 프롬프트 삭제 (관리자 인증 필요) |
| POST | `/api/prompts/reset` | 카테고리와 프롬프트를 초기 시드 데이터로 리셋 (관리자 인증 필요) |
| POST | `/api/auth/login` | 관리자 비밀번호 인증, 세션/토큰 발급 |

#### 3-B) 경제지표 대시보드 엔드포인트 (v7 신규)

| Method | Endpoint | 설명 |
| :----- | :------- | :------- |
| GET | `/api/economic/summary` | Executive Summary용 집계 (원가 변화율, Risk, Top 요인, 기준일) |
| GET | `/api/economic/indicators` | 카탈로그 + 최신값 요약 목록 (`?category=` 필터 가능) |
| GET | `/api/economic/indicators/:key` | 단일 지표 상세 + 시계열 (`?from=`, `?to=` 지원) |
| GET | `/api/economic/series` | 여러 지표 시계열 일괄 조회 (`?keys=a,b,c`) |
| POST | `/api/economic/refresh` | 서버 캐시 갱신 트리거 (관리자 또는 내부 스케줄; 과도한 외부 호출 방지) |
| GET | `/api/economic/bid-cost` | 저장된 원가 시나리오 목록/기본 시나리오 조회 |
| PUT | `/api/economic/bid-cost` | 원가 시나리오 저장(비중·기준값·연결 지표) |
| POST | `/api/economic/bid-cost/calculate` | 비중·지표 기준으로 원가 영향도·Risk 계산 결과 반환 |

#### 3-C) 도움말 게시판 엔드포인트 (v10 신규)

업로드 디렉터리 `server/data/help-uploads/`가 없으면 서버가 생성합니다. Vite 개발 서버의 `/api` 프록시를 그대로 사용합니다.

| Method | Endpoint | 설명 |
| :----- | :------- | :------- |
| GET | `/api/help-posts` | 게시물 목록. 최신순. 각 항목에 첨부 개수 포함. 본문 전문은 생략해도 됨 |
| GET | `/api/help-posts/:id` | 게시물 상세 + 첨부 메타 목록 |
| POST | `/api/help-posts` | 게시물 생성 (관리자 인증 필요). `multipart/form-data`: `title`, `body`, `files[]` |
| DELETE | `/api/help-posts/:id` | 게시물 삭제 (관리자 인증 필요). 첨부 DB 행 + 디스크 파일 동시 삭제 |
| GET | `/api/help-posts/:id/attachments/:attachmentId` | 첨부파일 다운로드. **UTF-8로 복원된 원본 파일명**으로 내려줌 (`filename*=UTF-8''`) |

- 목록·상세·다운로드는 인증 없이 가능합니다.
- `POST`/`DELETE`는 기존 관리자 인증과 동일한 방식입니다.
- `viewType === 'board'`가 아닌 단계 2로 프롬프트를 생성할 때와 반대로, 도움말 글은 카테고리 ID를 클라이언트에서 고르지 않습니다. 게시판은 앱에 **하나**이며 `help_posts` 테이블이 그 저장소입니다.
- `POST /api/prompts`는 `viewType === 'board'`인 단계 2를 거부합니다.
- **(v11)** `POST /api/help-posts`는 각 파일의 `originalname`을 Latin-1 → UTF-8로 복원한 뒤 `original_name`에 저장합니다. 깨진 한글명을 DB에 넣지 않습니다.

- **프론트엔드 연동**:
  - `usePromptStore`: 프롬프트·단계 1/2 CRUD/정렬 (기존). 단계 2에 `viewType` 포함
  - `useEconomicDashboard`(권장): `/api/economic/*`를 호출해 요약·섹션 데이터·원가 모델 상태를 관리
  - `useHelpBoard`(권장): `/api/help-posts*`를 호출해 목록·상세·작성·삭제·다운로드 상태를 관리
  - `CategoryTree.tsx`는 API에서 받은 카테고리 배열을 기준으로 트리를 구성하며, 특정 AI 툴 이름이나 개수를 하드코딩하지 않습니다. 게시판 여부는 **이름 `'참고 문서 모음'`이 아니라 `viewType`** 으로 판단합니다.
- **갱신 원칙** (Skill §18): 화면 요청마다 외부 API를 직접 치지 않고 서버 캐시를 우선 사용합니다.
  - ECOS 일간 → 영업일 기준 정기 갱신
  - ECOS 월간 / IMF PCPS → 일 1회 확인 수준으로 충분
  - EIA → 해당 frequency에 맞춰 갱신
  - 캐시에도 `fetched_at`과 원본 기준시점을 유지합니다.

### 4) 초기 데이터(시드) 및 마이그레이션
- 최초 실행 시 서버가 `DATABASE_URL`로 PostgreSQL에 연결하고, 테이블이 없으면 생성한 뒤 **기본 단계 1/단계 2 카테고리와 시드 프롬프트**를 삽입합니다. 로컬 SQLite 파일 생성은 하지 않습니다.
- **(v8)** 단계 1 `계약 품의서`와 하위 단계 2 4개, 그리고 `샘플 데이터 입력용.md`의 에이전트 프롬프트 4건(`server/seedPrompts.ts`)을 시드로 넣습니다. 각 단계 2에는 프롬프트 1건만 연결합니다. 구 샘플(`견적 비교 요약`, `규격서 핵심 요구사항 추출` 등)은 넣지 않습니다.
- **(v9)** 단계 1은 `계약 품의서`와 `게시판`(구 명칭 `기타`)만 시드합니다. `게시판`의 단계 2는 `참고 문서 모음`(구 명칭 `도움말`) 1개만 둡니다. `바이브코딩툴` 및 GPT 외 대형언어모델 단계 2(제미나이, 클로드)는 시드에서 제거합니다. `참고 문서 모음`에는 기본 프롬프트를 넣지 않습니다.
- **(v10)** 시드 단계 2 `참고 문서 모음`의 `view_type`은 `'board'`입니다. 업로드 디렉터리 `server/data/help-uploads/`는 Git에 넣지 않습니다.
- **(v12)** `server/seedPrompts.ts`의 단계 1 표시 이름은 `게시판`, 단계 2 표시 이름은 `참고 문서 모음`입니다. ID(`l1-etc`, `l2-help`)는 유지합니다.
- **(v13)** `help_posts`가 비어 있으면 서버 기동 시 최초 글 1건을 삽입합니다.
  - id: `hp-intro`
  - 제목: `참고 문서 모음 이용 안내`
  - 본문: 목록·상세·다운로드, 관리자 글쓰기/삭제/첨부 규칙, 경제지표·프롬프트 관리 안내
  - 첨부 없음
  - 이미 1건 이상 있으면 삽입하지 않습니다. 시드 ID가 삭제되어 테이블이 비면 다음 기동 때 다시 넣습니다.
  - `/api/prompts/reset`은 이 글을 지우지 않습니다.
- **(v7)** 경제지표 카탈로그는 MVP 지표 목록을 시드로 넣되, **실제 통계표/시리즈 코드는 공식 메타데이터 확인 후에만** `mapping_json`에 확정 기록합니다. 확인 전 placeholder를 active=0으로 둘 수 있습니다.
- 기존 `localStorage`(`posco_prompt_templates_v4`) 데이터가 남아있는 사용자를 위해, 최초 접속 시 브라우저에 저장된 데이터를 감지하여 1회성으로 DB에 가져오는(import) 마이그레이션 유틸리티를 제공할 수 있습니다(선택 사항).
- `/api/prompts/reset`은 **카테고리 시드와 시드 프롬프트 4건**을 복원합니다. 관리자가 추가한 프롬프트는 삭제됩니다. 경제지표 관측 캐시·원가 시나리오·**도움말 게시물·첨부파일은 유지**하며, 그 리셋이 필요하면 별도 관리자 동작 또는 별도 엔드포인트로 분리합니다.

### 5) 보안·환경변수 (v7 / v11)
- **`DATABASE_URL`**: PostgreSQL 접속 문자열. **프로세스 환경변수로만** 주입합니다. **`.env`에 두지 않습니다.** Git·로그·클라이언트에 노출하지 않습니다.
- `ECOS_API_KEY`, `EIA_API_KEY` (및 IMF가 별도 인증을 요구하는 환경이면 해당 Secret)는 `.env` 등 서버 측에서만 로드
- `.env`는 Git에 커밋하지 않음
- 인증키·`DATABASE_URL`을 로그에 출력하지 않음
- 프론트 빌드 결과물에 키·접속 문자열이 포함되지 않도록 함
- **(v10)** 업로드 파일은 프로젝트 로컬 디스크에만 두고 외부 스토리지로 보내지 않음. 다운로드 URL에 디렉터리 탈출(`..`)이 되지 않도록 `postId`/`attachmentId`로만 파일을 찾음. 원본 파일명을 헤더에 넣을 때 경로 구분자를 제거함
- **(v11)** 첨부 원본 파일명은 UTF-8로 복원해 저장하고, 다운로드 헤더는 RFC 5987 `filename*`을 사용함. 한글이 깨진 이름을 `original_name`에 넣지 않음

---

## 7. 구현 단계 (대시보드) — 권장 순서

기존 프롬프트 관리 기능을 깨지 않는 범위에서 아래 순서를 권장합니다. 세부 완료 조건은 Skill §22–24를 따릅니다.

| Phase | 목표 | 완료 조건(요약) |
| :--- | :--- | :--- |
| **P0 — App Shell** | 초기 화면을 대시보드로, 헤더에서 프롬프트 관리 전환 | 앱 로드 시 대시보드가 보이고, 프롬프트 2단 UI로 왕복 가능 |
| **P1 — Data Foundation** | 3 provider 클라이언트, 카탈로그, 정규화 모델, 캐시 | 핵심 지표가 provider·frequency·unit·기준일과 연결됨 |
| **P2 — Basic Dashboard** | Summary + Inflation/FX/Commodities/Rates 카드·차트 | 출처·기준일·기간 변화율 표시 |
| **P3 — Bid Cost Model** | 비중 입력, 매핑, FX 효과 분리, 기여도 | 총 원가 변화율과 항목별 원인 설명 가능 |
| **P4 — Risk & Operations** | Risk Score, 장애/stale 처리, 설정 저장 | 실패 시 0 위장 없음, 월간≠실시간 구분 |

코딩 착수 시 Cursor Agent는 Skill §21 행동 규칙을 따릅니다: 저장소 구조 확인 → 기존 계층 존중 → 제4 API 추가 금지 → 공식 메타데이터로 매핑 확인 → Acceptance Criteria 검증.

### 도움말 게시판 (v10) — 권장 순서

대시보드·기존 프롬프트 PromptBox를 깨지 않는 범위에서 아래 순서를 권장합니다.

| Phase | 목표 | 완료 조건(요약) |
| :--- | :--- | :--- |
| **H0 — Schema** | PostgreSQL에 `view_type`, `help_posts`, `help_attachments`, 업로드 디렉터리, 기존 DB 마이그레이션 | 참고 문서 모음 단계 2가 `board`로 조회됨 |
| **H1 — API** | 목록/상세/생성/삭제/다운로드 | 관리자만 쓰기, 파일은 디스크+메타 분리, **한글 원본명 UTF-8 복원** |
| **H2 — List UI** | 게시판 > 참고 문서 모음 클릭 시 우측 목록, PromptBox 미표시 | 시드 글 또는 Empty State, 최신순 |
| **H3 — Create/Delete/Files** | 새 글, 다중 첨부, 삭제 시 파일 제거, 상세·다운로드 | 일반 사용자는 조회·다운로드만. 한글 파일명이 목록·다운로드에서 깨지지 않음 |
| **H4 — Seed first post (v13)** | `help_posts` 비어 있으면 `hp-intro` 삽입, Empty State에 첫 글 등록 | 참고 문서 모음에 최초 글이 보인다 |

---

## 8. Acceptance Criteria (대시보드 MVP)

다음을 모두 만족해야 대시보드 MVP 완료로 봅니다. (Skill §24와 정합)

### API / 공급자
- 외부 API 공급자가 정확히 ECOS, EIA, IMF 3개다.
- 각 지표의 실제 공급자를 식별할 수 있다.
- API 키가 코드·클라이언트에 노출되지 않는다.

### 데이터
- PPI·CPI가 최신 월과 함께 표시된다.
- USD/KRW 최신 영업일 값을 확인할 수 있다.
- 핵심 시장금리, WTI/Brent/Natural Gas, Copper/Aluminum/Nickel/Zinc를 확인할 수 있다.
- 모든 지표에 단위와 기준시점이 있다.

### 계산
- 기간별 변화율을 계산할 수 있다.
- 환율과 국제 원자재 가격을 결합한 원화 영향도를 계산할 수 있다.
- 사용자 원가 구성비를 반영한 총 원가 변화율·항목별 기여도를 확인할 수 있다.

### UI / 네비게이션
- 앱 초기 화면이 경제지표 대시보드이다.
- 헤더에서 프롬프트 관리 화면으로 전환할 수 있고, 기존 2단 레이아웃·동적 카테고리·PromptBox 3필드가 유지된다.
- Executive Summary 및 Inflation / FX / Commodities / Interest Rates / Bid Cost Model 섹션이 존재한다.
- 각 카드에서 데이터 기준시점을 확인할 수 있다.

### 안정성
- API 실패가 0 값으로 변환되지 않는다.
- stale data를 구분할 수 있다.
- 월간 데이터를 실시간 데이터처럼 표시하지 않는다.
- 존재하지 않는 값을 LLM이 생성하지 않는다.

### 도움말 게시판 (v10)

다음을 모두 만족해야 도움말 게시판 MVP 완료로 봅니다.

- 프롬프트 관리에서 **게시판 > 참고 문서 모음**을 열면 우측이 PromptBox가 아니라 게시판 **목록**이다.
- 계약 품의서 등 `viewType === 'prompt'` 단계 2는 기존 PromptBox 3필드가 그대로 동작한다.
- 게시물이 없으면 Empty State가 보이고, 관리자는 **첫 글 등록**으로 작성할 수 있다. 글이 있으면 제목·첨부 여부·등록일이 최신순으로 나열된다.
- **(v13)** 게시판이 비어 있는 상태로 서버가 기동되면 시드 글 `참고 문서 모음 이용 안내`가 1건 있다.
- 제목을 누르면 본문과 첨부 목록이 있는 상세로 들어가고, 목록으로 돌아올 수 있다.
- 관리자는 제목(필수)·내용·파일로 글을 추가할 수 있고, 목록 또는 상세에서 삭제할 수 있다.
- 일반 사용자에게는 글쓰기·삭제 버튼이 없거나 동작하지 않는다. 목록·상세·다운로드는 가능하다.
- 첨부 파일을 업로드하고 **한글이 깨지지 않은 원본 파일명**으로 목록에 보이며, 그 이름으로 다운로드할 수 있다. 글 삭제 시 디스크 파일도 제거된다.
- 게시판 여부는 카테고리 이름 문자열이 아니라 `viewType === 'board'`로 판단한다.
- `/api/prompts/reset` 후에도 도움말 게시물과 첨부가 남아 있다.
- 업무 데이터는 PostgreSQL(`DATABASE_URL`)에 저장된다. `.env`에 `DATABASE_URL`이 없어도 프로세스 환경변수만으로 접속해야 한다.

---

## 9. 바이브코딩 툴용 재생성 프롬프트 (Prompt for Regeneration)

다른 바이브코딩 툴(Cursor, Windsurf, Bolt 등)에서 이 프로젝트를 새로 생성할 때는 **반드시 아래 프롬프트**를 전달하여 실행하세요:

```text
[요청]
포스코스틸리온 구매 입찰 지원 시스템을 위한 웹 앱을 구축해줘.
앱은 (1) 초기 화면의 입찰 경제지표 대시보드와 (2) 프롬프트/에이전트 관리 플랫폼, (3) 게시판>참고 문서 모음의 게시판으로 구성된다.
경제지표 대시보드의 상세 규칙(공급자·지표·계산·장애 처리·Acceptance Criteria)은 프로젝트의 bid-economic-dashboard-SKILL.md를 따른다.

[초기 화면 — 경제지표 대시보드]
- 앱 최초 로드 시 기본 화면은 경제지표 대시보드다.
- 상단 헤더에서 '경제지표'와 '프롬프트 관리'를 전환할 수 있게 한다.
- 대시보드 섹션 순서: Executive Summary → Inflation(PPI/CPI) → FX(USD/KRW) → Commodities(WTI/Brent/Gas + Copper/Aluminum/Nickel/Zinc) → Interest Rates → Bid Cost Model
- 외부 데이터 공급자는 한국은행 ECOS, U.S. EIA, IMF PCPS 정확히 3개만 사용한다. 제4 API·스크래핑·LLM 수치 생성을 하지 말 것
- API 키는 서버 환경변수(ECOS_API_KEY, EIA_API_KEY)로만 주입하고 브라우저에 노출하지 말 것
- PostgreSQL 접속은 프로세스 환경변수 DATABASE_URL만 사용한다. .env에 DATABASE_URL을 두지 말 것. 값이 없으면 서버 기동을 실패시킬 것
- 모든 카드에 공급자명과 기준일/기준월을 표시할 것. 결측/장애 시 0으로 채우지 말고 N/A·stale·Partial을 구분할 것
- 월간 지표와 일간 지표를 실시간처럼 섞어 보이지 말 것
- Bid Cost Model에서 원가 비중 입력·항목별 영향도·총 원가 변화율·Risk Level을 제공할 것. 비중 합이 100%가 아니면 자동 수정하지 말고 경고할 것

[프롬프트 관리 — 2단(2-Column) 구성]
'프롬프트 관리' 뷰에서 전체 화면은 반드시 '좌측 사이드바' + '우측 상세보기'의 2단 구성이어야 한다. 사이드바와 상세보기 사이에 프롬프트 목록을 나열하는 별도의 중간 패널은 절대 만들지 마세요. 좌측 사이드바는 **DB에서 조회한 단계 1 → 단계 2의 2단계 트리**로만 구성하고, 카테고리 이름이나 개수를 소스 코드에 고정하지 마세요. 개별 프롬프트 제목은 트리에 넣지 마세요. 단계 2 노드를 클릭하면: (1) 그 단계 2의 viewType이 'board'이면 우측 HelpBoard.tsx를 **목록부터** 표시하고 PromptBox는 쓰지 마세요. (2) viewType이 'prompt'이면 그 단계에 속한 첫 번째 프롬프트가 즉시 우측 PromptBox.tsx에 표시되고, 같은 단계 2에 프롬프트가 여러 개 있으면 PromptBox.tsx 상단에 프롬프트 제목을 가로 탭/칩으로 나열해 그 안에서 전환할 수 있게 하세요 (프롬프트가 1개뿐이면 탭 없이 카드만 표시).

[핵심 필수 UI 요구사항 - 내용 보기 화면 (PromptBox.tsx)]
메인 프롬프트 상세 보기 화면은 단순한 텍스트 상자 하나만 표시해서는 안 되며, 반드시 아래 3가지 필드로 구분된 '독립 카드 UI'로 구성해야 합니다:

1. '에이전트 이름' 필드
   - 라벨: Bot 아이콘 + "에이전트 이름"
   - 오른쪽 우측 개별 [📋 복사] 버튼
   - input 입력/조회 필드

2. '에이전트 설명' 필드
   - 라벨: FileText 아이콘 + "에이전트 설명"
   - 오른쪽 우측 개별 [📋 복사] 버튼
   - textarea 입력/조회 필드

3. '프롬프트' 필드
   - 라벨: Terminal 아이콘 + "프롬프트"
   - 오른쪽 우측 개별 [📋 복사] 버튼
   - 모노스페이스 폰트 다중행 textarea 본문 필드

[도움말 게시판 (v10) — HelpBoard.tsx]
- 시드 단계 2 '참고 문서 모음'의 viewType은 'board'다. 카테고리 이름 문자열로 분기하지 말고 viewType으로 분기할 것
- 참고 문서 모음을 열면 먼저 게시물 목록이 나온다 (제목, 첨부 개수, 등록일, 최신순)
- help_posts가 비어 있으면 서버 기동 시 시드 글 1건(id hp-intro, 제목 '참고 문서 모음 이용 안내')을 넣을 것. 이미 글이 있으면 넣지 말 것
- 관리자는 새 글을 추가할 수 있다: 제목(필수), 내용, 파일 다중 첨부. 글이 없을 때 Empty State에 '첫 글 등록' 버튼을 둘 것
- 관리자는 목록/상세에서 게시물을 삭제할 수 있다. 삭제 시 첨부 파일도 디스크에서 지울 것
- 일반 사용자는 목록·상세·파일 다운로드만 가능하다. 글 수정(edit)은 만들지 말 것
- 파일은 로컬 디스크 server/data/help-uploads/ 에 저장하고 메타는 PostgreSQL help_posts / help_attachments 에 둔다. 클라우드 스토리지를 쓰지 말 것
- 한글 파일명이 깨지면 안 된다. Multer originalname을 Latin-1→UTF-8로 복원해 original_name에 저장하고, 다운로드 Content-Disposition은 filename*=UTF-8'' (RFC 5987)을 쓸 것
- 파일당 20MB, 글당 10개, 허용 확장자(pdf/office/이미지/txt/csv/zip)만. 실행 파일 금지
- 게시판 API: GET/POST/DELETE /api/help-posts, GET /api/help-posts/:id/attachments/:attachmentId
- AdminEditor에 게시판 CRUD를 중복하지 말 것. board 단계 2에는 프롬프트를 생성/이동하지 말 것
- /api/prompts/reset 은 도움말 글·파일을 지우지 말 것. 게시판이 비어 있으면 시드 글 hp-intro를 넣을 것

[스택 및 저장소]
- Frontend: React 18, Vite, TypeScript, Tailwind CSS (Dark Mode #080E18), Lucide React, 경량 차트 라이브러리
- Backend: Node.js + Express 기반 로컬 API 서버 (프론트엔드와 함께 로컬에서 기동). 외부 경제 API는 서버에서만 호출
- Database: **PostgreSQL** (`pg` Pool). 접속은 프로세스 환경변수 **DATABASE_URL만** 사용. **.env에 DATABASE_URL을 두지 말 것**. 로컬 SQLite 파일·node:sqlite·better-sqlite3/sqlite3 사용 금지. 브라우저 localStorage는 업무 데이터에 사용하지 않음. SQL 바인딩은 $1, $2 형식
- 프롬프트 CRUD는 `/api/prompts`, 단계 1/2 CRUD는 `/api/categories/level1`, `/api/categories/level2`, 경제지표는 `/api/economic/*`, 도움말 게시판은 `/api/help-posts`, 관리자 인증은 `/api/auth/login`

[카테고리 구조 (동적 2단계, 개별 프롬프트는 트리에 넣지 않음)]
- 최초 시드 단계 1: **계약 품의서**, **게시판**. 바이브코딩툴·대형언어모델·기타 라벨은 사용하지 말 것
- 계약 품의서 하위 단계 2: 계약 품의서 / 예정가격 조사(컨설팅 용역) / 예정가격(T/P) 산출 및 원가 검토 / 입찰 진행 품의
- 게시판 하위 단계 2: **참고 문서 모음** 1개만 (viewType='board'). 제미나이·클로드·VSCODE·제미나이CLI·Cursor AI는 시드에 넣지 말 것
- `샘플 데이터 입력용.md`의 4개 에이전트 프롬프트를 계약 품의서 하위 단계 2에 각각 1건씩 시드로 넣을 것 (`server/seedPrompts.ts`). 구 샘플(견적 비교 요약 등)은 넣지 말 것. 참고 문서 모음에는 프롬프트를 넣지 말 것
- 카테고리 시드를 프론트엔드 코드에 고정값으로 취급하지 말 것. DB에서 조회한 배열로 트리를 구성할 것
- 관리자가 단계 1을 직접 생성, 이름 수정, 표시 순서 변경, 삭제할 수 있게 할 것
- 관리자가 각 단계 1 아래의 단계 2를 직접 생성, 이름/설명 수정, 소속 단계 1 변경, 표시 순서 변경, 삭제할 수 있게 할 것
- 단계 1/2의 ID는 이름과 분리하여 유지하고, 프롬프트는 단계 2 ID를 참조하게 할 것
- 하위 단계가 있는 단계 1 및 연결 프롬프트가 있는 단계 2는 바로 삭제하지 못하게 RESTRICT하고, 먼저 이동/정리하도록 안내할 것. board 단계 2는 게시물이 있으면 삭제하지 말 것
- 모든 카테고리 이름과 개수를 프론트엔드 코드에 하드코딩하지 말 것

[관리자 기능]
- 비밀번호 인증 관리자 모달
- 관리자 화면에 `단계 관리`와 `프롬프트 관리` 기능 제공
- 단계 관리에서 단계 1/단계 2 생성·수정·삭제·정렬 및 단계 2의 부모 단계 이동 지원
- 프롬프트 관리에서 DB에 존재하는 단계 2(`viewType='prompt'`만)를 선택하여 프롬프트를 생성/이동하고, 1) 에이전트 이름, 2) 에이전트 설명, 3) 프롬프트 복사용 원문(본문)을 직접 편집 및 저장할 수 있게 할 것
- 카테고리가 0개인 경우에도 오류 없이 빈 상태를 보여주고, 관리자가 새 단계 1부터 생성할 수 있게 할 것
- 참고 문서 모음 글쓰기·삭제는 관리자 로그인 후 HelpBoard에서 수행한다. AdminEditor에 게시판을 넣지 말 것
```

---

*본 문서는 구매 입찰 지원 시스템 사양서에서 불필요한 PromptFramework 항목을 제거하고 3대 필드(에이전트 이름, 에이전트 설명, 프롬프트) 중심으로 간결하게 정돈되었습니다. (v2 개정) 화면 레이아웃은 '사이드바 + 중간 목록 + 상세보기'의 3단 분할에서, 중간 목록 패널을 제거한 '사이드바 + 상세보기'의 2단 분할 구성으로 단순화하였습니다. 이후 사이드바 트리는 개별 프롬프트 리프 노드를 넣지 않는 **2단계 트리**로 유지하고, 같은 AI 툴에 여러 프롬프트가 있을 경우의 선택은 `PromptBox.tsx` 상단의 **탭/칩 선택 UI**로 처리하도록 재조정하였습니다. (v3 개정)*

*데이터 저장 방식을 브라우저 `localStorage`에서 **로컬 SQLite 파일 DB + 로컬 Node.js/Express API 서버** 조합으로 전환하였습니다. 이를 통해 브라우저 저장소 용량 제한, 브라우저별/기기별 데이터 분리, 캐시 삭제 시 데이터 소실 등의 문제를 해소하고, 실제 DB 파일 단위의 백업·이전이 가능해졌습니다. (v5 개정)*

*기존에 소스 코드의 고정 값으로 정의하던 단계 1/단계 2 구조를 **SQLite 기반 동적 카테고리 데이터**로 전환하였습니다. 관리자는 단계 1과 단계 2를 직접 생성·수정·삭제·정렬할 수 있으며, 단계 2의 소속 단계 1 변경도 가능합니다. 프롬프트는 고정 AI 툴 문자열 대신 단계 2 ID를 참조하고, 연결 데이터가 있는 카테고리는 `RESTRICT` 정책으로 실수 삭제를 방지합니다. (v6 개정)*

*앱 **초기 화면**에 **입찰 경제지표 대시보드**를 추가하였습니다. 데이터 공급자는 ECOS / EIA / IMF PCPS 3개로 고정하고, 상세 규칙은 `bid-economic-dashboard-SKILL.md`를 따릅니다. 헤더에서 대시보드와 기존 프롬프트 관리(2단·동적 카테고리)를 전환하며, 서버 측 `/api/economic/*`·지표 카탈로그/관측 캐시/원가 시나리오 테이블·환경변수 기반 API 키 관리를 명세에 포함합니다. (v7 개정)*

*기본 시드에 단계 1 **계약 품의서**와 하위 단계 2 4개를 추가하고, `샘플 데이터 입력용.md`의 에이전트 프롬프트 4건을 각 단계 2에 1건씩 넣도록 변경하였습니다. DB 리셋 시 해당 카테고리와 시드 프롬프트를 함께 복원합니다. (v8 개정)*

*단계 1 **바이브코딩툴**을 시드에서 제거하고, **대형언어모델**을 **기타**로 변경하였으며 하위 단계 2는 **도움말** 1개만 남겼습니다. (v9 개정)*

*프롬프트 관리의 **기타 > 도움말**을 열면 PromptBox 대신 **도움말 게시판**을 표시하도록 변경하였습니다. 목록·추가·삭제와 첨부 파일 업로드/다운로드를 지원하며, 글쓰기·삭제는 관리자만 가능합니다. 파일은 로컬 디스크에 저장하고 DB에는 메타만 둡니다. (v10 개정)*

*도움말 게시판 첨부파일의 **한글 파일명 깨짐**을 수정하였습니다. 업로드 시 Multer `originalname`을 Latin-1에서 UTF-8로 복원해 저장하고, 다운로드는 RFC 5987 `filename*`을 사용합니다. 데이터 저장소를 로컬 SQLite 파일에서 **PostgreSQL**로 전환하였으며, 접속은 프로세스 환경변수 **`DATABASE_URL`만** 사용하고 **`.env`에 두지 않습니다**. (v11 개정)*

*초기 시드 메뉴 표시 이름을 단계 1 **게시판**(구 기타), 단계 2 **참고 문서 모음**(구 도움말)으로 변경하였습니다. 카테고리 ID와 `viewType === 'board'` 분기는 유지합니다. (v12 개정)*

*참고 문서 모음에 **최초 시드 글**(`hp-intro`, 이용 안내)을 넣도록 변경하였습니다. 게시판이 비어 있으면 서버 기동 시 삽입하고, 관리자는 Empty State의 **첫 글 등록**으로 추가 글을 작성할 수 있습니다. (v13 개정)*
