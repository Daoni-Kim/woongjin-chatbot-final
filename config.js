// OpenAI API 설정 파일
// 이 파일은 .gitignore에 추가하여 버전 관리에서 제외해야 합니다.

const CONFIG = {
    // 클라이언트 설정 (API 키는 서버에서 관리)
    APP_NAME: '웅진씽크빅 고객센터 챗봇',
    VERSION: '1.0.0',

    // UI 설정
    MAX_MESSAGE_LENGTH: 500,
    TYPING_DELAY: 1200,

    // 기능 설정
    ENABLE_VOICE: true,
    ENABLE_MENU: true
};

// Node.js 환경에서 사용
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// 브라우저 환경에서 사용
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}