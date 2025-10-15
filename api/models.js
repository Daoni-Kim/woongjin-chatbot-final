// OpenAI 사용 가능한 모델 확인 API
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
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey || !apiKey.startsWith('sk-')) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log('🔍 OpenAI 모델 목록 조회 시작...');

        // OpenAI 모델 목록 API 호출
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ 모델 목록 조회 실패:', response.status, errorData);
            return res.status(response.status).json({ 
                error: 'Failed to fetch models',
                details: errorData 
            });
        }

        const data = await response.json();
        
        // GPT 모델만 필터링
        const gptModels = data.data
            .filter(model => model.id.includes('gpt'))
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(model => ({
                id: model.id,
                created: new Date(model.created * 1000).toISOString(),
                owned_by: model.owned_by
            }));

        // 특정 모델들 테스트
        const testModels = [
            'gpt-5-mini',
            'gpt-5',
            'gpt-4o-mini',
            'gpt-4o',
            'gpt-4-turbo',
            'gpt-3.5-turbo'
        ];

        const modelTests = {};
        
        for (const modelId of testModels) {
            const modelExists = gptModels.some(m => m.id === modelId);
            modelTests[modelId] = {
                exists: modelExists,
                available: modelExists
            };
            
            // 실제 API 호출 테스트 (간단한 요청)
            if (modelExists) {
                try {
                    const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: modelId,
                            messages: [{ role: 'user', content: 'Hi' }],
                            max_tokens: 5
                        })
                    });
                    
                    modelTests[modelId].testResult = {
                        status: testResponse.status,
                        success: testResponse.ok
                    };
                    
                    if (testResponse.ok) {
                        console.log(`✅ ${modelId} 테스트 성공`);
                    } else {
                        console.log(`❌ ${modelId} 테스트 실패: ${testResponse.status}`);
                    }
                } catch (testError) {
                    modelTests[modelId].testResult = {
                        error: testError.message,
                        success: false
                    };
                    console.log(`❌ ${modelId} 테스트 오류:`, testError.message);
                }
            }
        }

        return res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            totalModels: data.data.length,
            gptModels: gptModels,
            modelTests: modelTests,
            recommendation: {
                current: 'gpt-4o-mini',
                reason: 'Best balance of performance and cost',
                alternatives: ['gpt-4o', 'gpt-4-turbo']
            }
        });

    } catch (error) {
        console.error('모델 조회 오류:', error);
        return res.status(500).json({
            error: 'Failed to check models',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}