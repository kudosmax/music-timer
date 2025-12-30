# Claude Code 프롬프트 기획서: 음악 모임 시간 관리 앱 (수정본)

## 프로젝트 개요

음악 모임에서 제한 시간(예: 22분) 내에 곡들을 선곡할 때, 각 곡의 재생 시간을 합산하여 총 시간을 계산하고 초과 여부를 알려주는 웹 애플리케이션

---

## 핵심 기능 요구사항

### 1. 기본 UI 구조

- **입력 영역**:
  - 제한 시간 설정 (분:초 형식, 예: 22:00)
  - 최대 초과 허용 시간: 30초 고정
- **곡 목록 테이블**:

  - 컬럼: 노래 제목, 아티스트, 앨범명, 시간(분:초), 삭제 버튼
  - 각 행마다 수동 입력 또는 Spotify 검색으로 추가 가능

- **합계 표시 영역**:
  - 현재 총 재생 시간 (분:초)
  - 남은 시간 또는 초과 시간 표시
  - 초과 시 빨간색으로 "XX초 초과입니다" 경고 메시지

### 2. 시간 입력 기능

- 분:초 형식으로 직접 입력 (예: 3:18, 5:59)
- 입력 검증: 올바른 시간 형식인지 확인
- 초는 0-59 범위로 제한

### 3. Spotify API 통합

- **곡 검색 기능**:

  - 검색창에 곡 제목 또는 아티스트명 입력
  - 검색 결과를 드롭다운 또는 모달로 표시
  - 각 결과에 앨범 커버 이미지 포함 (예시 이미지 참고)

- **자동 입력**:
  - 검색 결과에서 곡 선택 시 다음 정보 자동 입력:
    - 노래 제목
    - 아티스트명
    - 앨범명
    - 재생 시간 (밀리초를 분:초로 변환)

### 4. 시간 계산 로직

- 모든 곡의 재생 시간을 초 단위로 합산
- 제한 시간과 비교하여:

  - **제한 시간 이내**: 남은 시간 표시 (녹색 또는 기본 색상)
  - **30초 이내 초과**: 경고 메시지만 표시 (빨간색)
  - **30초 초과**: 빨간색으로 "XX초 초과입니다" 강조 표시

- 입력 자체는 차단하지 않음 (계속 곡 추가 가능)

### 5. 곡 관리

- 개별 곡 삭제 기능
- 곡 순서 변경 (선택사항: 드래그 앤 드롭)
- 전체 목록 초기화 버튼

---

## 기술 스택 제안

### Frontend

- React (Vite) 또는 Next.js
- TailwindCSS for 스타일링
- React Hook Form (입력 관리용)

### API Integration

- Spotify Web API
  - Client Credentials Flow 사용
  - Search API endpoint 활용
  - 필요 정보: track name, artist, album, duration_ms

### State Management

- React Context 또는 Zustand (간단한 전역 상태 관리)

### 환경 변수 관리

- `.env` 파일로 Spotify API 자격증명 관리
- `.env.example` 템플릿 제공
- `.gitignore`에 `.env` 추가

---

## 환경 설정

### .env 파일 구조

```env
VITE_SPOTIFY_CLIENT_ID=5221b7d6e0fc48f9b6ed14149f3a5938
VITE_SPOTIFY_CLIENT_SECRET=777b05bd958f4c95a3434552a12cdcc1
```

### .env.example 파일

```env
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

### .gitignore 필수 항목

```
.env
.env.local
node_modules/
dist/
```

### 환경 변수 사용 예시 (Vite 기준)

```javascript
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = import.meta.env
  .VITE_SPOTIFY_CLIENT_SECRET;
