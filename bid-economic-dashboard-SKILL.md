---
name: bid-economic-dashboard
description: 한국 입찰 원가 예측용 경제지표 대시보드를 설계하거나 구현할 때 사용하는 Cursor Agent Skill. 데이터 공급자를 한국은행 ECOS, 미국 EIA, IMF PCPS의 정확히 3개로 제한하고 PPI, CPI, 환율, 시장금리, 원유, 비철금속 및 파생 원가 리스크 지표의 수집·정규화·표시·검증 규칙을 정의한다. 관련 데이터 모델, API 연동, 대시보드 UI, 원가 영향도 계산, 품질 점검, 운영 정책을 설계할 때 적용한다.
---

# 입찰 경제지표 대시보드 Skill

## 1. 목적

한국 기업의 입찰 및 견적 산정에 필요한 거시경제·원자재 지표를 한 화면에서 추적하고, 원가 상승 압력과 투찰 리스크를 판단할 수 있는 대시보드를 만든다.

이 Skill은 구현 방법을 지시하는 명세다. 특정 프레임워크나 프로그래밍 언어를 강제하지 않는다.

핵심 원칙은 다음과 같다.

- 외부 데이터 공급자는 정확히 3개만 사용한다.
- 한국은행 ECOS를 국내 경제지표의 단일 기본 소스로 사용한다.
- 미국 EIA를 에너지 원자재의 기본 소스로 사용한다.
- IMF PCPS를 국제 비철금속 및 기타 주요 원자재의 기본 소스로 사용한다.
- KOSIS, 한국수출입은행, FRED, LME, Investing.com, Yahoo Finance 등 제4의 데이터 공급자를 자동으로 추가하지 않는다.
- 데이터가 부족하더라도 임의의 공급자를 추가하지 말고 먼저 사용자에게 제한사항을 명확히 알린다.
- API 키, 실제 운영 비밀값, 사용자 자격증명은 소스코드나 문서에 하드코딩하지 않는다.

---

## 2. 고정 API 공급자

### Provider A — 한국은행 ECOS

공식 서비스:
- 한국은행 경제통계시스템 ECOS Open API
- https://ecos.bok.or.kr/api/

담당 데이터:
- 생산자물가지수 PPI
- 소비자물가지수 CPI
- 원/달러 환율
- 필요 시 원/엔, 원/유로, 원/위안 환율
- 한국은행 기준금리
- CD 91일
- 국고채 3년
- 국고채 5년
- 국고채 10년
- 회사채 3년 AA- 등 시장금리
- 수입물가지수
- 국내 철강 등 품목별 생산자물가지수

역할:
- 국내 거시지표와 금융지표의 단일 기준 소스로 사용한다.
- 동일하거나 유사한 지표를 다른 API에서 중복 수집하지 않는다.

### Provider B — U.S. EIA

공식 서비스:
- U.S. Energy Information Administration Open Data API v2
- https://www.eia.gov/opendata/
- https://www.eia.gov/opendata/documentation.php

담당 데이터:
- WTI 원유
- Brent 원유
- 천연가스
- 필요 시 디젤·석유제품 등 에너지 계열 지표

역할:
- 에너지 원자재 가격의 기준 소스로 사용한다.
- API v2를 기준으로 한다.
- API 키가 필요하다는 전제로 설계한다.

### Provider C — IMF PCPS

공식 서비스:
- IMF Primary Commodity Price System
- https://data.imf.org/Datasets/PCPS
- https://www.imf.org/en/research/commodity-prices
- https://data.imf.org/en/Resource-Pages/IMF-API

담당 데이터:
- Copper
- Aluminum
- Nickel
- Zinc
- Lead
- Tin
- 필요 시 IMF PCPS가 제공하는 기타 국제 원자재

역할:
- 국제 비철금속 및 주요 원자재 가격의 기준 소스로 사용한다.
- IMF Data API의 SDMX 인터페이스를 기준으로 한다.
- PCPS의 기본 업데이트 주기가 월간임을 고려한다.

