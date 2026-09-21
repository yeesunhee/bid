# 구매 입찰 지원 시스템 - 프롬프트 보관소 (POSCO STEELEON)
## 프로젝트 명세서 및 바이브코딩 가이드라인 (PROJECT_SPECIFICATION.md)

본 문서는 **포스코스틸리온 구매 입찰 지원 시스템**을 위한 AI 프롬프트 템플릿 관리 웹 애플리케이션의 개발 사양서입니다. 타 바이브 코딩 툴(Cursor, Windsurf, Bolt, VSCode AI 등)에서도 동일한 구조와 스펙으로 프로젝트를 정확하게 복원 및 확장할 수 있도록 컴포넌트 스펙과 재생성 프롬프트를 보완하여 제작되었습니다.

> **v6 개정 사항**: 기존에 소스 코드에 고정되어 있던 **단계 1 / 단계 2 카테고리 구조를 관리자 사용자가 직접 생성·수정·삭제·정렬할 수 있는 동적 카테고리 구조**로 변경합니다. 카테고리는 SQLite DB에 저장되며, 프롬프트는 고정된 AI 툴 문자열이 아니라 단계 2 카테고리 ID를 참조합니다. 기존의 2단계 트리 UI와 프롬프트 상세보기 방식은 그대로 유지합니다.

> **v7 개정 사항**: 앱 **초기 화면(기본 진입 화면)**에 **입찰 경제지표 대시보드**를 추가합니다. 대시보드 데이터 공급자는 한국은행 ECOS, 미국 EIA, IMF PCPS **정확히 3개만** 사용하며, 상세 수집·정규화·표시·검증 규칙은 `bid-economic-dashboard-SKILL.md`를 단일 기준으로 따릅니다. 기존 프롬프트 관리(2단 레이아웃·동적 카테고리) 기능은 유지하고, 헤더 네비게이션으로 대시보드 ↔ 프롬프트 관리를 전환합니다.

> **v8 개정 사항**: 기본 시드에 단계 1 **계약 품의서**와 그 하위 단계 2 4개(계약 품의서, 예정가격 조사(컨설팅 용역), 예정가격(T/P) 산출 및 원가 검토, 입찰 진행 품의)를 추가합니다. `샘플 데이터 입력용.md`의 에이전트 프롬프트 4건을 각 단계 2에 1건씩 시드로 넣으며, 구현은 `server/seedPrompts.ts`를 따릅니다. DB 리셋 시 이 카테고리·프롬프트도 함께 복원합니다.

> **v9 개정 사항**: 단계 1 **바이브코딩툴**과 그 하위 단계 2(VSCODE, 제미나이CLI, Cursor AI)를 시드에서 제거합니다. 단계 1 **대형언어모델**의 표시 이름을 **기타**로 바꾸고, 하위 단계 2는 **도움말**(기존 GPT) 1개만 남깁니다. 제미나이·클로드는 시드에서 제외합니다.

---

## 1. 프로젝트 개요 (Overview)

- **앱 이름**: 구매 입찰 지원 시스템 - 프롬프트 관리자
- **주요 목적**:
  1. **(신규, 초기 화면)** 입찰·견적 산정에 필요한 거시경제·원자재 지표를 한 화면에서 추적하고, 원가 상승 압력과 투찰 리스크를 판단할 수 있는 **입찰 경제지표 대시보드** 제공
  2. 구매 및 입찰 업무 담당자가 품의·원가 검토 등 업무 프롬프트 및 에이전트를 손쉽게 조회, 개별 항목 복사, 생성, 관리(CRUD)할 수 있는 웹 플랫폼 구축