```

---

## UI/UX 세부 사항

### 레이아웃

```
┌─────────────────────────────────────────┐
│  제한 시간 설정: [22] 분 [00] 초       │
│  최대 초과 허용: 30초                   │
├─────────────────────────────────────────┤
│  [Spotify 검색창: 곡 제목 또는 아티스트] │
│  또는                                   │
│  [수동 입력 버튼]                       │
├─────────────────────────────────────────┤
│  노래    │ 아티스트 │ 앨범  │ 시간│삭제│
│─────────┼──────────┼──────┼─────┼───│
│ When... │ LOW      │ The..│4:42 │ X │
│ Ciencia │ Chini.png│ Vía..│5:59 │ X │
├─────────────────────────────────────────┤
│  총 시간: 10:41                         │
│  남은 시간: 11분 19초                   │
│  (또는)                                 │
│  ⚠️ 15초 초과입니다 (빨간색)            │
└─────────────────────────────────────────┘
```

### 색상 가이드

- 정상 범위: 기본 텍스트 색상
- 초과 경고: `text-red-600` 또는 `bg-red-50`
- 액션 버튼: 파란색 또는 초록색
- 삭제 버튼: 빨간색

---

## Spotify API 사용 가이드

### 1. 인증

```javascript
// Spotify Access Token 획득
const getAccessToken = async () => {
  const credentials = btoa(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  );

  const response = await fetch(
    'https://accounts.spotify.com/api/token',
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    }
  );

  const data = await response.json();
  return data.access_token;
};
```

### 2. 검색 API 호출 예시

```javascript
GET https://api.spotify.com/v1/search?q={query}&type=track&limit=10
```

### 3. 응답 데이터 활용

```javascript
{
  tracks: {
    items: [
      {
        name: 'When I Go Deaf',
        artists: [{ name: 'LOW' }],
        album: {
          name: 'The Great Destroyer',
          images: [{ url: '...' }],
        },
        duration_ms: 282000, // → 4:42
      },
    ];
  }
}
```

---

## 보안 고려사항

### 중요: Client Secret 보호

- **주의**: Client Secret이 프론트엔드에 노출되면 안 됩니다
- **권장 방법**:
  1. **Option 1**: 간단한 백엔드 API 서버 추가 (Express.js 등)
  2. **Option 2**: Vercel/Netlify Serverless Functions 사용
  3. **Option 3**: 개발 환경에서만 사용 (프로덕션 배포 시 백엔드 필수)

### 프로젝트 구조 제안

```
project/
├── client/              # React 앱
│   ├── src/
│   ├── .env            # 클라이언트 환경 변수
│   └── .env.example
├── server/              # Express API (선택사항)
│   ├── index.js
│   ├── .env            # 서버 환경 변수
│   └── .env.example
└── .gitignore
```

---

## 추가 기능 제안 (선택사항)

1. **로컬 스토리지 저장**: 새로고침 시에도 목록 유지
2. **플레이리스트 내보내기**: 선택한 곡들을 텍스트 또는 CSV로 내보내기
3. **다크 모드 지원**
4. **모바일 반응형 디자인**
5. **곡 미리듣기**: Spotify preview URL 활용

---

## Claude Code에게 전달할 최종 프롬프트

```
음악 모임을 위한 시간 관리 웹 앱을 만들어주세요.

핵심 기능:
1. 제한 시간 설정 (분:초 형식, 예: 22:00, 최대 초과 30초 허용)
2. 곡 목록 테이블 (노래/아티스트/앨범/시간/삭제)
3. Spotify API 검색으로 곡 자동 추가 (제목, 아티스트, 앨범, 시간 자동 입력)
4. 또는 수동으로 분:초 입력 가능
5. 총 재생 시간 실시간 계산
6. 제한 시간 초과 시 빨간색으로 "XX초 초과입니다" 경고 (입력은 계속 가능)

기술 스택:
- React + Vite + TailwindCSS
- Spotify Web API (Search endpoint)
- Client Credentials Flow 인증

환경 변수 설정:
- .env 파일 생성 및 관리
- .env.example 템플릿 제공
- .gitignore에 .env 추가
- Spotify API 자격증명:
  - VITE_SPOTIFY_CLIENT_ID=5221b7d6e0fc48f9b6ed14149f3a5938
  - VITE_SPOTIFY_CLIENT_SECRET=777b05bd958f4c95a3434552a12cdcc1

보안 고려사항:
- Client Secret 보호를 위해 간단한 Express 백엔드 API 추가
  또는 개발 환경에서만 사용하는 것으로 명시

UI 요구사항:
- 깔끔한 테이블 레이아웃
- Spotify 검색 결과에 앨범 커버 이미지 표시
- 초과 시 경고 색상 변경 (빨간색)
- 반응형 디자인

프로젝트 구조:
- .env 및 .env.example 파일 자동 생성
- .gitignore에 .env 포함
- README에 환경 변수 설정 가이드 포함

참고: 첨부된 스크린샷과 유사한 UI 디자인
```

---

## 설치 및 실행 가이드 (README 포함 내용)

```markdown
## 환경 설정

1. 프로젝트 클론 후 의존성 설치
   npm install

2. .env 파일 생성
   cp .env.example .env

3. .env 파일에 Spotify API 자격증명 입력
   VITE_SPOTIFY_CLIENT_ID=your_client_id
   VITE_SPOTIFY_CLIENT_SECRET=your_client_secret

4. 개발 서버 실행
   npm run dev

⚠️ 주의: 프로덕션 배포 시 Client Secret을 서버 사이드에서 관리하세요.
```
