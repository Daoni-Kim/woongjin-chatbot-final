// Vercel-Supabase 연결 상태 확인 API
export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 환경변수 확인
        const envCheck = {
            timestamp: new Date().toISOString(),
            vercel: {
                region: process.env.VERCEL_REGION || 'unknown',
                env: process.env.VERCEL_ENV || 'unknown'
            },
            supabase: {
                url: {
                    exists: !!process.env.SUPABASE_URL,
                    preview: process.env.SUPABASE_URL ? 
                        `${process.env.SUPABASE_URL.substring(0, 30)}...` : 'null'
                },
                anonKey: {
                    exists: !!process.env.SUPABASE_ANON_KEY,
                    length: process.env.SUPABASE_ANON_KEY ? 
                        process.env.SUPABASE_ANON_KEY.length : 0
                },
                serviceRoleKey: {
                    exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                    length: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
                        process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0
                }
            },
            postgres: {
                url: {
                    exists: !!process.env.POSTGRES_URL,
                    preview: process.env.POSTGRES_URL ? 
                        `${process.env.POSTGRES_URL.substring(0, 30)}...` : 'null'
                },
                prismaUrl: {
                    exists: !!process.env.POSTGRES_PRISMA_URL,
                    preview: process.env.POSTGRES_PRISMA_URL ? 
                        `${process.env.POSTGRES_PRISMA_URL.substring(0, 30)}...` : 'null'
                }
            },
            openai: {
                exists: !!process.env.OPENAI_API_KEY,
                valid: process.env.OPENAI_API_KEY ? 
                    process.env.OPENAI_API_KEY.startsWith('sk-') : false
            }
        };

        // Supabase 연결 테스트
        let supabaseTest = { skipped: true, reason: 'No credentials' };
        
        if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
            try {
                console.log('🧪 Supabase 연결 테스트 시작...');
                
                // Supabase REST API로 간단한 테스트
                const testResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
                    method: 'GET',
                    headers: {
                        'apikey': process.env.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
                    }
                });

                supabaseTest = {
                    status: testResponse.status,
                    statusText: testResponse.statusText,
                    success: testResponse.ok,
                    timestamp: new Date().toISOString()
                };

                if (testResponse.ok) {
                    console.log('✅ Supabase 연결 테스트 성공');
                } else {
                    console.log('❌ Supabase 연결 테스트 실패:', testResponse.status);
                }
            } catch (testError) {
                supabaseTest = {
                    error: testError.message,
                    success: false,
                    timestamp: new Date().toISOString()
                };
                console.log('❌ Supabase 연결 테스트 오류:', testError.message);
            }
        }

        // 전체 연결 상태 평가
        const connectionStatus = {
            supabaseConnected: envCheck.supabase.url.exists && 
                              envCheck.supabase.anonKey.exists && 
                              supabaseTest.success,
            postgresConnected: envCheck.postgres.url.exists,
            openaiConfigured: envCheck.openai.exists && envCheck.openai.valid,
            allSystemsReady: false
        };

        connectionStatus.allSystemsReady = 
            connectionStatus.supabaseConnected && 
            connectionStatus.openaiConfigured;

        return res.status(200).json({
            success: true,
            message: connectionStatus.allSystemsReady ? 
                '🎉 모든 시스템이 정상 연결되었습니다!' : 
                '⚠️ 일부 시스템에 문제가 있습니다.',
            connectionStatus,
            environmentCheck: envCheck,
            supabaseTest,
            recommendations: connectionStatus.allSystemsReady ? 
                ['챗봇을 테스트해보세요!'] : 
                [
                    !connectionStatus.supabaseConnected ? 'Supabase 연결을 확인하세요' : null,
                    !connectionStatus.openaiConfigured ? 'OpenAI API 키를 설정하세요' : null
                ].filter(Boolean)
        });

    } catch (error) {
        console.error('연결 확인 오류:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}