- **데이터 저장 방식**: **로컬 SQLite 파일 DB** (`server/data/posco_prompts.db`)를 사용합니다. 프론트엔드(React)는 로컬에서 함께 구동되는 경량 백엔드(Node.js/Express API 서버)를 통해 DB에 접근하며, 브라우저 저장소(localStorage)에는 프롬프트/카테고리 데이터를 두지 않습니다. 별도의 외부 DB 서버나 클라우드 인프라 없이, 개발자 PC/사내 서버에서 `npm run dev` 한 번으로 프론트+백엔드+DB가 함께 기동되는 것을 원칙으로 합니다.
- **화면 구성 (v7)**:
  - **기본 진입 화면**: 입찰 경제지표 대시보드 (`EconomicDashboard`)
  - **프롬프트 관리 화면**: 기존과 동일하게 **좌측 사이드바 + 우측 상세보기의 2단(2-Column) 구성**. 사이드바와 상세보기 사이에 별도의 "프롬프트 목록" 중간 패널은 두지 않습니다. (하단 5장 참고)
  - 상단 헤더에서 **경제지표 / 프롬프트 관리**를 전환합니다.

### 대시보드 핵심 질문 (제품 목표)

대시보드의 목표는 지표를 많이 나열하는 것이 아니라, 다음 질문에 답하는 것입니다.

> 현재 시장환경을 기준으로 이 입찰의 원가는 얼마나 변하고 있으며, 그 변화의 가장 큰 원인은 무엇인가?

상세 지표 카탈로그·계산·장애 처리·Acceptance Criteria는 **`bid-economic-dashboard-SKILL.md`**를 따릅니다. 본 명세는 그 Skill을 본 프로젝트(React/Vite + Express + SQLite)에 어떻게 배치할지에 대한 **통합 개발 사양**입니다.

---

## 2. 기술 스택 (Tech Stack)

| 구분 | 기술 / 라이브러리 |
| :--- | :-------------------- |
| **Framework** | React 18, Vite |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS (Dark Mode 컨셉 `#080E18` / `#0f172a` 배경) |
| **Icons** | Lucide React (`Bot`, `FileText`, `Terminal`, `Copy`, `Check`, `ShieldAlert`, `LayoutDashboard`, `TrendingUp` 등) |
| **Charts (대시보드)** | 기존 프로젝트에 맞는 경량 차트 라이브러리 (예: Recharts). 새 UI 프레임워크를 도입하지 않음 |
| **State** | React Context + Custom Hook (`usePromptStore`, `useEconomicDashboard` 등 — 내부적으로 API 클라이언트 호출) |
| **Backend** | Node.js + Express 기반 로컬 API 서버 (`/api/prompts`, `/api/auth`, `/api/categories/*`, `/api/economic/*` 등) |
| **Database** | **SQLite** — `node:sqlite`의 `DatabaseSync` API (`better-sqlite3` / `sqlite3` 네이티브 패키지 사용 금지). 최소 Node.js **22.5 이상** |
| **Persistence** | 로컬 SQLite DB 파일 (`server/data/posco_prompts.db`). 브라우저 localStorage에 업무 데이터를 두지 않음 |
| **External APIs (대시보드)** | 한국은행 ECOS, U.S. EIA Open Data API v2, IMF PCPS (SDMX) — **이 3개만** 사용 |
| **Secrets** | 서버 환경변수 (`ECOS_API_KEY`, `EIA_API_KEY` 등). 클라이언트·Git·로그에 키 노출 금지 |

---

## 3. 2단계 카테고리 아키텍처 (Category Hierarchy)

시스템은 **2단계 위계 구조**를 유지하되, 단계의 이름과 항목을 소스 코드에 고정하지 않습니다. 관리자 사용자가 **단계 1과 단계 2를 직접 생성·수정·삭제·정렬**할 수 있으며, 변경 결과는 즉시 SQLite DB에 저장되고 좌측 사이드바에 반영됩니다. 개별 프롬프트는 트리의 3번째 단계로 노출하지 않고, 우측 상세보기 상단의 **프롬프트 선택 탭**에서 고릅니다.

> 경제지표 대시보드의 지표 카테고리(`inflation`, `fx`, `interest_rate` 등)는 아래 프롬프트용 단계 1/단계 2와 **별개**입니다. 혼동하지 않습니다.

### 기본 시드 데이터
최초 실행 시 아래 구조를 기본값으로 생성하지만, 이후에는 관리자 화면에서 자유롭게 변경할 수 있습니다. 표시 순서는 **계약 품의서 → 기타** 입니다.