---

## 3. 절대 제약사항

다음 조건을 항상 지킨다.

1. 외부 API 공급자는 ECOS, EIA, IMF 3개만 사용한다.
2. 새로운 데이터 공급자를 발견하더라도 자동으로 추가하지 않는다.
3. 화면에 표시되는 모든 지표는 원본 공급자를 식별할 수 있어야 한다.
4. 원본 값과 계산된 값을 구분한다.
5. 원본 API가 제공하지 않는 값은 추정값임을 명시한다.
6. 서로 다른 주기의 데이터를 같은 날짜의 실시간 데이터처럼 보이게 하지 않는다.
7. 월간 지표는 최신 발표월을 기준으로 표시한다.
8. 일간 지표는 최근 영업일을 기준으로 표시한다.
9. 휴일·주말·결측치는 0으로 채우지 않는다.
10. API 장애 시 마지막 정상값을 표시할 수 있으나 반드시 데이터 기준 시각을 함께 표시한다.
11. 통계표 코드나 항목 코드는 추측하지 않는다.
12. ECOS 통계표/항목 코드는 공식 ECOS 메타데이터에서 확인한 뒤 매핑한다.
13. EIA route/facet/series는 공식 API 메타데이터에서 확인한 뒤 매핑한다.
14. IMF PCPS series key는 공식 IMF SDMX 데이터 구조에서 확인한 뒤 매핑한다.
15. 생산 환경에서 인증키를 로그에 출력하지 않는다.

---

## 4. 핵심 지표 카탈로그

### 4.1 생산자물가지수 PPI

공급자:
- ECOS

목적:
- 국내 공급 단계의 가격 상승 압력을 파악한다.
- 입찰 시 향후 재료비 및 제조원가 상승 가능성을 판단한다.

필수 표시값:
- 최신 PPI 지수
- 전월 대비 변화율
- 전년 동월 대비 변화율
- 3개월 변화율
- 6개월 변화율
- 12개월 추세

가능하면 추가:
- 철강 관련 품목 PPI
- 금속 관련 품목 PPI
- 화학 관련 품목 PPI
- 전기·전자 관련 품목 PPI
- 기계 관련 품목 PPI

전체 PPI보다 실제 입찰 품목과 가까운 세부 품목 지수를 우선적으로 활용한다.

### 4.2 소비자물가지수 CPI

공급자:
- ECOS

목적:
- 전반적인 인플레이션 수준과 최종 소비 단계의 비용 압력을 확인한다.

필수 표시값:
- 최신 CPI
- 전월 대비 변화율
- 전년 동월 대비 변화율
- 최근 12개월 추세

CPI는 직접 재료비보다는 전반적인 비용 환경을 보여주는 보조지표로 취급한다.

### 4.3 환율

공급자:
- ECOS

기본 통화:
- USD/KRW

선택 통화:
- JPY/KRW
- EUR/KRW
- CNY/KRW

필수 표시값:
- 최근 값
- 1개월 평균
- 3개월 평균
- 6개월 평균
- 1개월 변화율
- 3개월 변화율
- 기준환율 대비 변화율

환율은 수입 원자재·해외 부품 원가와 직접 연결되는 핵심 지표로 취급한다.

### 4.4 시장금리

공급자:
- ECOS

기본 지표:
- 한국은행 기준금리
- CD 91일
- 국고채 3년
- 회사채 3년 AA-

선택 지표:
- 국고채 5년
- 국고채 10년

필수 표시값:
- 최신 금리
- 1개월 변화
- 3개월 변화
- 최근 12개월 추세

파생지표:
- 회사채 AA- 3년 - 국고채 3년 스프레드

목적:
- 조달 비용 증가 압력
- 장기 계약의 금융비용 리스크
- 기업 신용 스프레드 변화

### 4.5 원유 및 에너지

공급자:
- EIA

기본 지표:
- WTI
- Brent
- Natural Gas

