// 데이터베이스 연결 및 로깅 테스트 API
export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const testResults = {
            timestamp: new Date().toISOString(),
            environment: {
                supabaseUrl: !!process.env.SUPABASE_URL,
                supabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
                supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                postgresUrl: !!process.env.POSTGRES_URL
            },
            tests: {}
        };

        console.log('🧪 데이터베이스 테스트 시작...');

        // 1. 환경변수 확인
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({
                success: false,
                error: 'Supabase 환경변수가 설정되지 않았습니다',
                testResults
            });
        }

        // 2. Supabase REST API로 직접 테스트
        console.log('📡 Supabase REST API 테스트...');
        
        // 테이블 존재 확인
        const tableCheckResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/chat_logs?select=count&limit=1`, {
            method: 'GET',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'count=exact'
            }
        });

        testResults.tests.tableCheck = {
            status: tableCheckResponse.status,
            success: tableCheckResponse.ok,
            error: tableCheckResponse.ok ? null : await tableCheckResponse.text()
        };

        if (!tableCheckResponse.ok) {
            console.log('❌ 테이블 확인 실패:', testResults.tests.tableCheck);
            return res.status(200).json({
                success: false,
                message: '테이블이 존재하지 않거나 접근할 수 없습니다',
                testResults,
                recommendation: 'Supabase SQL Editor에서 테이블을 생성해주세요'
            });
        }

        // 3. 테스트 데이터 삽입
        if (req.method === 'POST') {
            console.log('📝 테스트 데이터 삽입...');
            
            const testData = {
                session_id: `test_${Date.now()}`,
                user_message: '테스트 메시지',
                bot_response: '테스트 응답',
                message_type: 'test',
                response_time_ms: 1000
            };

            const insertResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/chat_logs`, {
                method: 'POST',
                headers: {
                    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(testData)
            });

            testResults.tests.dataInsert = {
                status: insertResponse.status,
                success: insertResponse.ok,
                data: insertResponse.ok ? await insertResponse.json() : null,
                error: insertResponse.ok ? null : await insertResponse.text()
            };

            console.log('📝 데이터 삽입 결과:', testResults.tests.dataInsert);
        }

        // 4. 데이터 조회 테스트
        console.log('📋 데이터 조회 테스트...');
        
        const selectResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/chat_logs?select=*&limit=5&order=created_at.desc`, {
            method: 'GET',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const selectData = selectResponse.ok ? await selectResponse.json() : null;
        
        testResults.tests.dataSelect = {
            status: selectResponse.status,
            success: selectResponse.ok,
            recordCount: selectData ? selectData.length : 0,
            records: selectData ? selectData.slice(0, 3) : null,
            error: selectResponse.ok ? null : await selectResponse.text()
        };

        console.log('📋 데이터 조회 결과:', testResults.tests.dataSelect);

        // 5. 전체 결과 평가
        const allTestsPassed = Object.values(testResults.tests).every(test => test.success);

        return res.status(200).json({
            success: allTestsPassed,
            message: allTestsPassed ? 
                '🎉 모든 데이터베이스 테스트가 성공했습니다!' : 
                '⚠️ 일부 테스트에서 문제가 발견되었습니다',
            testResults,
            recommendations: allTestsPassed ? [
                '챗봇에서 메시지를 보내보세요',
                'Supabase Table Editor에서 데이터를 확인하세요'
            ] : [
                'Supabase SQL Editor에서 테이블을 생성하세요',
                '환경변수가 올바르게 설정되었는지 확인하세요',
                'RLS(Row Level Security)가 비활성화되었는지 확인하세요'
            ]
        });

    } catch (error) {
        console.error('❌ 데이터베이스 테스트 오류:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}