### **[단계 1] 계약 품의서**
구매·입찰 품의 에이전트. 각 단계 2에는 `샘플 데이터 입력용.md`의 해당 프롬프트 **1건**을 시드로 넣습니다. 단계 2당 프롬프트가 1개이므로 우측 PromptBox에는 전환 탭이 표시되지 않습니다.

1. **계약 품의서**: 입찰결과를 반영해 최종 계약 체결용 계약 품의서 초안을 작성합니다
2. **예정가격 조사(컨설팅 용역)**: 용역 계약 문서를 분석해 예정가격 조사서 비교표를 정리하고 검토가를 산출합니다
3. **예정가격(T/P) 산출 및 원가 검토**: 공사·구매 내역과 업체 견적을 바탕으로 예정가격(T/P)과 원가 검토 보고서를 작성합니다
4. **입찰 진행 품의**: 구매요청 품의서·사양서 등 첨부자료를 분석해 입찰 진행 품의 초안을 작성합니다

### **[단계 1] 기타**
사용 안내 등 업무 품의 외 항목. 하위 단계 2는 **1개만** 둡니다.

1. **도움말**: 사용 안내 및 기타 도움말 프롬프트

> **시드 프롬프트**: `샘플 데이터 입력용.md`의 4개 에이전트 프롬프트를 단계 1 `계약 품의서` 하위 단계 2에 각각 1건씩 삽입합니다 (`server/seedPrompts.ts`). 구 샘플(`견적 비교 요약`, `규격서 핵심 요구사항 추출` 등)은 시드에 넣지 않습니다. 단계 1 `기타` / 단계 2 `도움말`에는 기본 프롬프트를 넣지 않으며, 관리자가 추가로 생성할 수 있습니다. 단계 1 `바이브코딩툴`과 제미나이·클로드·VSCODE·제미나이CLI·Cursor AI는 시드에 포함하지 않습니다.

### 동적 단계 관리 규칙
- **단계 1 생성**: 관리자가 단계 1 이름과 표시 순서를 지정하여 새 대분류를 추가할 수 있습니다.
- **단계 1 수정**: 이름 및 표시 순서를 변경할 수 있으며, 하위 단계 2와 프롬프트 연결 관계는 유지됩니다.
- **단계 1 삭제**: 하위 단계 2가 존재하는 단계 1은 즉시 삭제하지 않습니다. 먼저 하위 단계 2를 다른 단계 1로 이동하거나 삭제한 뒤 삭제할 수 있도록 제한합니다.
- **단계 2 생성**: 반드시 하나의 단계 1 아래에 생성하며, 이름·설명·표시 순서를 관리할 수 있습니다.
- **단계 2 수정**: 이름·설명·표시 순서뿐 아니라 소속 단계 1도 변경할 수 있습니다. 소속을 변경해도 연결된 프롬프트는 함께 이동합니다.
- **단계 2 삭제**: 연결된 프롬프트가 존재하는 단계 2는 즉시 삭제하지 않습니다. 프롬프트를 다른 단계 2로 이동하거나 삭제한 뒤 삭제할 수 있도록 제한합니다.
- **정렬**: 단계 1끼리, 동일 단계 1 내부의 단계 2끼리 표시 순서를 변경할 수 있어야 하며, 저장된 순서대로 사이드바에 표시합니다.
- **이름 중복**: 동일한 부모 아래에서는 같은 이름의 단계 2를 허용하지 않습니다. 단계 1 이름도 중복 생성하지 않는 것을 기본 규칙으로 합니다.
- **최소 구조**: 카테고리가 모두 삭제되어도 애플리케이션이 오류 없이 빈 상태(Empty State)를 표시해야 하며, 관리자는 빈 상태에서 새 단계 1부터 다시 생성할 수 있어야 합니다.

---

## 4. 핵심 데이터 구조 (`/src/types/index.ts`)

기존처럼 `AIToolType`을 고정 문자열 유니언으로 관리하지 않습니다. **단계 1 / 단계 2는 별도의 카테고리 데이터로 관리**하고, 각 프롬프트는 자신이 속한 **단계 2 카테고리의 ID**를 참조합니다. 실제 구현 시 아래 개념 구조를 기준으로 프론트엔드 타입과 SQLite 테이블을 매핑합니다.

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

