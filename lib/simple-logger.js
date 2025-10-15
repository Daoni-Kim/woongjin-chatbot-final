// 간단한 로깅 시스템 (데이터베이스 없이 작동)
export class SimpleLogger {
    // 세션 ID 생성
    static generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 채팅 로그 저장 (콘솔 출력)
    static async logMessage({
        sessionId,
        userMessage,
        botResponse = null,
        messageType,
        buttonAction = null,
        userAgent = null,
        ipAddress = null,
        responseTimeMs = null,
        errorMessage = null
    }) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            sessionId,
            messageType,
            userMessage: userMessage?.substring(0, 100),
            botResponse: botResponse?.substring(0, 100),
            buttonAction,
            responseTimeMs,
            errorMessage,
            userAgent: userAgent?.substring(0, 50),
            ipAddress
        };

        console.log('📝 채팅 로그:', JSON.stringify(logEntry, null, 2));
        return { id: Date.now(), created_at: new Date() };
    }

    // 세션 정보 업데이트 (콘솔 출력)
    static async updateSession({
        sessionId,
        userAgent = null,
        ipAddress = null,
        referrer = null
    }) {
        const sessionInfo = {
            timestamp: new Date().toISOString(),
            sessionId,
            userAgent: userAgent?.substring(0, 50),
            ipAddress,
            referrer
        };

        console.log('👤 세션 정보:', JSON.stringify(sessionInfo, null, 2));
    }

    // 통계 조회 (더미 데이터)
    static async getStatistics(days = 7) {
        console.log(`📊 통계 요청: ${days}일`);
        return [
            {
                date: new Date().toISOString().split('T')[0],
                total_messages: 10,
                unique_sessions: 5,
                avg_response_time: 1200,
                error_count: 0
            }
        ];
    }

    // 최근 채팅 로그 조회 (더미 데이터)
    static async getRecentLogs(sessionId, limit = 50) {
        console.log(`📋 로그 조회: ${sessionId}, 제한: ${limit}`);
        return [];
    }
}