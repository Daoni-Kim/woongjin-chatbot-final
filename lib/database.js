// Vercel Postgres 연결 유틸리티
import { sql } from '@vercel/postgres';

export class ChatLogger {
    // 세션 ID 생성
    static generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 채팅 로그 저장
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
        try {
            const result = await sql`
                INSERT INTO chat_logs (
                    session_id, user_message, bot_response, message_type,
                    button_action, user_agent, ip_address, response_time_ms, error_message
                ) VALUES (
                    ${sessionId}, ${userMessage}, ${botResponse}, ${messageType},
                    ${buttonAction}, ${userAgent}, ${ipAddress}, ${responseTimeMs}, ${errorMessage}
                )
                RETURNING id, created_at
            `;
            
            console.log('✅ 채팅 로그 저장 성공:', result.rows[0]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ 채팅 로그 저장 실패:', error);
            throw error;
        }
    }

    // 세션 정보 업데이트
    static async updateSession({
        sessionId,
        userAgent = null,
        ipAddress = null,
        referrer = null
    }) {
        try {
            await sql`
                INSERT INTO chat_sessions (session_id, user_agent, ip_address, referrer, total_messages)
                VALUES (${sessionId}, ${userAgent}, ${ipAddress}, ${referrer}, 1)
                ON CONFLICT (session_id) 
                DO UPDATE SET 
                    last_activity = NOW(),
                    total_messages = chat_sessions.total_messages + 1
            `;
            
            console.log('✅ 세션 정보 업데이트 성공');
        } catch (error) {
            console.error('❌ 세션 정보 업데이트 실패:', error);
            // 세션 업데이트 실패는 치명적이지 않으므로 에러를 던지지 않음
        }
    }

    // 채팅 통계 조회
    static async getStatistics(days = 7) {
        try {
            const result = await sql`
                SELECT * FROM chat_statistics 
                WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
                ORDER BY date DESC
            `;
            
            return result.rows;
        } catch (error) {
            console.error('❌ 통계 조회 실패:', error);
            throw error;
        }
    }

    // 최근 채팅 로그 조회
    static async getRecentLogs(sessionId, limit = 50) {
        try {
            const result = await sql`
                SELECT * FROM chat_logs 
                WHERE session_id = ${sessionId}
                ORDER BY created_at DESC 
                LIMIT ${limit}
            `;
            
            return result.rows;
        } catch (error) {
            console.error('❌ 채팅 로그 조회 실패:', error);
            throw error;
        }
    }
}