// Supabase 연결 유틸리티
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

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
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            const { data, error } = await supabase
                .from('chat_logs')
                .insert({
                    session_id: sessionId,
                    user_message: userMessage,
                    bot_response: botResponse,
                    message_type: messageType,
                    button_action: buttonAction,
                    user_agent: userAgent,
                    ip_address: ipAddress,
                    response_time_ms: responseTimeMs,
                    error_message: errorMessage
                })
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ 채팅 로그 저장 성공:', data);
            return data;
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
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            // 기존 세션 확인
            const { data: existingSession } = await supabase
                .from('chat_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (existingSession) {
                // 기존 세션 업데이트
                const { error } = await supabase
                    .from('chat_sessions')
                    .update({
                        last_activity: new Date().toISOString(),
                        total_messages: existingSession.total_messages + 1
                    })
                    .eq('session_id', sessionId);
                
                if (error) throw error;
            } else {
                // 새 세션 생성
                const { error } = await supabase
                    .from('chat_sessions')
                    .insert({
                        session_id: sessionId,
                        user_agent: userAgent,
                        ip_address: ipAddress,
                        referrer: referrer,
                        total_messages: 1
                    });
                
                if (error) throw error;
            }
            
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