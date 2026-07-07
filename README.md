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


--------------------------------------
GPT가 말아주는 파일설명 

server/index.js
- Express 서버 실행
- Socket.io 연결 (시그널링 서버 역할)
- 정적 파일(public/) 서빙

server/signaling.js
- 클라이언트 간 Offer/Answer/ICE Candidate 교환 처리
- socket.on("offer"), socket.on("answer"), socket.on("candidate") 이벤트 정의

server/rooms.js
- 스터디룸(채널) 관리
- 접속자 목록, 입장/퇴장 이벤트 처리

public/index.html
- UI: 화상 채팅 화면, 참여자 목록, 버튼(마이크 on/off, 카메라 on/off, 화면 공유 등)

public/client.js
- WebRTC 연결 로직
    - navigator.mediaDevices.getUserMedia()로 카메라/마이크 스트림 가져오기
    - RTCPeerConnection 생성
    - createOffer(), createAnswer() 처리
    - onicecandidate 이벤트로 ICE Candidate 서버에 전달
    - ontrack 이벤트로 상대방 영상/음성 표시

public/ui.js
- 버튼 이벤트 처리 (마이크 음소거, 카메라 끄기, 화면 공유 시작/종료)
- DOM 업데이트 (참여자 목록, 메시지 표시 등)

config/stun-turn.json
- STUN 서버: "stun:stun.l.google.com:19302"
- TURN 서버: 필요 시 계정/비밀번호 설정