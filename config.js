// OpenAI API 설정 파일
// 이 파일은 .gitignore에 추가하여 버전 관리에서 제외해야 합니다.

const CONFIG = {
    // OpenAI API 키를 여기에 입력하세요
    OPENAI_API_KEY: 'YOUR_OPENAI_API_KEY_HERE',

    // API 설정
    OPENAI_MODEL: 'gpt-3.5-turbo',
    MAX_TOKENS: 250,
    TEMPERATURE: 0.7,

    // 시스템 프롬프트
    SYSTEM_PROMPT: `당신은 웅진씽크빅 고객센터의 친절한 AI 도우미 '씽키(Thinky)'입니다.

역할:
1. 웅진씽크빅 교육서비스(스마트올, 와이즈캠프, 북클럽 등) 일반 질문 답변
2. 구체적 업무(학습현황/결제정보/배송조회/정보변경)는 해당 메뉴 이용 안내
3. 친절하고 도움이 되는 톤으로 응답
4. 필요시 상담원 연결이나 관련 메뉴 안내

**중요: 답변은 반드시 300자 이내로 완전한 문장으로 작성하세요.**`
};

// Node.js 환경에서 사용
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// 브라우저 환경에서 사용
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}