필수 표시값:
- 최신 값
- 30일 평균
- 90일 평균
- 1개월 변화율
- 3개월 변화율
- 최근 12개월 추세

EIA 데이터의 실제 빈도가 지표별로 다를 수 있으므로 API 메타데이터의 frequency를 기준으로 처리한다.

### 4.6 비철금속

공급자:
- IMF PCPS

기본 지표:
- Copper
- Aluminum
- Nickel
- Zinc

선택 지표:
- Lead
- Tin

필수 표시값:
- 최신 값
- 전월 대비 변화율
- 3개월 변화율
- 6개월 변화율
- 12개월 변화율
- 최근 24개월 추세

IMF PCPS의 월간 주기를 고려하여 일간 데이터처럼 보간하지 않는다.

### 4.7 철강

별도의 네 번째 API를 추가하지 않는다.

대신 ECOS 안에서 다음 조합을 사용한다.

- 국내 철강 관련 생산자물가지수
- 철강 또는 금속 관련 수입물가지수
- USD/KRW

철강 원가 리스크는 위 세 요소를 조합해 판단한다.

국제 철강 현물가격이 반드시 필요한 경우 이 Skill의 3-provider 제약으로는 충족되지 않는다는 점을 사용자에게 명시한다.

---

## 5. ECOS 데이터 매핑 규칙

ECOS 통계코드를 기억이나 예시에서 가져와 고정하지 않는다.

다음 순서로 처리한다.

1. ECOS 공식 Open API의 통계표 목록 또는 검색 기능에서 대상 통계표를 찾는다.
2. 해당 통계표의 항목 목록을 조회한다.
3. 통계항목명, 단위, 주기, 수록기간을 확인한다.
4. 실제 필요한 항목을 선택한다.
5. 선택된 통계표 코드와 항목 코드를 프로젝트의 데이터 카탈로그에 기록한다.
6. 운영 중 코드가 바뀌거나 단종됐을 때 원인을 알 수 있도록 지표명도 함께 저장한다.

각 ECOS 매핑에는 최소한 다음 메타데이터를 유지한다.

- provider = ECOS
- indicator_key
- display_name_ko
- statistic_table_code
- statistic_table_name
- item_code
- item_name
- frequency
- unit
- source_url
- active 여부
- 확인일

---

## 6. EIA 데이터 매핑 규칙

EIA는 API v2만 대상으로 한다.

각 지표에 대해 공식 API 계층을 탐색하여 다음 정보를 확인한다.

- route
- frequency
- data column
- unit
- facets
- start/end 범위

각 EIA 매핑에는 최소한 다음 메타데이터를 유지한다.

- provider = EIA
- indicator_key
- display_name_ko
- route
- frequency
- facet 조건
- data field
- unit
- source_url
- active 여부
- 확인일

API 키는 환경변수 등 비밀정보 저장소에서 주입하는 구조를 전제로 한다.

---

## 7. IMF PCPS 데이터 매핑 규칙

IMF PCPS는 IMF Data API의 SDMX 인터페이스를 사용한다.

각 지표에 대해 다음을 확인한다.

- dataset = PCPS
- commodity series
- frequency
- unit
- observation period
- series key

각 IMF 매핑에는 최소한 다음 메타데이터를 유지한다.

- provider = IMF
- dataset = PCPS
- indicator_key
- display_name_ko
- series_key
- frequency
- unit
- source_url
- active 여부
- 확인일

월간 데이터에 임의의 일별 값을 생성하지 않는다.

---

## 8. 공통 데이터 모델

모든 API 데이터를 내부적으로 동일한 구조로 정규화한다.

필수 필드:

- indicator_key
- provider
- indicator_name
- category
- period
- frequency
- value
- unit
- currency
- source_timestamp 또는 발표 기준시점
- fetched_at
- source_reference
- is_estimated

category 예시:

- inflation
- fx
- interest_rate
- energy
- nonferrous_metal
- steel_proxy

