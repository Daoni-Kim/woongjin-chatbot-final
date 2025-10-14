class WoongjinChatbot {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        // 설정 파일 로드 (API 키는 서버에서 관리)
        this.config = window.CONFIG || {};
        this.init();
        this.addInitialMessage();
        this.checkApiKeyStatus();
    }

    checkApiKeyStatus() {
        console.log('🔧 앱 설정 확인:');
        console.log('- Config 객체:', this.config);
        console.log('- Config 로드됨:', !!this.config);
        console.log('- 앱 이름:', this.config.APP_NAME || '기본값');
        console.log('- 버전:', this.config.VERSION || '1.0.0');
        console.log('- 보안 모드:', '✅ API 키 서버 관리');
        console.log('- 전역 CONFIG:', window.CONFIG);
    }

    initSpeechRecognition() {
        // Web Speech API 지원 확인
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'ko-KR';
            
            this.recognition.onstart = () => {
                console.log('🎤 음성인식 시작');
                this.voiceBtn.classList.add('recording');
                this.voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
                this.messageInput.placeholder = '음성을 인식하고 있습니다...';
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('🗣️ 인식된 텍스트:', transcript);
                this.messageInput.value = transcript;
                this.updateSendButton();
            };
            
            this.recognition.onend = () => {
                console.log('🎤 음성인식 종료');
                this.voiceBtn.classList.remove('recording');
                this.voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                this.messageInput.placeholder = '메시지를 입력하세요...';
            };
            
            this.recognition.onerror = (event) => {
                console.error('🚨 음성인식 오류:', event.error);
                this.voiceBtn.classList.remove('recording');
                this.voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                this.messageInput.placeholder = '메시지를 입력하세요...';
                
                if (event.error === 'not-allowed') {
                    alert('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
                }
            };
            
            this.isVoiceSupported = true;
            console.log('🎤 음성인식 지원: ✅');
        } else {
            this.isVoiceSupported = false;
            this.voiceBtn.style.display = 'none';
            console.log('🎤 음성인식 지원: ❌ (브라우저에서 지원하지 않음)');
        }
    }

    toggleVoiceRecognition() {
        if (!this.isVoiceSupported) {
            alert('이 브라우저는 음성인식을 지원하지 않습니다.');
            return;
        }

        if (this.voiceBtn.classList.contains('recording')) {
            // 녹음 중지
            this.recognition.stop();
        } else {
            // 녹음 시작
            try {
                this.recognition.start();
            } catch (error) {
                console.error('음성인식 시작 오류:', error);
                alert('음성인식을 시작할 수 없습니다. 다시 시도해주세요.');
            }
        }
    }

    init() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.menuBtn = document.getElementById('menuBtn');
        this.menuOverlay = document.getElementById('menuOverlay');
        this.closeMenuBtn = document.getElementById('closeMenuBtn');
        
        // 음성인식 초기화
        this.initSpeechRecognition();

        // Event listeners
        this.sendBtn.addEventListener('click', () => this.handleSendMessage());
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceRecognition());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSendMessage();
            }
        });
        this.messageInput.addEventListener('input', () => this.updateSendButton());

        this.menuBtn.addEventListener('click', () => this.showMenu());
        this.closeMenuBtn.addEventListener('click', () => this.hideMenu());
        this.menuOverlay.addEventListener('click', (e) => {
            if (e.target === this.menuOverlay) {
                this.hideMenu();
            }
        });

        // Menu item listeners
        document.querySelectorAll('.menu-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.hideMenu();
                this.handleQuickReply(action);
            });
        });

        // Responsive handling
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());

        this.updateSendButton();
    }

    handleResize() {
        // Adjust layout based on screen size
        const isDesktop = window.innerWidth >= 1024;
        const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        
        // Update message container padding for better spacing
        if (isDesktop) {
            document.documentElement.style.setProperty('--message-spacing', '2rem');
        } else if (isTablet) {
            document.documentElement.style.setProperty('--message-spacing', '1.5rem');
        } else {
            document.documentElement.style.setProperty('--message-spacing', '1rem');
        }
    }

    addInitialMessage() {
        const initialMessage = {
            id: Date.now(),
            type: 'bot',
            content: '안녕하세요! 웅진씽크빅 고객센터입니다 😊\n\n셀프서비스로 처리하실 업무를 선택해주세요.',
            timestamp: new Date(),
            quickReplyButtons: [
                '결제카드',
                '연락처/주소',
                '포인트/마일리지',
                '즉시결제',
                '학습시간',
                '멤버십확인',
                '학습/진도'
            ],
            actionButton: '상담원 연결',
            isInitial: true // 초기 메시지임을 표시
        };
        this.addMessage(initialMessage);
    }

    addMessage(message) {
        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
    }

    renderMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.type}`;
        messageElement.innerHTML = this.getMessageHTML(message);
        
        this.messagesContainer.appendChild(messageElement);

        // Add event listeners for buttons
        if (message.quickReplyButtons || message.actionButton) {
            this.addButtonListeners(messageElement, message);
        }
    }

    getMessageHTML(message) {
        let html = '';
        
        if (message.type === 'bot') {
            html += `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
            `;
        }

        html += `<div class="message-content">`;
        
        // Message bubble
        html += `
            <div class="message-bubble">
                ${message.content}
            </div>
        `;

        // Cards
        if (message.cards) {
            message.cards.forEach(card => {
                html += this.getCardHTML(card);
            });
        }

        // Quick reply buttons and action button
        if (message.quickReplyButtons || message.actionButton) {
            // 초기 메시지인 경우 특별한 그리드 레이아웃 사용
            if (message.isInitial) {
                html += `<div class="initial-buttons-grid">`;
                
                if (message.quickReplyButtons) {
                    message.quickReplyButtons.forEach(reply => {
                        html += `
                            <button class="initial-quick-reply-btn" data-reply="${reply}">
                                ${reply}
                            </button>
                        `;
                    });
                }

                if (message.actionButton) {
                    html += `
                        <button class="initial-action-btn" data-action="${message.actionButton}">
                            <i class="fas fa-comments"></i>
                            <span>${message.actionButton}</span>
                        </button>
                    `;
                }
                
                html += `</div>`;
            } else {
                // 일반 메시지의 flex-wrap 레이아웃 (리액트 스타일)
                html += `<div class="quick-replies">`;
                
                if (message.quickReplyButtons) {
                    message.quickReplyButtons.forEach(reply => {
                        html += `
                            <button class="quick-reply-btn" data-reply="${reply}">
                                ${reply}
                            </button>
                        `;
                    });
                }

                if (message.actionButton) {
                    html += `
                        <button class="action-btn" data-action="${message.actionButton}">
                            <i class="fas fa-comments"></i>
                            <span>${message.actionButton}</span>
                        </button>
                    `;
                }
                
                html += `</div>`;
            }
        }

        // Timestamp
        html += `
            <div class="message-time">
                ${message.timestamp.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </div>
        `;

        html += `</div>`;
        return html;
    }

    getCardHTML(card) {
        if (card.type === 'progress') {
            let html = `
                <div class="message-card progress-card">
                    <div class="card-title">
                        📚 이번 주 학습 현황
                    </div>
            `;
            
            card.data.forEach(item => {
                const statusClass = item.progress >= 90 ? 'excellent' : 
                                  item.progress >= 70 ? 'good' : 'needs-work';
                
                html += `
                    <div class="progress-item">
                        <div class="progress-header">
                            <span class="subject-name">${item.subject}</span>
                            <div class="progress-info">
                                <span class="progress-percent">${item.progress}%</span>
                                <span class="status-badge status-${statusClass}">${item.status}</span>
                            </div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill progress-${statusClass}" style="width: ${item.progress}%"></div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
            return html;
        }

        if (card.type === 'service') {
            let html = `
                <div class="message-card service-card">
                    <div class="card-title">
                        💎 이용 서비스
                    </div>
            `;
            
            card.data.forEach(service => {
                const statusClass = service.status === '이용중' ? 'active' : 'auto';
                
                html += `
                    <div class="service-item">
                        <div class="service-header">
                            <span class="service-name">${service.name}</span>
                            <span class="service-status status-${statusClass}">${service.status}</span>
                        </div>
                        <div class="service-date">${service.date}</div>
                    </div>
                `;
            });
            
            html += `</div>`;
            return html;
        }

        if (card.type === 'delivery') {
            return `
                <div class="message-card delivery-card">
                    <div class="card-title">
                        📦 배송 정보
                    </div>
                    <div class="delivery-info">
                        <div class="delivery-row">
                            <span class="delivery-label">운송장번호:</span>
                            <span class="delivery-value tracking-number">${card.data.trackingNumber}</span>
                        </div>
                        <div class="delivery-row">
                            <span class="delivery-label">배송업체:</span>
                            <span class="delivery-value">${card.data.company}</span>
                        </div>
                        <div class="delivery-row">
                            <span class="delivery-label">상태:</span>
                            <span class="delivery-status">${card.data.status}</span>
                        </div>
                        <div class="delivery-expected">
                            <span>🚚 ${card.data.expected}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        return '';
    }

    addButtonListeners(messageElement, message) {
        // Quick reply buttons (일반)
        messageElement.querySelectorAll('.quick-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const reply = btn.dataset.reply;
                this.handleQuickReply(reply);
            });
        });

        // Initial quick reply buttons (초기 메시지)
        messageElement.querySelectorAll('.initial-quick-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const reply = btn.dataset.reply;
                this.handleQuickReply(reply);
            });
        });

        // Action button (일반)
        const actionBtn = messageElement.querySelector('.action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', () => {
                const action = actionBtn.dataset.action;
                this.handleActionButton(action);
            });
        }

        // Initial action button (초기 메시지)
        const initialActionBtn = messageElement.querySelector('.initial-action-btn');
        if (initialActionBtn) {
            initialActionBtn.addEventListener('click', () => {
                const action = initialActionBtn.dataset.action;
                this.handleActionButton(action);
            });
        }
    }

    async handleSendMessage() {
        const text = this.messageInput.value.trim();
        if (!text) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: text,
            timestamp: new Date()
        };

        this.addMessage(userMessage);
        this.messageInput.value = '';
        this.updateSendButton();

        // OpenAI API를 통해 응답 생성
        this.simulateTyping(async () => {
            try {
                const aiResponse = await this.getOpenAIResponse(text);
                const botResponse = {
                    id: Date.now(),
                    type: 'bot',
                    content: aiResponse,
                    timestamp: new Date()
                };
                this.addMessage(botResponse);
            } catch (error) {
                console.error('OpenAI API 오류:', error);
                // API 오류 시 기본 응답
                const fallbackResponse = {
                    id: Date.now(),
                    type: 'bot',
                    content: '죄송합니다. 일시적인 오류가 발생했습니다.\n더 정확한 도움을 위해 아래 메뉴를 이용해주세요.',
                    timestamp: new Date(),
                    quickReplyButtons: [
                        '학습 현황 확인',
                        '결제 정보 조회',
                        '배송 현황 확인',
                        '문제 해결 도움'
                    ],
                    actionButton: '상담원 연결'
                };
                this.addMessage(fallbackResponse);
            }
        });
    }

    async getOpenAIResponse(userMessage) {
        console.log('🚀 AI 응답 요청 시작:', userMessage);

        try {
            // 서버리스 함수로 요청 (API 키 노출 없음)
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage
                })
            });

            console.log('📡 서버 응답 상태:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ 서버 오류:', errorData);
                throw new Error(`서버 오류: ${response.status} - ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            const responseText = data.response;
            
            console.log('✅ AI 응답 성공:', responseText);
            console.log('📊 응답 길이:', responseText.length + '자');
            return responseText;

        } catch (error) {
            console.error('🚨 AI 응답 요청 실패:', error);
            
            // 네트워크 오류 시 친화적인 메시지
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                return '네트워크 연결을 확인해주세요.\n잠시 후 다시 시도해주시거나 아래 메뉴를 이용해주세요.';
            }
            
            throw error;
        }
    }

    handleQuickReply(reply) {
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: reply,
            timestamp: new Date()
        };

        this.addMessage(userMessage);

        this.simulateTyping(() => {
            const botResponse = this.getBotResponse(reply);
            this.addMessage(botResponse);
        });
    }

    handleActionButton(action) {
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: action,
            timestamp: new Date()
        };

        this.addMessage(userMessage);

        this.simulateTyping(() => {
            const botResponse = {
                id: Date.now(),
                type: 'bot',
                content: '상담원 연결을 요청하셨습니다.\n\n잠시만 기다려주세요. 곧 전문 상담원이 도와드리겠습니다.',
                timestamp: new Date(),
                quickReplyButtons: [
                    '긴급 문의',
                    '일반 문의',
                    '기술 지원',
                    '결제 문의'
                ],
                actionButton: '전화 상담 예약'
            };
            this.addMessage(botResponse);
        });
    }

    getBotResponse(reply) {
        const responses = {
            // 메인 메뉴 응답
            '결제카드': {
                content: '결제카드 관리 서비스입니다.\n\n어떤 업무를 도와드릴까요?',
                quickReplyButtons: [
                    '자동이체 카드 등록',
                    '카드 변경',
                    '카드 삭제',
                    '카드 재등록'
                ],
                actionButton: '결제카드 전문상담'
            },
            '연락처/주소': {
                content: '연락처 및 주소 변경 서비스입니다.\n\n어떤 정보를 변경하시겠어요?',
                quickReplyButtons: [
                    '배송지 주소 변경',
                    '휴대폰 번호 수정',
                    '이메일 수정'
                ],
                actionButton: '정보변경 전문상담'
            },
            '포인트/마일리지': {
                content: '포인트/마일리지 관리 서비스입니다.\n\n어떤 서비스를 이용하시겠어요?',
                quickReplyButtons: [
                    '잔여 포인트 확인',
                    '사용 가능/소멸 예정일 확인',
                    '즉시 사용'
                ],
                actionButton: '포인트 전문상담'
            },
            '즉시결제': {
                content: '즉시결제 서비스입니다.\n\n어떤 결제를 진행하시겠어요?',
                quickReplyButtons: [
                    '미납 회비 즉시 결제',
                    '결제 완료 확인'
                ],
                actionButton: '결제 전문상담'
            },
            '학습시간': {
                content: '학습시간 관리 서비스입니다.\n\n어떤 서비스를 이용하시겠어요?',
                quickReplyButtons: [
                    '누적 학습시간 확인',
                    '수업 요일 변경',
                    '수업 시간 변경'
                ],
                actionButton: '학습시간 전문상담'
            },
            '멤버십확인': {
                content: '멤버십 확인 서비스입니다.\n\n어떤 정보를 확인하시겠어요?',
                quickReplyButtons: [
                    '약정/멤버십 잔여기간 조회',
                    '종료일 확인'
                ],
                actionButton: '멤버십 전문상담'
            },
            '학습/진도': {
                content: '학습/진도 관리 서비스입니다.\n\n어떤 변경을 원하시나요?',
                quickReplyButtons: [
                    '학년/단계 수정',
                    '교재/콘텐츠 진도 변경'
                ],
                actionButton: '학습진도 전문상담'
            },

            // 결제카드 세부 기능
            '자동이체 카드 등록': {
                content: '자동이체 카드 등록을 도와드리겠습니다.\n\n본인 확인 후 안전하게 등록해드릴게요.',
                quickReplyButtons: [
                    '본인 인증하기',
                    '카드 등록 절차',
                    '등록 가능 카드',
                    '다른 결제카드 업무'
                ],
                actionButton: '카드등록 전문상담'
            },
            '카드 변경': {
                content: '등록된 카드를 변경해드리겠습니다.\n\n본인 확인 후 안전하게 변경해드릴게요.',
                quickReplyButtons: [
                    '본인 인증하기',
                    '변경 절차 안내',
                    '현재 등록 카드 확인',
                    '다른 결제카드 업무'
                ],
                actionButton: '카드변경 전문상담'
            },
            '카드 삭제': {
                content: '등록된 카드를 삭제해드리겠습니다.\n\n본인 확인 후 안전하게 삭제해드릴게요.',
                quickReplyButtons: [
                    '본인 인증하기',
                    '삭제 절차 안내',
                    '삭제 시 주의사항',
                    '다른 결제카드 업무'
                ],
                actionButton: '카드삭제 전문상담'
            },
            '카드 재등록': {
                content: '카드 재등록을 도와드리겠습니다.\n\n본인 확인 후 안전하게 재등록해드릴게요.',
                quickReplyButtons: [
                    '본인 인증하기',
                    '재등록 절차 안내',
                    '재등록 사유 확인',
                    '다른 결제카드 업무'
                ],
                actionButton: '카드재등록 전문상담'
            },

            // 연락처/주소 세부 기능
            '배송지 주소 변경': {
                content: '배송지 주소 변경을 도와드리겠습니다.\n\n본인 확인 후 안전하게 변경해드릴게요.',
                quickReplyButtons: [
                    '본인 인증하기',
                    '주소 변경 절차',
                    '현재 배송지 확인',
                    '다른 연락처/주소 업무'
                ],
                actionButton: '주소변경 전문상담'
            },
            '휴대폰 번호 수정': {
                content: '휴대폰 번호 수정을 도와드리겠습니다.\n\n본인 확인 후 안전하게 수정해드릴게요.',
                quickReplyButtons: [
                    '본인 인증하기',
                    '번호 변경 절차',
                    '현재 번호 확인',
                    '다른 연락처/주소 업무'
                ],
                actionButton: '번호수정 전문상담'
            },
            '이메일 수정': {
                content: '이메일 수정을 도와드리겠습니다.\n\n본인 확인 후 안전하게 수정해드릴게요.',
                quickReplyButtons: [
                    '본인 인증하기',
                    '이메일 변경 절차',
                    '현재 이메일 확인',
                    '다른 연락처/주소 업무'
                ],
                actionButton: '이메일수정 전문상담'
            },

            // 포인트/마일리지 세부 기능
            '잔여 포인트 확인': {
                content: '현재 보유하신 포인트를 확인해드리겠습니다.\n\n포인트 내역을 조회 중입니다.',
                quickReplyButtons: [
                    '포인트 적립 내역',
                    '포인트 사용 내역',
                    '포인트 즉시 사용',
                    '다른 포인트 업무'
                ],
                actionButton: '포인트확인 전문상담'
            },
            '사용 가능/소멸 예정일 확인': {
                content: '포인트 사용 가능 기간과 소멸 예정일을 확인해드리겠습니다.\n\n포인트 유효기간을 조회 중입니다.',
                quickReplyButtons: [
                    '소멸 예정 포인트',
                    '포인트 연장 방법',
                    '포인트 즉시 사용',
                    '다른 포인트 업무'
                ],
                actionButton: '포인트기간 전문상담'
            },
            '즉시 사용': {
                content: '포인트를 즉시 사용하시겠습니까?\n\n사용 가능한 서비스를 안내해드리겠습니다.',
                quickReplyButtons: [
                    '교재 구매에 사용',
                    '수강료 할인 사용',
                    '사용 가능 포인트 확인',
                    '다른 포인트 업무'
                ],
                actionButton: '포인트사용 전문상담'
            },

            // 즉시결제 세부 기능
            '미납 회비 즉시 결제': {
                content: '미납 회비를 즉시 결제해드리겠습니다.\n\n결제 정보를 확인 중입니다.',
                quickReplyButtons: [
                    '미납 금액 확인',
                    '결제 방법 선택',
                    '결제 진행',
                    '다른 즉시결제 업무'
                ],
                actionButton: '미납결제 전문상담'
            },
            '결제 완료 확인': {
                content: '결제 완료 내역을 확인해드리겠습니다.\n\n최근 결제 내역을 조회 중입니다.',
                quickReplyButtons: [
                    '결제 영수증 발급',
                    '결제 내역 상세',
                    '다음 결제일 확인',
                    '다른 즉시결제 업무'
                ],
                actionButton: '결제확인 전문상담'
            },

            // 학습시간 세부 기능
            '누적 학습시간 확인': {
                content: '누적 학습시간을 확인해드리겠습니다.\n\n학습 통계를 조회 중입니다.',
                quickReplyButtons: [
                    '일별 학습시간',
                    '주별 학습시간',
                    '월별 학습시간',
                    '다른 학습시간 업무'
                ],
                actionButton: '학습시간확인 전문상담'
            },
            '수업 요일 변경': {
                content: '수업 요일을 변경해드리겠습니다.\n\n현재 수업 일정을 확인 중입니다.',
                quickReplyButtons: [
                    '현재 수업 일정',
                    '변경 가능 요일',
                    '요일 변경 신청',
                    '다른 학습시간 업무'
                ],
                actionButton: '수업요일변경 전문상담'
            },
            '수업 시간 변경': {
                content: '수업 시간을 변경해드리겠습니다.\n\n현재 수업 시간을 확인 중입니다.',
                quickReplyButtons: [
                    '현재 수업 시간',
                    '변경 가능 시간',
                    '시간 변경 신청',
                    '다른 학습시간 업무'
                ],
                actionButton: '수업시간변경 전문상담'
            },

            // 멤버십확인 세부 기능
            '약정/멤버십 잔여기간 조회': {
                content: '약정 및 멤버십 잔여기간을 조회해드리겠습니다.\n\n계약 정보를 확인 중입니다.',
                quickReplyButtons: [
                    '약정 상세 내용',
                    '멤버십 혜택 확인',
                    '연장 방법 안내',
                    '다른 멤버십 업무'
                ],
                actionButton: '멤버십조회 전문상담'
            },
            '종료일 확인': {
                content: '서비스 종료일을 확인해드리겠습니다.\n\n계약 종료 정보를 조회 중입니다.',
                quickReplyButtons: [
                    '자동 연장 설정',
                    '종료 전 안내',
                    '연장 신청',
                    '다른 멤버십 업무'
                ],
                actionButton: '종료일확인 전문상담'
            },

            // 학습/진도 세부 기능
            '학년/단계 수정': {
                content: '학년/단계를 수정해드리겠습니다.\n\n현재 학습 단계를 확인 중입니다.',
                quickReplyButtons: [
                    '현재 학년/단계',
                    '수정 가능 단계',
                    '단계 수정 신청',
                    '다른 학습/진도 업무'
                ],
                actionButton: '학년단계수정 전문상담'
            },
            '교재/콘텐츠 진도 변경': {
                content: '교재/콘텐츠 진도를 변경해드리겠습니다.\n\n현재 진도를 확인 중입니다.',
                quickReplyButtons: [
                    '현재 진도 확인',
                    '진도 조정 방법',
                    '진도 변경 신청',
                    '다른 학습/진도 업무'
                ],
                actionButton: '진도변경 전문상담'
            }
        };

        const response = responses[reply] || {
            content: '도움이 되셨기를 바라요!\n\n다른 문의사항이 있으시면 언제든 말씀해주세요.',
            quickReplyButtons: [
                '처음으로 돌아가기',
                '다른 서비스 이용',
                '고객센터 문의',
                '서비스 만족도'
            ],
            actionButton: '상담원 연결'
        };

        return {
            id: Date.now(),
            type: 'bot',
            content: response.content,
            timestamp: new Date(),
            cards: response.cards || null,
            quickReplyButtons: response.quickReplyButtons || null,
            actionButton: response.actionButton || null
        };
    }

    simulateTyping(callback) {
        this.isTyping = true;
        this.showTypingIndicator();
        
        setTimeout(() => {
            this.hideTypingIndicator();
            this.isTyping = false;
            callback();
        }, 1200);
    }

    showTypingIndicator() {
        const typingElement = document.createElement('div');
        typingElement.className = 'message bot typing-indicator';
        typingElement.id = 'typingIndicator';
        typingElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        this.messagesContainer.appendChild(typingElement);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingElement = document.getElementById('typingIndicator');
        if (typingElement) {
            typingElement.remove();
        }
    }

    updateSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendBtn.disabled = !hasText;
    }

    showMenu() {
        this.menuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus management for accessibility
        setTimeout(() => {
            this.closeMenuBtn.focus();
        }, 300);
    }

    hideMenu() {
        this.menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
        
        // Return focus to menu button
        this.menuBtn.focus();
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WoongjinChatbot();
});