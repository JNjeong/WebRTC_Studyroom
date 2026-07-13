const element = {
    "loginBox" : document.getElementById("loginBox"),
    "nicknameInput" : document.getElementById("nicknameInput"),

    "ageInput" : document.getElementById("ageInput"),
    "joinBtn" : document.getElementById("joinBtn"),
    "myName": document.getElementById("myName"),

    // 실시간 채팅 관련 요소
    "chatMessages" : document.getElementById("chatMessages"),
    "chatForm" : document.getElementById("chatForm"),
    "chatInput" : document.getElementById("chatInput"),
    "sendBtn" : document.getElementById("sendBtn"),

    // 이모지 버튼 목록
    "emojiButtons" : document.querySelectorAll(".emojiBtn"),

    // 화상 화면 
    "localVideo": document.getElementById("localVideo"),
    "remoteVideo": document.getElementById("remoteVideo"),

    // 화상 채팅 중 현재 상태 
    'statusText' : document.getElementById('statusText')




    }

export default element