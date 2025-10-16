// 채팅 로그 조회 API (관리자용)
export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 관리자 인증
        const authHeader = req.headers.authorization;
        const adminKey = process.env.ADMIN_KEY || 'admin123';
        
        if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { 
            limit = 50, 
            offset = 0, 
            session_id, 
            message_type, 
            date_from, 
            date_to 
        } = req.query;

        // Supabase 연결 확인
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({ error: 'Database not configured' });
        }

        // 기본 쿼리 구성
        let query = `select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
        
        // 필터 조건 추가
        const filters = [];
        if (session_id) filters.push(`session_id.eq.${session_id}`);
        if (message_type) filters.push(`message_type.eq.${message_type}`);
        if (date_from) filters.push(`created_at.gte.${date_from}`);
        if (date_to) filters.push(`created_at.lte.${date_to}`);
        
        if (filters.length > 0) {
            query += `&${filters.join('&')}`;
        }

        console.log('📋 채팅 로그 조회:', query);

        // Supabase REST API로 로그 조회
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/chat_logs?${query}`, {
            method: 'GET',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ 로그 조회 실패:', response.status, errorData);
            return res.status(response.status).json({ 
                error: 'Failed to fetch logs',
                details: errorData 
            });
        }

        const logs = await response.json();

        // 세션 통계도 함께 조회
        const statsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/chat_sessions?select=*&order=first_visit.desc&limit=10`, {
            method: 'GET',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const sessions = statsResponse.ok ? await statsResponse.json() : [];

        return res.status(200).json({
            success: true,
            logs: logs.map(log => ({
                ...log,
                created_at: new Date(log.created_at).toLocaleString('ko-KR'),
                user_message_preview: log.user_message ? 
                    log.user_message.substring(0, 50) + (log.user_message.length > 50 ? '...' : '') : null,
                bot_response_preview: log.bot_response ? 
                    log.bot_response.substring(0, 50) + (log.bot_response.length > 50 ? '...' : '') : null
            })),
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: logs.length === parseInt(limit)
            },
            recentSessions: sessions.slice(0, 5).map(session => ({
                session_id: session.session_id,
                first_visit: new Date(session.first_visit).toLocaleString('ko-KR'),
                total_messages: session.total_messages
            })),
            filters: {
                session_id,
                message_type,
                date_from,
                date_to
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('로그 조회 오류:', error);
        return res.status(500).json({
            error: 'Failed to fetch chat logs',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}