### 4.1 앱 뷰 모드 (v7)

```typescript
export type AppViewMode = 'dashboard' | 'prompts';
```

- 앱 최초 로드 시 기본값은 **`'dashboard'`** 입니다.
- 헤더 네비게이션으로 `'prompts'`로 전환하면 기존 2단 프롬프트 관리 화면을 표시합니다.

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
- **프롬프트 관리 화면**: `AppViewMode === 'prompts'` → 기존 좌측 `CategoryTree.tsx` + 우측 `PromptBox.tsx` 2단 레이아웃을 렌더링합니다.
- 대시보드 뷰에서는 프롬프트용 사이드바 트리를 숨기거나 접어, 대시보드가 첫 화면의 주 콘텐츠가 되도록 합니다.

### 1) 좌측 사이드바 (`CategoryTree.tsx`)
- **표시 조건**: 프롬프트 관리 뷰(`prompts`)에서만 필수
- **2단계 트리 메뉴**: DB에 저장된 단계 1 → 단계 2 구조를 동적으로 렌더링하며, 특정 카테고리 이름을 소스 코드에 고정하지 않음
- **단계 2(AI 툴) 노드 클릭 시**: 해당 툴에 속한 프롬프트 중 **첫 번째 항목이 즉시 우측 `PromptBox.tsx`에 표시**됨 (별도의 중간 목록 패널 없이 바로 상세보기로 연결)
- 해당 툴에 프롬프트가 2개 이상이면, 나머지 항목은 사이드바가 아니라 **`PromptBox.tsx` 상단의 프롬프트 선택 탭**에서 전환 (하단 3) 참고)
- 사이드바 접기/펼치기 지원
- 검색바(`searchQuery`)로 검색 시: 매칭되는 프롬프트가 속한 단계 2(AI 툴) 노드를 강조 표시하고, 검색어와 가장 먼저 일치하는 프롬프트를 우측 `PromptBox.tsx`에 자동으로 띄워줌

### 2) 상단 헤더 (`MainLayout.tsx`)
- 포스코스틸리온 아이콘 및 시스템 타이틀
- **(v7)** `경제지표` / `프롬프트 관리` 뷰 전환
- 실시간 키워드 검색바 (`searchQuery`) — 프롬프트 관리 뷰에서 사용
- **[관리자 로그인]** 버튼 (비밀번호 인증 모달 호출)

### 3) 메인 내용 보기 핵심 컴포넌트 (`PromptBox.tsx`) - ★ 핵심 필수 사양
**프롬프트 관리 화면**은 좌측 사이드바(`CategoryTree.tsx`)와 우측 `PromptBox.tsx` 2개 영역으로만 구성되는 2단(2-Column) 레이아웃입니다. 두 영역 사이에 프롬프트 목록을 보여주는 별도의 중간 패널(예: `PromptList.tsx` 등)은 두지 않습니다.

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
  6. 연결된 프롬프트가 없는 단계 2 삭제
- **삭제 보호**: 단계 삭제 시 하위 단계 또는 연결 프롬프트 개수를 표시하고, 데이터가 연결되어 있으면 삭제 버튼을 비활성화하거나 이동/정리 필요 안내를 표시하여 실수로 연쇄 삭제되지 않도록 함
- **프롬프트 편집 항목**:
  1. 제목 & DB에서 조회한 단계 2 선택
  2. **1. 에이전트 이름** 편집 input
  3. **2. 에이전트 설명** 편집 input
  4. **3. 프롬프트 복사용 원문 (본문 내용)** 편집 textarea
- **즉시 반영**: 단계 및 프롬프트의 추가/삭제/수정/순서 변경은 로컬 API 서버를 통해 **즉시 SQLite DB에 반영(commit)**되며, 성공 후 사이드바와 선택 상태를 다시 동기화
- **초기화**: "DB 초기 데이터로 리셋" 기능은 단계 1/단계 2 구조와 `샘플 데이터 입력용.md` 기준 시드 프롬프트 4건을 기본 시드 상태로 복원합니다. 관리자가 추가한 프롬프트는 삭제됩니다. 경제지표 캐시/원가 모델 설정의 리셋 범위는 별도 명시합니다 (하단 8장 참고).

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

