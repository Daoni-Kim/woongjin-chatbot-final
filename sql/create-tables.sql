-- 웅진씽크빅 챗봇 테이블 생성

-- 1. 채팅 로그 테이블
CREATE TABLE IF NOT EXISTS public.chat_logs (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_message TEXT NOT NULL,
    bot_response TEXT,
    message_type VARCHAR(50) NOT NULL DEFAULT 'user',
    button_action VARCHAR(100),
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_ms INTEGER,
    error_message TEXT
);

-- 2. 세션 정보 테이블
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    first_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_messages INTEGER DEFAULT 0,
    user_agent TEXT,
    ip_address INET,
    referrer TEXT
);

-- 3. 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_chat_logs_session_id ON public.chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON public.chat_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_logs_message_type ON public.chat_logs(message_type);

-- 4. RLS (Row Level Security) 비활성화 (API에서 접근 가능하도록)
ALTER TABLE public.chat_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions DISABLE ROW LEVEL SECURITY;

-- 5. 테스트 데이터 삽입
INSERT INTO public.chat_logs (
    session_id, 
    user_message, 
    bot_response, 
    message_type, 
    response_time_ms
) VALUES (
    'test_session_' || extract(epoch from now()),
    '테스트 메시지입니다',
    '테스트 응답입니다',
    'user',
    1200
);

-- 6. 확인 쿼리
SELECT 'chat_logs 테이블 생성 완료' as status, COUNT(*) as record_count FROM public.chat_logs;
SELECT 'chat_sessions 테이블 생성 완료' as status, COUNT(*) as record_count FROM public.chat_sessions;