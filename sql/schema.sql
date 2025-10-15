-- 웅진씽크빅 챗봇 로그 테이블
CREATE TABLE IF NOT EXISTS chat_logs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_message TEXT NOT NULL,
    bot_response TEXT,
    message_type VARCHAR(50) NOT NULL, -- 'user', 'bot', 'button_click'
    button_action VARCHAR(100), -- 클릭한 버튼 액션
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_ms INTEGER, -- AI 응답 시간
    error_message TEXT, -- 오류 발생시 메시지
    
    -- 인덱스
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at),
    INDEX idx_message_type (message_type)
);

-- 세션 정보 테이블
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    first_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_messages INTEGER DEFAULT 0,
    user_agent TEXT,
    ip_address INET,
    referrer TEXT
);

-- 통계를 위한 뷰
CREATE OR REPLACE VIEW chat_statistics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_messages,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(response_time_ms) as avg_response_time,
    COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as error_count
FROM chat_logs 
GROUP BY DATE(created_at)
ORDER BY date DESC;