// 간단한 테스트 API - OpenAI 연결 확인
export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 환경변수 확인
        const apiKey = process.env.OPENAI_API_KEY;
        
        const diagnostics = {
            timestamp: new Date().toISOString(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                vercelRegion: process.env.VERCEL_REGION || 'unknown'
            },
            apiKey: {
                exists: !!apiKey,
                length: apiKey ? apiKey.length : 0,
                startsWithSk: apiKey ? apiKey.startsWith('sk-') : false,
                preview: apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'null',
                isDefault: apiKey === 'your_openai_api_key_here'
            }
        };

        // 간단한 OpenAI API 테스트 (API 키가 유효한 경우)
        if (apiKey && apiKey.startsWith('sk-') && apiKey !== 'your_openai_api_key_here') {
            try {
                console.log('🧪 OpenAI API 테스트 시작...');
                
                const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-3.5-turbo',
                        messages: [
                            {
                                role: 'user',
                                content: '안녕하세요'
                            }
                        ],
                        max_tokens: 10
                    })
                });

                diagnostics.openaiTest = {
                    status: testResponse.status,
                    statusText: testResponse.statusText,
                    success: testResponse.ok
                };

                if (testResponse.ok) {
                    const testData = await testResponse.json();
                    diagnostics.openaiTest.response = testData.choices[0].message.content;
                    console.log('✅ OpenAI API 테스트 성공');
                } else {
                    const errorData = await testResponse.json().catch(() => ({}));
                    diagnostics.openaiTest.error = errorData;
                    console.log('❌ OpenAI API 테스트 실패:', errorData);
                }
            } catch (testError) {
                diagnostics.openaiTest = {
                    error: testError.message,
                    success: false
                };
                console.log('❌ OpenAI API 테스트 오류:', testError.message);
            }
        } else {
            diagnostics.openaiTest = {
                skipped: true,
                reason: 'Invalid or missing API key'
            };
        }

        return res.status(200).json({
            success: true,
            message: 'API 진단 완료',
            diagnostics
        });

    } catch (error) {
        console.error('테스트 API 오류:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}