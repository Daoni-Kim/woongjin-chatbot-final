# 로깅 전략 가이드

## 🎯 프로젝트 단계별 추천

### 1. 개발/테스트 단계 (현재)
**추천: Vercel 로그만 사용**
- ✅ 빠른 개발
- ✅ 비용 절약
- ✅ 간단한 디버깅

### 2. MVP/베타 단계
**추천: 하이브리드 (Vercel + 간단한 로깅)**
- 기본: Vercel 로그
- 추가: 간단한 파일 기반 로깅

### 3. 운영 단계
**추천: 완전한 데이터베이스 로깅**
- Supabase 또는 다른 DB
- 비즈니스 분석 도구
- 실시간 모니터링

## 🔄 단계별 마이그레이션

### Phase 1: Vercel 로그 최적화
```javascript
// 구조화된 콘솔 로깅
console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    type: 'user_message',
    sessionId: sessionId,
    message: message.substring(0, 100),
    responseTime: responseTime
}));
```

### Phase 2: 파일 기반 로깅
```javascript
// 간단한 로그 파일 생성
const logEntry = {
    timestamp: new Date().toISOString(),
    sessionId,
    userMessage: message,
    botResponse: response
};
// Vercel의 /tmp 디렉토리 활용
```

### Phase 3: 데이터베이스 로깅
```javascript
// 완전한 DB 로깅 (현재 구현)
await supabase.from('chat_logs').insert(logData);
```

## 💰 비용 비교

### Vercel 로그
- **비용**: $0
- **저장 기간**: 24-48시간
- **용량**: 무제한 (임시)

### Supabase 무료 티어
- **비용**: $0 (월 500MB까지)
- **저장 기간**: 영구
- **용량**: 500MB

### 예상 사용량 (월간)
- 채팅 로그: ~100MB
- 세션 데이터: ~10MB
- **총합**: ~110MB (무료 범위 내)

## 🎯 현재 프로젝트 추천

### 즉시 적용 가능한 방안:
1. **Supabase 비활성화** (당분간)
2. **Vercel 로그 최적화**
3. **필요시 나중에 DB 활성화**

### 코드 수정:
```javascript
// 환경변수로 로깅 방식 선택
const USE_DATABASE = process.env.USE_DATABASE === 'true';

if (USE_DATABASE && supabase) {
    // DB 로깅
    await supabase.from('chat_logs').insert(logData);
} else {
    // 콘솔 로깅 (Vercel에서 확인 가능)
    console.log('CHAT_LOG:', JSON.stringify(logData));
}
```