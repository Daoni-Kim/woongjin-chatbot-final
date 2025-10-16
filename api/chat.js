// Vercel 서버리스 함수 - OpenAI API 프록시 + 로깅

// 로깅 시스템 초기화
let ChatLogger = null;
const DB_ENABLED = process.env.POSTGRES_URL &&
    process.env.POSTGRES_URL !== 'your_postgres_connection_string' &&
    !process.env.POSTGRES_URL.includes('localhost');

console.log('🔧 로깅 시스템 초기화:', {
    DB_ENABLED,
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    postgresUrlPreview: process.env.POSTGRES_URL ?
        `${process.env.POSTGRES_URL.substring(0, 20)}...` : 'null'
});

if (DB_ENABLED) {
    try {
        const dbModule = await import('../lib/database.js');
        ChatLogger = dbModule.ChatLogger;
        console.log('✅ PostgreSQL 데이터베이스 로거 로드 성공');
    } catch (error) {
        console.warn('⚠️ PostgreSQL 로거 실패, 간단한 로거로 대체:', error.message);
        const simpleModule = await import('../lib/simple-logger.js');
        ChatLogger = simpleModule.SimpleLogger;
    }
} else {
    console.log('ℹ️ 간단한 로거 사용 (PostgreSQL 비활성화)');
    const simpleModule = await import('../lib/simple-logger.js');
    ChatLogger = simpleModule.SimpleLogger;
}

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS 요청 처리 (CORS preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, sessionId } = req.body;
        const startTime = Date.now();

        // 세션 ID 생성 (클라이언트에서 제공되지 않은 경우)
        const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 요청 정보 수집
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // API 시작 로그
        console.log('🚀 API_START:', JSON.stringify({
            timestamp: new Date().toISOString(),
            sessionId: currentSessionId,
            messageLength: message?.length || 0,
            userAgent: userAgent?.substring(0, 50),
            ipAddress: ipAddress,
            hasMessage: !!message,
            method: req.method,
            url: req.url
        }, null, 2));

        // Vercel 로그 우선 + 선택적 DB 로깅
        const safeLog = async (logData) => {
            // 1. 항상 Vercel 콘솔에 구조화된 로그 출력
            const vercelLog = {
                timestamp: new Date().toISOString(),
                sessionId: logData.sessionId,
                messageType: logData.messageType,
                userMessage: logData.userMessage?.substring(0, 100),
                botResponse: logData.botResponse?.substring(0, 100),
                responseTimeMs: logData.responseTimeMs,
                errorMessage: logData.errorMessage,
                userAgent: logData.userAgent?.substring(0, 50),
                ipAddress: logData.ipAddress
            };
            
            console.log('🔥 CHAT_LOG:', JSON.stringify(vercelLog, null, 2));
            
            // 2. 선택적으로 DB에도 저장 (실패해도 API 계속 진행)
            const USE_DATABASE = process.env.USE_DATABASE === 'true';
            if (USE_DATABASE && ChatLogger) {
                try {
                    await ChatLogger.logMessage(logData);
                    console.log('✅ DB 로깅도 성공');
                } catch (logError) {
                    console.warn('⚠️ DB 로깅 실패 (Vercel 로그는 정상):', logError.message);
                }
            } else {
                console.log('ℹ️ DB 로깅 비활성화 - Vercel 로그만 사용');
            }
        };

        const safeUpdateSession = async (sessionData) => {
            // 1. 항상 Vercel 콘솔에 세션 정보 출력
            console.log('👤 SESSION_UPDATE:', JSON.stringify({
                timestamp: new Date().toISOString(),
                sessionId: sessionData.sessionId,
                userAgent: sessionData.userAgent?.substring(0, 50),
                ipAddress: sessionData.ipAddress,
                referrer: sessionData.referrer
            }, null, 2));
            
            // 2. 선택적으로 DB에도 저장
            const USE_DATABASE = process.env.USE_DATABASE === 'true';
            if (USE_DATABASE && ChatLogger) {
                try {
                    await ChatLogger.updateSession(sessionData);
                    console.log('✅ 세션 DB 업데이트 성공');
                } catch (logError) {
                    console.warn('⚠️ 세션 DB 업데이트 실패 (Vercel 로그는 정상):', logError.message);
                }
            }
        };

        // 입력 검증
        if (!message || typeof message !== 'string') {
            await safeLog({
                sessionId: currentSessionId,
                userMessage: message || 'null',
                messageType: 'error',
                userAgent,
                ipAddress,
                errorMessage: 'Invalid message format'
            });
            return res.status(400).json({ error: 'Invalid message' });
        }

        // 메시지 길이 제한 (보안)
        if (message.length > 500) {
            await safeLog({
                sessionId: currentSessionId,
                userMessage: message.substring(0, 100) + '...',
                messageType: 'error',
                userAgent,
                ipAddress,
                errorMessage: 'Message too long'
            });
            return res.status(400).json({ error: 'Message too long' });
        }

        // 사용자 메시지 로깅
        await safeLog({
            sessionId: currentSessionId,
            userMessage: message,
            messageType: 'user',
            userAgent,
            ipAddress
        });

        // 세션 정보 업데이트
        await safeUpdateSession({
            sessionId: currentSessionId,
            userAgent,
            ipAddress,
            referrer: req.headers.referer
        });

        // 환경변수에서 API 키 가져오기
        const apiKey = process.env.OPENAI_API_KEY;

        console.log('🔑 API 키 확인:', {
            exists: !!apiKey,
            length: apiKey ? apiKey.length : 0,
            startsWithSk: apiKey ? apiKey.startsWith('sk-') : false,
            preview: apiKey ? `${apiKey.substring(0, 10)}...` : 'null'
        });

        if (!apiKey || apiKey === 'your_openai_api_key_here' || !apiKey.startsWith('sk-')) {
            console.error('❌ OpenAI API key not found or invalid');
            await safeLog({
                sessionId: currentSessionId,
                userMessage: message,
                messageType: 'error',
                userAgent,
                ipAddress,
                errorMessage: 'API key not configured or invalid'
            });
            return res.status(500).json({ error: 'API key not configured' });
        }

        // OpenAI API 호출 준비
        const requestBody = {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `당신은 웅진씽크빅 고객센터의 친절한 AI 도우미 '씽키(Thinky)'입니다.

역할:
1. 웅진씽크빅 교육서비스(스마트올, 와이즈캠프, 북클럽 등) 일반 질문 답변
2. 구체적 업무(학습현황/결제정보/배송조회/정보변경)는 해당 메뉴 이용 안내
3. 친절하고 도움이 되는 톤으로 응답
4. 필요시 상담원 연결이나 관련 메뉴 안내

**중요: 답변은 반드시 300자 이내로 완전한 문장으로 작성하세요.**`
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            max_tokens: 300,
            temperature: 0.7
        };

        console.log('🚀 OpenAI API 호출 시작:', {
            url: 'https://api.openai.com/v1/chat/completions',
            model: requestBody.model,
            maxTokens: requestBody.max_tokens,
            messageLength: message.length,
            timestamp: new Date().toISOString()
        });

        // OpenAI API 호출
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📡 OpenAI API 응답:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenAI API error:', response.status, errorData);

            // API 오류 로깅
            await safeLog({
                sessionId: currentSessionId,
                userMessage: message,
                messageType: 'error',
                userAgent,
                ipAddress,
                responseTimeMs: Date.now() - startTime,
                errorMessage: `OpenAI API error: ${response.status}`
            });

            return res.status(500).json({ error: 'AI service temporarily unavailable' });
        }

        const data = await response.json();
        let responseText = data.choices[0].message.content.trim();

        // 300자 제한 적용
        if (responseText.length > 300) {
            const sentenceEnders = ['.', '!', '?', '。', '!', '?'];
            let cutIndex = 297;

            for (let i = 297; i >= 250; i--) {
                if (sentenceEnders.includes(responseText[i])) {
                    cutIndex = i + 1;
                    break;
                }
            }

            responseText = responseText.substring(0, cutIndex);
        }

        const responseTime = Date.now() - startTime;

        // 성공적인 AI 응답 로깅
        await safeLog({
            sessionId: currentSessionId,
            userMessage: message,
            botResponse: responseText,
            messageType: 'bot',
            userAgent,
            ipAddress,
            responseTimeMs: responseTime
        });

        // API 성공 완료 로그
        console.log('✅ API_SUCCESS:', JSON.stringify({
            timestamp: new Date().toISOString(),
            sessionId: currentSessionId,
            responseLength: responseText.length,
            responseTime: responseTime,
            totalTime: Date.now() - startTime
        }, null, 2));

        return res.status(200).json({
            response: responseText,
            sessionId: currentSessionId,
            timestamp: new Date().toISOString(),
            responseTime: responseTime
        });

    } catch (error) {
        console.error('❌ API_ERROR:', JSON.stringify({
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            sessionId: req.body?.sessionId || 'unknown'
        }, null, 2));

        // 서버 오류 로깅
        try {
            const { message, sessionId } = req.body || {};
            const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            if (ChatLogger) {
                try {
                    await ChatLogger.logMessage({
                        sessionId: currentSessionId,
                        userMessage: message || 'unknown',
                        messageType: 'error',
                        userAgent: req.headers['user-agent'],
                        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                        errorMessage: error.message || 'Internal server error'
                    });
                } catch (logError) {
                    console.warn('⚠️ 오류 로깅 실패:', logError.message);
                }
            }
        } catch (logError) {
            console.error('로깅 실패:', logError);
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
}