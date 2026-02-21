# Zoom 회의 일괄 생성기

교실백점 특강 CSV 파일을 업로드하여 Zoom 회의를 자동으로 일괄 생성하는 웹앱.

## 사전 준비: Zoom OAuth 앱 등록

### 1단계: Zoom Marketplace에서 앱 생성
1. [https://marketplace.zoom.us](https://marketplace.zoom.us) 접속
2. 우측 상단 **Develop → Build App**
3. **General App** 선택 → Create
4. App Name: `교실백점 회의 생성기` (임의로 설정)

### 2단계: OAuth 설정
1. **OAuth** 탭 → **OAuth Redirect URLs**에 추가:
   - 개발: `http://localhost:3000/api/zoom/callback`
   - 배포 후: `https://your-domain.vercel.app/api/zoom/callback`
2. **Scopes** 탭 → 다음 스코프 추가:
   - `meeting:write:meeting` — 회의 생성
   - `user:read:user` — 사용자 정보 확인

### 3단계: 앱 활성화
1. **Activation** 탭 → **Activate your app**
2. Client ID와 Client Secret 복사 → `.env.local`에 입력

---

## 로컬 실행

### 환경변수 설정
`.env.local` 파일을 편집:

```
ZOOM_CLIENT_ID=여기에_Client_ID
ZOOM_CLIENT_SECRET=여기에_Client_Secret
SESSION_SECRET=32자_이상의_랜덤_문자열
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

> **SESSION_SECRET 생성 명령어:**
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속

---

## 사용 방법

### 1단계: Zoom 로그인
우측 상단 **Zoom 로그인** 클릭 후 인증.

> 계정 2개를 사용하는 경우: 한 계정 로그인 → 해당 구분 필터 선택 → 생성 → 로그아웃 → 다른 계정으로 반복

### 2단계: CSV 업로드
드래그앤드롭 또는 클릭하여 업로드. 파싱 오류 및 시간 충돌 자동 감지.

### 3단계: 미리보기 & 필터
**전체 / 업무특강 / 교과특강** 탭으로 필터링. ⚠️ 표시는 같은 계정 내 시간 중복.

### 4단계: 회의 설정
비밀번호, 비디오, 대기실, 녹화 등 공통 설정. 모든 회의에 동일 적용.

### 5단계: 결과 확인
- 실시간 진행 상황 표시
- **결과 CSV 다운로드** — 회의 링크, 비밀번호 포함
- 실패 건만 선택하여 재시도 가능

---

## Vercel 배포

```bash
npx vercel
```

**환경변수 설정** (Vercel Dashboard → Project Settings → Environment Variables):

| Key | Value |
|-----|-------|
| `ZOOM_CLIENT_ID` | Zoom 앱 Client ID |
| `ZOOM_CLIENT_SECRET` | Zoom 앱 Client Secret |
| `SESSION_SECRET` | 32자 이상 랜덤 문자열 |
| `NEXT_PUBLIC_BASE_URL` | `https://your-domain.vercel.app` |

배포 후 Zoom 앱 **OAuth Redirect URLs**에 추가:
`https://your-domain.vercel.app/api/zoom/callback`

---

## CSV 형식

| 컬럼 인덱스 | 필드 | 예시 |
|------------|------|------|
| 1 | 구분 | 업무특강 / 교과특강 |
| 2 | 선생님 성함 | 박다정 |
| 3 | 활동 강사명 | 월간교실 준쌤 |
| 5 | 이메일 주소 | pdj3391@naver.com |
| 8 | 일자(줌 강의) | 2026. 2. 23 |
| 9 | 시간 | 16:00-18:00 |
| 12 | 연수 대상 | 전학령 대상 |
| 13 | 연수 주제 | 수업 관련 |
| 17 | 홍보물용 강의제목 | 캔바 왕초보에서 Level Up! |

> 컬럼 **순서**가 유지되면 헤더 텍스트 변경은 무관합니다.
> 컬럼 순서가 바뀐 경우 `src/lib/csv-parser.ts`의 `COL` 상수를 수정하세요.