원본 데이터와 계산된 데이터는 저장 논리에서 구분한다.

---

## 9. 지표 계산 규칙

### 변화율

기본 변화율은 다음 개념을 사용한다.

- 전월 대비 = 최신 값과 직전 월 값 비교
- 전년 동월 대비 = 최신 값과 12개월 전 값 비교
- 3개월 변화율 = 최신 값과 3개월 전 값 비교
- 6개월 변화율 = 최신 값과 6개월 전 값 비교
- 12개월 변화율 = 최신 값과 12개월 전 값 비교

퍼센트 지표가 이미 원본에서 제공되더라도 원본 지수로 재계산한 값과 혼동하지 않는다.

### 평균

일간 데이터:
- 30일 평균
- 90일 평균

월간 데이터:
- 최근 3개월 평균
- 최근 6개월 평균

주말과 휴일의 결측치를 0으로 넣어 평균을 계산하지 않는다.

### 금리 스프레드

회사채 AA- 3년과 국고채 3년이 모두 존재할 때만 스프레드를 계산한다.

단위는 percentage point 또는 basis point 중 하나로 일관되게 표현한다.

---

## 10. 입찰 원가 영향도 모델

대시보드의 핵심은 경제지표를 나열하는 것이 아니라 입찰 품목의 원가 구조와 연결하는 것이다.

사용자가 품목별 원가 비중을 정의할 수 있게 한다.

예시 원가 항목:

- 철강
- 알루미늄
- 구리
- 기타 원자재
- 수입부품
- 에너지
- 인건비
- 금융비용
- 기타

각 원가 항목은 하나 이상의 경제지표와 연결할 수 있다.

권장 기본 연결:

- 철강 → ECOS 철강 PPI + ECOS 관련 수입물가지수 + USD/KRW
- 알루미늄 → IMF Aluminum + USD/KRW
- 구리 → IMF Copper + USD/KRW
- 니켈 → IMF Nickel + USD/KRW
- 수입부품 → ECOS 수입물가지수 + USD/KRW
- 에너지 → EIA WTI 또는 Brent
- 금융비용 → ECOS 회사채 AA- 또는 국고채
- 일반 물가 환경 → ECOS CPI

원가 비중의 합은 원칙적으로 100%가 되어야 한다.

100%가 아닐 경우 자동 수정하지 말고 사용자에게 경고한다.

---

## 11. 환율 결합 규칙

달러 표시 국제 원자재는 한국 기업 관점에서 원화 환산 영향을 별도로 계산한다.

개념적으로 다음 두 효과를 분리한다.

- 국제 원자재 자체 가격 변화
- USD/KRW 변화

그리고 최종 원화 기준 원자재 가격 변화에는 두 효과가 함께 반영되도록 한다.

단순 합산만으로 처리하지 말고 실제 환산값 기준으로 비교하는 것을 우선한다.

대시보드에서는 가능하면 다음을 분리해서 보여준다.

- Commodity Effect
- FX Effect
- Combined KRW Effect

---

## 12. 원가 Risk Score

원가 위험도는 최소 세 단계로 표현한다.

- LOW
- MEDIUM
- HIGH

필요하면 VERY HIGH를 추가할 수 있다.

위험도 계산은 투명해야 한다.

최소 고려 요소:

- 최근 원자재 변화율
- 환율 변화율
- PPI 변화율
- 금리 변화
- 사용자 원가 비중

임의의 AI 판단만으로 위험도를 부여하지 않는다.

사용된 규칙 또는 가중치를 화면에서 확인할 수 있어야 한다.

가중치는 사용자가 변경할 수 있게 설계하는 것이 바람직하다.

---

## 13. Dashboard 화면 구조

### Section A — Executive Summary

최상단에 표시한다.

필수 항목:
- 현재 추정 원가 변화율
- 원가 Risk Level
- 가장 큰 상승 요인 Top 3
- 가장 큰 하락 요인 Top 3
- 데이터 최신 기준일

