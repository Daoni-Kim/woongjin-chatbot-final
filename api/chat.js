// Vercel 서버리스 함수 - OpenAI API 프록시
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
        const { message } = req.body;

        // 입력 검증
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Invalid message' });
        }

        // 메시지 길이 제한 (보안)
        if (message.length > 500) {
            return res.status(400).json({ error: 'Message too long' });
        }

        // 환경변수에서 API 키 가져오기
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            console.error('OpenAI API key not found');
            return res.status(500).json({ error: 'API key not configured' });
        }

        // OpenAI API 호출
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
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
                max_tokens: 250,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenAI API error:', response.status, errorData);
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

        return res.status(200).json({ 
            response: responseText,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}