// 채팅 통계 조회 API (관리자용)
import { ChatLogger } from '../lib/database.js';

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET 요청만 허용
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 간단한 인증 (실제 운영시에는 더 강력한 인증 필요)
        const authHeader = req.headers.authorization;
        const adminKey = process.env.ADMIN_KEY || 'admin123';
        
        if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { days = 7 } = req.query;
        
        // 통계 조회 (Supabase 호환)
        let statistics;
        try {
            statistics = await ChatLogger.getStatistics(parseInt(days));
        } catch (error) {
            console.warn('통계 조회 실패, 더미 데이터 사용:', error.message);
            statistics = [{
                date: new Date().toISOString().split('T')[0],
                total_messages: 0,
                unique_sessions: 0,
                avg_response_time: 0,
                error_count: 0
            }];
        }
        
        // 추가 통계 계산
        const totalMessages = statistics.reduce((sum, day) => sum + day.total_messages, 0);
        const totalSessions = statistics.reduce((sum, day) => sum + day.unique_sessions, 0);
        const avgResponseTime = statistics.reduce((sum, day) => sum + (day.avg_response_time || 0), 0) / statistics.length;
        const totalErrors = statistics.reduce((sum, day) => sum + day.error_count, 0);

        return res.status(200).json({
            success: true,
            period: `${days} days`,
            summary: {
                totalMessages,
                totalSessions,
                avgResponseTime: Math.round(avgResponseTime),
                totalErrors,
                errorRate: totalMessages > 0 ? ((totalErrors / totalMessages) * 100).toFixed(2) : 0
            },
            dailyStats: statistics,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('통계 조회 오류:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch statistics',
            message: error.message 
        });
    }
}