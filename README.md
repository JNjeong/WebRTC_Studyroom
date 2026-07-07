전반적인 구조설명

webrtc-studyroom/ 
├── server/
│   ├── index.js            # Node.js 서버 진입점 (Express + Socket.io)
│   ├── signaling.js        # WebRTC 시그널링 로직 (offer/answer/ICE)
│   └── rooms.js            # 채널/스터디룸 관리 로직
│
├── public/
│   ├── index.html          # 메인 UI (화상/음성 채팅 화면)
│   ├── style.css           # UI/UX 스타일
│   ├── client.js           # 클라이언트 WebRTC 로직
│   └── ui.js               # UI 이벤트 처리 (버튼, 채널 선택 등)
│
├── config/
│   └── stun-turn.json      # STUN/TURN 서버 설정
│
├── package.json
└── README.md