## 6. 로컬 DB 및 API 설계 (Local Database & API) — v5 신규 / v7 확장

기존 `localStorage` 방식을 대체하는 **로컬 경량 DB 아키텍처**입니다. 외부 클라우드 DB(Supabase, Firebase 등)나 별도 DB 서버 설치 없이, 프로젝트 폴더 내에서 완전히 자족적으로(self-contained) 동작하는 것을 원칙으로 합니다.

### 1) DB 선택: SQLite
- **엔진**: SQLite
- **Node.js 연동 방식**: Node.js 기본 제공 모듈인 `node:sqlite`의 `DatabaseSync` API 사용
- **최소 Node.js 버전**: **Node.js 22.5 이상**
- **외부 SQLite 네이티브 패키지 사용 금지**:
  - `better-sqlite3` 사용 금지
  - `sqlite3` 사용 금지
  - SQLite 연결을 위해 `node-gyp`, Python, Visual Studio C++ Build Tools 설치를 요구하는 구조로 만들지 않음
- **파일 위치**: `/server/data/posco_prompts.db`
- DB 파일이 없으면 서버 최초 실행 시 자동 생성
- SQLite 파일은 프로젝트 내부에 저장하되 Git에는 포함하지 않고 `.gitignore` 처리
- 외부 DB 서버(MySQL/PostgreSQL), Docker, 클라우드 DB 없이 단독 실행 가능해야 함
- **장점**: 네이티브 npm 모듈 설치 실패 위험을 줄이고, Windows 환경에서도 별도 C/C++ 컴파일 도구 없이 설치와 실행이 가능함

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
  value REAL NOT NULL,
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
  base_cost REAL,
  base_fx REAL,
  weights_json TEXT NOT NULL,      -- 원가 항목별 비중·연결 지표
  risk_weights_json TEXT,          -- Risk Score 가중치(선택)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

- `mapping_json`에는 Skill §5–7에 정의된 provider별 필수 메타데이터(ECOS 통계표/항목 코드, EIA route/facet, IMF series_key 등)를 저장합니다.
- 파생 지표(변화율·평균·스프레드·KRW effect·Risk)는 **요청 시 계산**하거나 별도 파생 캐시 테이블에 둘 수 있으나, 원본 관측과 반드시 구분합니다.
- 외래키 삭제 정책은 `RESTRICT`를 기본으로 하여, 하위 데이터가 있는 카테고리가 실수로 연쇄 삭제되지 않도록 합니다.
- 단계 이동은 ID를 유지한 채 `parent_id`만 변경하고, 프롬프트 이동은 `category_level2_id`를 변경합니다.
- `sort_order`는 관리자 화면의 정렬 결과를 저장하는 용도로 사용합니다.

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
| GET | `/api/categories/level2` | 단계2 전체 조회, `?parentId=` 필터 지원 |
| POST | `/api/categories/level2` | 단계2 생성 (관리자 인증 필요) |
| PUT | `/api/categories/level2/:id` | 단계2 이름/설명/부모/순서 수정 (관리자 인증 필요) |
| DELETE | `/api/categories/level2/:id` | 프롬프트가 없는 단계2 삭제 (관리자 인증 필요) |
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

- **프론트엔드 연동**:
  - `usePromptStore`: 프롬프트·단계 1/2 CRUD/정렬 (기존)
  - `useEconomicDashboard`(권장): `/api/economic/*`를 호출해 요약·섹션 데이터·원가 모델 상태를 관리
  - `CategoryTree.tsx`는 API에서 받은 카테고리 배열을 기준으로 트리를 구성하며, 특정 AI 툴 이름이나 개수를 하드코딩하지 않습니다.
- **갱신 원칙** (Skill §18): 화면 요청마다 외부 API를 직접 치지 않고 서버 캐시를 우선 사용합니다.
  - ECOS 일간 → 영업일 기준 정기 갱신
  - ECOS 월간 / IMF PCPS → 일 1회 확인 수준으로 충분
  - EIA → 해당 frequency에 맞춰 갱신
  - 캐시에도 `fetched_at`과 원본 기준시점을 유지합니다.