### Section B — Inflation

카드:
- PPI
- CPI

차트:
- 최근 24개월 PPI
- 최근 24개월 CPI

### Section C — FX

카드:
- USD/KRW
- 필요 시 JPY/KRW, EUR/KRW, CNY/KRW

차트:
- 최근 12개월 환율
- 1개월/3개월/6개월 평균선

### Section D — Commodities

카드:
- WTI
- Brent
- Copper
- Aluminum
- Nickel
- Zinc

차트:
- 각 원자재 최근 추세
- 기간별 변화율 비교

### Section E — Interest Rates

카드:
- 기준금리
- CD 91일
- 국고채 3년
- 회사채 AA- 3년

차트:
- 최근 12개월 금리 추세
- 회사채-국고채 스프레드

### Section F — Bid Cost Model

사용자 입력:
- 프로젝트/입찰명
- 기준 원가
- 기준 환율
- 원가 항목별 비중
- 적용할 지표

출력:
- 원가 항목별 영향도
- 총 추정 원가 변화율
- 추정 원가
- 리스크 등급
- 기여도 순위

---

## 14. 시간 주기 처리

서로 다른 빈도의 데이터를 같은 방식으로 처리하지 않는다.

### 일간

대표 데이터:
- 환율
- 시장금리
- 일부 EIA 데이터

화면 표시:
- 최근 영업일
- 30일 추세
- 90일 추세

### 월간

대표 데이터:
- PPI
- CPI
- 수입물가지수
- IMF PCPS

화면 표시:
- 최신 발표월
- 전월 대비
- 전년 동월 대비
- 최근 12개월/24개월 추세

월간 데이터를 현재 날짜까지 임의로 forward-fill하여 최신 일간 데이터처럼 표시하지 않는다.

---

## 15. 데이터 최신성 표시

모든 카드에는 최소 다음 중 하나를 표시한다.

- 기준일
- 기준월
- 발표일

Executive Summary에는 전체 데이터 중 가장 오래된 핵심 지표의 기준일도 식별할 수 있어야 한다.

사용자가 데이터가 실시간인지 월간 통계인지 바로 이해할 수 있게 한다.

---

## 16. API 장애 및 결측치 처리

API 호출 실패 시:

1. 오류를 숨기지 않는다.
2. 마지막 정상 데이터가 있으면 사용할 수 있다.
3. 마지막 정상 데이터 기준일을 반드시 표시한다.
4. 데이터가 없으면 0으로 대체하지 않는다.
5. 카드에는 N/A 또는 데이터 미수신 상태를 표시한다.
6. 원가 계산에 필요한 핵심 데이터가 누락되면 결과를 확정값처럼 표시하지 않는다.
7. 부분 계산인 경우 Partial 또는 Incomplete 상태를 표시한다.

---

## 17. 데이터 검증

수집 시 최소 다음을 검사한다.

- 값이 숫자로 변환 가능한가
- 예상 단위와 일치하는가
- 날짜/기간 형식이 올바른가
- 중복 기간 데이터가 있는가
- 갑작스러운 단위 변경이 있는가
- 이전 정상값 대비 비정상적인 자릿수 변화가 있는가
- API 응답이 오류 메시지를 정상 데이터로 반환한 것은 아닌가

단위가 바뀌면 자동으로 조용히 보정하지 말고 로그 또는 운영 화면에 경고한다.

---

## 18. 캐시 및 갱신 원칙

불필요하게 모든 API를 화면 요청마다 직접 호출하지 않는다.

권장 갱신 개념:

- ECOS 일간 데이터 → 영업일 기준 정기 갱신
- ECOS 월간 데이터 → 일 1회 확인으로 충분
- EIA → 데이터 frequency에 맞춰 갱신
- IMF PCPS → 일 1회 또는 월간 발표 확인 수준

정확한 스케줄은 프로젝트 운영환경에 맞춰 결정한다.

캐시 데이터에도 fetched_at과 원본 기준시점을 유지한다.

---

## 19. 보안

API 키 및 운영 비밀정보는 다음 원칙을 따른다.

- 저장소에 커밋하지 않는다.
- 브라우저 클라이언트에 노출하지 않는다.
- 로그에 전체 키를 출력하지 않는다.
- 서버 환경변수 또는 별도 Secret 관리 방식을 사용한다.

권장 비밀값 이름:

- ECOS_API_KEY
- EIA_API_KEY

IMF API가 별도 인증을 요구하는 환경이라면 해당 방식에 맞게 Secret을 추가하되 문서에서 실제 값을 적지 않는다.

---

## 20. 데이터 출처 표시

각 차트와 상세 화면에서 공급자를 표시할 수 있어야 한다.

표시명:

- Bank of Korea ECOS
- U.S. EIA
- IMF PCPS

원본 데이터와 파생값을 구분한다.

예:
- Source: Bank of Korea ECOS
- Calculated: 3M change

---

## 21. 프로젝트 구성 시 Cursor Agent 행동 규칙

이 Skill이 적용된 상태에서 관련 기능을 작업할 때 다음 순서로 행동한다.

1. 현재 저장소 구조를 먼저 확인한다.
2. 기존 프레임워크와 데이터 계층을 존중한다.
3. 이미 존재하는 API 클라이언트 또는 데이터 모델을 재사용할 수 있는지 확인한다.
4. 새로운 공급자를 추가하지 않는다.
5. 필요한 지표별 provider와 frequency를 먼저 정의한다.
6. ECOS/EIA/IMF의 공식 메타데이터를 기준으로 실제 series 매핑을 확인한다.
7. 원본 데이터 저장 구조와 파생 지표 계산 구조를 분리한다.
8. 데이터 최신성과 단위를 항상 보존한다.
9. 화면 구현 전에 누락 데이터 정책을 반영한다.
10. 구현 결과가 이 문서의 Acceptance Criteria를 만족하는지 확인한다.

사용자가 별도 지시하지 않는 한 다음 행동을 하지 않는다.

- 네 번째 데이터 API 추가
- 스크래핑 도입
- Investing.com 또는 포털 페이지 HTML 파싱
- 임의의 CSV 수동 업로드를 공식 원천처럼 사용
- LLM이 경제지표 값을 생성하거나 추정
- 존재하지 않는 시계열을 임의 보간

---

## 22. 구현 단계 권장 순서

### Phase 1 — Data Foundation

목표:
- 3개 provider 연결 구조 확정
- 지표 카탈로그 확정
- 공통 데이터 모델 확정
- 최신값과 과거 시계열 확보

완료 조건:
- 모든 핵심 지표가 provider와 연결되어 있음
- 지표별 frequency와 unit이 정의되어 있음
- 데이터 기준일을 확인할 수 있음

### Phase 2 — Basic Dashboard

목표:
- PPI/CPI
- 환율
- 금리
- 원유
- 비철금속

카드와 시계열 차트를 제공한다.

완료 조건:
- 각 값의 출처와 기준일이 보임
- 1M/3M/6M/12M 변화가 계산됨

### Phase 3 — Bid Cost Model

목표:
- 원가 구성비 입력
- 지표 매핑
- 환율 효과 분리
- 품목별 기여도 계산

완료 조건:
- 원가 변화의 원인을 항목별로 설명할 수 있음
- 총 추정 원가 변화율을 확인할 수 있음

### Phase 4 — Risk & Operations

목표:
- Risk Score
- 데이터 장애 처리
- stale data 표시
- 사용자 설정 저장

완료 조건:
- API 장애가 대시보드를 잘못된 0 값으로 만들지 않음
- 오래된 데이터를 최신 데이터처럼 표시하지 않음

---

## 23. MVP 범위

MVP에는 다음만 포함한다.

### ECOS
- PPI
- CPI
- USD/KRW
- 기준금리
- CD 91일
- 국고채 3년
- 회사채 AA- 3년
- 수입물가지수