### 4) 초기 데이터(시드) 및 마이그레이션
- 최초 실행 시 DB 파일이 없으면 서버가 자동으로 테이블을 생성하고, **기본 단계 1/단계 2 카테고리와 시드 프롬프트**를 삽입합니다.
- **(v8)** 단계 1 `계약 품의서`와 하위 단계 2 4개, 그리고 `샘플 데이터 입력용.md`의 에이전트 프롬프트 4건(`server/seedPrompts.ts`)을 시드로 넣습니다. 각 단계 2에는 프롬프트 1건만 연결합니다. 구 샘플(`견적 비교 요약`, `규격서 핵심 요구사항 추출` 등)은 넣지 않습니다.
- **(v9)** 단계 1은 `계약 품의서`와 `기타`만 시드합니다. `기타`의 단계 2는 `도움말` 1개만 둡니다. `바이브코딩툴` 및 GPT 외 대형언어모델 단계 2(제미나이, 클로드)는 시드에서 제거합니다. `도움말`에는 기본 프롬프트를 넣지 않습니다.
- **(v7)** 경제지표 카탈로그는 MVP 지표 목록을 시드로 넣되, **실제 통계표/시리즈 코드는 공식 메타데이터 확인 후에만** `mapping_json`에 확정 기록합니다. 확인 전 placeholder를 active=0으로 둘 수 있습니다.
- 기존 `localStorage`(`posco_prompt_templates_v4`) 데이터가 남아있는 사용자를 위해, 최초 접속 시 브라우저에 저장된 데이터를 감지하여 1회성으로 DB에 가져오는(import) 마이그레이션 유틸리티를 제공할 수 있습니다(선택 사항).
- `/api/prompts/reset`은 **카테고리 시드와 시드 프롬프트 4건**을 복원합니다. 관리자가 추가한 프롬프트는 삭제됩니다. 경제지표 관측 캐시·원가 시나리오는 유지하며, 그 리셋이 필요하면 별도 관리자 동작 또는 별도 엔드포인트로 분리합니다.

### 5) 보안·환경변수 (v7)
- `ECOS_API_KEY`, `EIA_API_KEY` (및 IMF가 별도 인증을 요구하는 환경이면 해당 Secret)는 `.env` 등 서버 측에서만 로드
- `.env`는 Git에 커밋하지 않음
- 인증키를 로그에 출력하지 않음
- 프론트 빌드 결과물에 키가 포함되지 않도록 함

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

---

## 9. 바이브코딩 툴용 재생성 프롬프트 (Prompt for Regeneration)

다른 바이브코딩 툴(Cursor, Windsurf, Bolt 등)에서 이 프로젝트를 새로 생성할 때는 **반드시 아래 프롬프트**를 전달하여 실행하세요:

```text
[요청]
포스코스틸리온 구매 입찰 지원 시스템을 위한 웹 앱을 구축해줘.
앱은 (1) 초기 화면의 입찰 경제지표 대시보드와 (2) 프롬프트/에이전트 관리 플랫폼으로 구성된다.
경제지표 대시보드의 상세 규칙(공급자·지표·계산·장애 처리·Acceptance Criteria)은 프로젝트의 bid-economic-dashboard-SKILL.md를 따른다.

[초기 화면 — 경제지표 대시보드]
- 앱 최초 로드 시 기본 화면은 경제지표 대시보드다.
- 상단 헤더에서 '경제지표'와 '프롬프트 관리'를 전환할 수 있게 한다.
- 대시보드 섹션 순서: Executive Summary → Inflation(PPI/CPI) → FX(USD/KRW) → Commodities(WTI/Brent/Gas + Copper/Aluminum/Nickel/Zinc) → Interest Rates → Bid Cost Model
- 외부 데이터 공급자는 한국은행 ECOS, U.S. EIA, IMF PCPS 정확히 3개만 사용한다. 제4 API·스크래핑·LLM 수치 생성을 하지 말 것
- API 키는 서버 환경변수(ECOS_API_KEY, EIA_API_KEY)로만 주입하고 브라우저에 노출하지 말 것
- 모든 카드에 공급자명과 기준일/기준월을 표시할 것. 결측/장애 시 0으로 채우지 말고 N/A·stale·Partial을 구분할 것
- 월간 지표와 일간 지표를 실시간처럼 섞어 보이지 말 것
- Bid Cost Model에서 원가 비중 입력·항목별 영향도·총 원가 변화율·Risk Level을 제공할 것. 비중 합이 100%가 아니면 자동 수정하지 말고 경고할 것

[프롬프트 관리 — 2단(2-Column) 구성]
'프롬프트 관리' 뷰에서 전체 화면은 반드시 '좌측 사이드바' + '우측 상세보기(PromptBox.tsx)'의 2단 구성이어야 한다. 사이드바와 상세보기 사이에 프롬프트 목록을 나열하는 별도의 중간 패널은 절대 만들지 마세요. 좌측 사이드바는 **DB에서 조회한 단계 1 → 단계 2의 2단계 트리**로만 구성하고, 카테고리 이름이나 개수를 소스 코드에 고정하지 마세요. 개별 프롬프트 제목은 트리에 넣지 마세요. 단계 2 노드를 클릭하면 그 단계에 속한 첫 번째 프롬프트가 즉시 우측 PromptBox.tsx에 표시되고, 같은 단계 2에 프롬프트가 여러 개 있으면 PromptBox.tsx 상단에 프롬프트 제목을 가로 탭/칩으로 나열해 그 안에서 전환할 수 있게 하세요 (프롬프트가 1개뿐이면 탭 없이 카드만 표시).

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

[스택 및 저장소]
- Frontend: React 18, Vite, TypeScript, Tailwind CSS (Dark Mode #080E18), Lucide React, 경량 차트 라이브러리
- Backend: Node.js + Express 기반 로컬 API 서버 (프론트엔드와 함께 로컬에서 기동). 외부 경제 API는 서버에서만 호출
- Database: **SQLite** (`node:sqlite` DatabaseSync, Node.js 22.5+) 파일 DB (`server/data/posco_prompts.db`)로 영속 저장. better-sqlite3/sqlite3 네이티브 패키지 사용 금지. 브라우저 localStorage는 업무 데이터에 사용하지 않음
- 프롬프트 CRUD는 `/api/prompts`, 단계 1/2 CRUD는 `/api/categories/level1`, `/api/categories/level2`, 경제지표는 `/api/economic/*`, 관리자 인증은 `/api/auth/login`

[카테고리 구조 (동적 2단계, 개별 프롬프트는 트리에 넣지 않음)]
- 최초 시드 단계 1: **계약 품의서**, **기타**. 바이브코딩툴·대형언어모델 라벨은 사용하지 말 것
- 계약 품의서 하위 단계 2: 계약 품의서 / 예정가격 조사(컨설팅 용역) / 예정가격(T/P) 산출 및 원가 검토 / 입찰 진행 품의
- 기타 하위 단계 2: **도움말** 1개만. 제미나이·클로드·VSCODE·제미나이CLI·Cursor AI는 시드에 넣지 말 것
- `샘플 데이터 입력용.md`의 4개 에이전트 프롬프트를 계약 품의서 하위 단계 2에 각각 1건씩 시드로 넣을 것 (`server/seedPrompts.ts`). 구 샘플(견적 비교 요약 등)은 넣지 말 것. 도움말에는 기본 프롬프트를 넣지 말 것
- 카테고리 시드를 프론트엔드 코드에 고정값으로 취급하지 말 것. DB에서 조회한 배열로 트리를 구성할 것
- 관리자가 단계 1을 직접 생성, 이름 수정, 표시 순서 변경, 삭제할 수 있게 할 것
- 관리자가 각 단계 1 아래의 단계 2를 직접 생성, 이름/설명 수정, 소속 단계 1 변경, 표시 순서 변경, 삭제할 수 있게 할 것
- 단계 1/2의 ID는 이름과 분리하여 유지하고, 프롬프트는 단계 2 ID를 참조하게 할 것
- 하위 단계가 있는 단계 1 및 연결 프롬프트가 있는 단계 2는 바로 삭제하지 못하게 RESTRICT하고, 먼저 이동/정리하도록 안내할 것
- 모든 카테고리 이름과 개수를 프론트엔드 코드에 하드코딩하지 말 것

[관리자 기능]
- 비밀번호 인증 관리자 모달
- 관리자 화면에 `단계 관리`와 `프롬프트 관리` 기능 제공
- 단계 관리에서 단계 1/단계 2 생성·수정·삭제·정렬 및 단계 2의 부모 단계 이동 지원
- 프롬프트 관리에서 DB에 존재하는 단계 2를 선택하여 프롬프트를 생성/이동하고, 1) 에이전트 이름, 2) 에이전트 설명, 3) 프롬프트 복사용 원문(본문)을 직접 편집 및 저장할 수 있게 할 것
- 카테고리가 0개인 경우에도 오류 없이 빈 상태를 보여주고, 관리자가 새 단계 1부터 생성할 수 있게 할 것
```

---

*본 문서는 구매 입찰 지원 시스템 사양서에서 불필요한 PromptFramework 항목을 제거하고 3대 필드(에이전트 이름, 에이전트 설명, 프롬프트) 중심으로 간결하게 정돈되었습니다. (v2 개정) 화면 레이아웃은 '사이드바 + 중간 목록 + 상세보기'의 3단 분할에서, 중간 목록 패널을 제거한 '사이드바 + 상세보기'의 2단 분할 구성으로 단순화하였습니다. 이후 사이드바 트리는 개별 프롬프트 리프 노드를 넣지 않는 **2단계 트리**로 유지하고, 같은 AI 툴에 여러 프롬프트가 있을 경우의 선택은 `PromptBox.tsx` 상단의 **탭/칩 선택 UI**로 처리하도록 재조정하였습니다. (v3 개정)*

*데이터 저장 방식을 브라우저 `localStorage`에서 **로컬 SQLite 파일 DB + 로컬 Node.js/Express API 서버** 조합으로 전환하였습니다. 이를 통해 브라우저 저장소 용량 제한, 브라우저별/기기별 데이터 분리, 캐시 삭제 시 데이터 소실 등의 문제를 해소하고, 실제 DB 파일 단위의 백업·이전이 가능해졌습니다. (v5 개정)*

*기존에 소스 코드의 고정 값으로 정의하던 단계 1/단계 2 구조를 **SQLite 기반 동적 카테고리 데이터**로 전환하였습니다. 관리자는 단계 1과 단계 2를 직접 생성·수정·삭제·정렬할 수 있으며, 단계 2의 소속 단계 1 변경도 가능합니다. 프롬프트는 고정 AI 툴 문자열 대신 단계 2 ID를 참조하고, 연결 데이터가 있는 카테고리는 `RESTRICT` 정책으로 실수 삭제를 방지합니다. (v6 개정)*

*앱 **초기 화면**에 **입찰 경제지표 대시보드**를 추가하였습니다. 데이터 공급자는 ECOS / EIA / IMF PCPS 3개로 고정하고, 상세 규칙은 `bid-economic-dashboard-SKILL.md`를 따릅니다. 헤더에서 대시보드와 기존 프롬프트 관리(2단·동적 카테고리)를 전환하며, 서버 측 `/api/economic/*`·지표 카탈로그/관측 캐시/원가 시나리오 테이블·환경변수 기반 API 키 관리를 명세에 포함합니다. (v7 개정)*

*기본 시드에 단계 1 **계약 품의서**와 하위 단계 2 4개를 추가하고, `샘플 데이터 입력용.md`의 에이전트 프롬프트 4건을 각 단계 2에 1건씩 넣도록 변경하였습니다. DB 리셋 시 해당 카테고리와 시드 프롬프트를 함께 복원합니다. (v8 개정)*

*단계 1 **바이브코딩툴**을 시드에서 제거하고, **대형언어모델**을 **기타**로 변경하였으며 하위 단계 2는 **도움말** 1개만 남겼습니다. (v9 개정)*