### EIA
- WTI
- Brent
- Natural Gas

### IMF PCPS
- Copper
- Aluminum
- Nickel
- Zinc

### 파생 기능
- 1M/3M/6M/12M 변화율
- 30일/90일 평균: 일간 데이터만
- 금리 스프레드
- 원화 환산 원자재 영향
- 입찰 원가 영향도
- Risk Level

MVP에서 제외:
- 실시간 스트리밍 시세
- LME 유료 데이터
- KOSIS
- 한국수출입은행 환율 API
- FRED
- Investing.com
- 뉴스 감성분석
- AI 가격예측
- 자동 투찰 의사결정

---

## 24. Acceptance Criteria

다음 조건을 모두 만족해야 MVP 완료로 본다.

### API
- 외부 API 공급자가 정확히 ECOS, EIA, IMF 3개다.
- 각 지표의 실제 공급자를 식별할 수 있다.
- API 키가 코드에 노출되지 않는다.

### 데이터
- PPI와 CPI가 최신 월과 함께 표시된다.
- USD/KRW 최신 영업일 값을 확인할 수 있다.
- 핵심 시장금리를 확인할 수 있다.
- WTI, Brent, Natural Gas를 확인할 수 있다.
- Copper, Aluminum, Nickel, Zinc를 확인할 수 있다.
- 모든 지표에 단위와 기준시점이 있다.

### 계산
- 기간별 변화율을 계산할 수 있다.
- 환율과 국제 원자재 가격을 결합한 원화 영향도를 계산할 수 있다.
- 사용자 원가 구성비를 반영한 총 원가 변화율을 계산할 수 있다.
- 각 요소의 원가 기여도를 확인할 수 있다.

### UI
- Executive Summary가 존재한다.
- Inflation, FX, Commodities, Interest Rates 섹션이 존재한다.
- Bid Cost Model이 존재한다.
- 각 카드에서 데이터 기준시점을 확인할 수 있다.

### 안정성
- API 실패가 0 값으로 변환되지 않는다.
- stale data를 구분할 수 있다.
- 월간 데이터를 실시간 데이터처럼 표시하지 않는다.
- 존재하지 않는 값을 LLM이 생성하지 않는다.

---

## 25. 완료 후 Cursor가 보고해야 할 내용

관련 구현 작업을 완료한 뒤 Cursor Agent는 최소 다음을 요약한다.

- 연결한 3개 provider
- 구현된 지표 목록
- 실제 확인한 ECOS 통계표/항목 매핑
- 실제 확인한 EIA route/facet 매핑
- 실제 확인한 IMF PCPS series 매핑
- 데이터 갱신 주기
- 추가된 환경변수 이름
- 결측치/장애 처리 방식
- 아직 지원하지 않는 지표
- Acceptance Criteria 충족 여부

API 키 자체를 출력하지 않는다.

---

## 26. 공식 참고자료

Cursor Agent Skills:
- https://cursor.com/ko/changelog/2-4

한국은행 ECOS Open API:
- https://ecos.bok.or.kr/api/

EIA Open Data:
- https://www.eia.gov/opendata/
- https://www.eia.gov/opendata/documentation.php

IMF Primary Commodity Price System:
- https://data.imf.org/Datasets/PCPS
- https://www.imf.org/en/research/commodity-prices

IMF Data API:
- https://data.imf.org/en/Resource-Pages/IMF-API

---

## 27. 최종 원칙

이 대시보드의 목표는 경제지표를 많이 보여주는 것이 아니다.

목표는 다음 질문에 답하는 것이다.

> 현재 시장환경을 기준으로 이 입찰의 원가는 얼마나 변하고 있으며, 그 변화의 가장 큰 원인은 무엇인가?

기능을 추가할 때마다 이 질문에 대한 답의 정확도, 설명 가능성, 데이터 최신성을 높이는 방향인지 먼저 판단한다.
