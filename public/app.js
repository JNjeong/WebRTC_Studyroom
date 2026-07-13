import elements from "./elementCollection.js"; //전역변수 모음
import Filter from 'bad-words' //영문 욕설 필터링
import {rtcConfig} from "../config/stun.js" ; // webRTC STUN 설정 

//---------------------------------------------------------
// 전역변수 설정
const elementCol = elements
const filter = new Filter()

const socket = io();

const statusText = elementCol['statusText']

let localStream = null // 카메라/마이크 실행 -> MediaStream 객체 생성 
let peerConnection =null // webRTC 연결 객체 

let roomId= null // 방번호
let isCaller=false

let nickname = "";  // 사용자명
let isMicOn =true;  // 마이크 상태 flag
let isCameraOn=true; // 카메라 상태 flag

function filterEng(text){
    /*
    filter.clean(text): ***로 치환
    filter.isProfane(text): 있으면 true/ 없으면 false
        > .isProfane 으로 true값 반환되면 글자수만큼 하트로 대체하는건 수작업 필요
    
    filter.addWords("필터링할단어"): 필터링할 단어 추가
    filter.removeWords("필터링안할단어"): 해당단어 필터링안함
    
    */
}

elementCol["joinBtn"].addEventListener("click", async () => {
    nickname = elementCol["nicknameInput"].value.trim() || "익명";
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    const age = ageInput.value;
    if (!gender) {
        alert("성별을 선택해주세요.");
        return;
    }
    if (!age) {
        alert("나이를 입력해주세요.");
        return;
    }

    try{

        
        // TODO : 마이크 , 카메라 텍스트 변경
        // TODO : 마이크, 카메라 색변경
        
        // nickname, gender, age를 서버로 전송하여 입장 처리
        socket.emit("join", {
            nickname,
            gender,
            age
        });

        loginBox.classList.add("hidden")
        // 메인박스 숨기기
        addSystemMessage("입장 완료. 랜덤 매칭을 시작하세요.")
        
    } catch (error) {
        alert("카메라 또는 마이크 권한을 허용해야 이용할 수 있습니다.")
        console.log("###LOG: ", error)
    }
})





// ---------------------------------------------------------
// 기타 함수 설정


/* 사용자의 카메라와 마이크를 실행하는 함수 */
async function startLocalMedia(){
    localStream = await navigator.mediaDevices.getUserMedia({
        video : true,
        audio : true 
    }) 

    // 사용자의 카메라 스트림을 join.html의 localVideo에 출력하기 
    const localVideo = elementCol['localVideo']
    if(!localVideo){
        console.log('localVideo 찾을 수 x')
        return
    }
    localVideo.srcObject = localStream

}

/* 현재 연결 상태 표시 수정하기 */
function setStatus(text){
    statusText.textContent = text
}

//---------------------------------------------------------
// 채팅창 관련 함수



// 채팅창을 가장 아래로 이동
function scrollChatToBottom() {
    const chatMessages = elementCol["chatMessages"]

    if (!chatMessages) return

    chatMessages.scrollTop = chatMessages.scrollHeight
}

// addSystemMessage() 함수 시스템 메시지 출력
// message: 출력할 시스템 메시지
// chatMessages 요소에 시스템 메시지 추가 후 스크롤 이동
// 시스템 메시지 스타일링은 CSS에서 .system-message 클래스 정의 필요
function addSystemMessage(message) {
    const chatMessages = elementCol["chatMessages"]

    if (!chatMessages) {
        console.error("chatMessages 요소를 찾을 수 없습니다.")
        return
    }

    const systemMessage = document.createElement("div")
    systemMessage.classList.add("system-message")
    systemMessage.textContent = message

    chatMessages.appendChild(systemMessage)
    scrollChatToBottom()
}

// 일반 채팅 메시지 출력
// message: 출력할 채팅 메시지
// type: "me" 또는 "partner"로 메시지 유형 지정
// senderNickname: 상대방 닉네임
function addChatMessage(message, type, senderNickname) {
    const chatMessages = elementCol["chatMessages"]

    // chatMessages 요소가 존재하지 않으면 함수 종료
    if (!chatMessages) {
        console.error("chatMessages 요소를 찾을 수 없습니다.")
        return
    }

    // 메시지 박스 생성
    const messageBox = document.createElement("div")
    const nicknameElement = document.createElement("span")
    const messageElement = document.createElement("p")

    messageBox.classList.add("chat-message")

    // 메시지 유형에 따라 클래스 추가
    // "me"이면 내 메시지, "partner"이면 상대방 메시지
    if (type === "me") {
        messageBox.classList.add("my-message")
    } else {
        messageBox.classList.add("partner-message")
    }

    nicknameElement.classList.add("message-nickname")
    messageElement.classList.add("message-text")

    nicknameElement.textContent =
        type === "me"
            ? nickname || "나"
            : senderNickname || "상대방"

    // XSS 방지를 위해 innerHTML 대신 textContent 사용
    // textContent는 HTML 태그를 해석하지 않고 일반 텍스트로 처리
    // 방지 필요 이유 : 사용자가 입력한 메시지에 스크립트가 포함될 수 있음
    messageElement.textContent = message

    messageBox.append(nicknameElement, messageElement)
    chatMessages.appendChild(messageBox)

    scrollChatToBottom()
}

// 채팅 메시지 전송
function sendChatMessage() {
    const chatInput = elementCol["chatInput"]

    if (!chatInput) {
        console.error("chatInput 요소를 찾을 수 없습니다.")
        return
    }

    if (!roomId) {
        addSystemMessage("상대방과 매칭된 후 채팅할 수 있습니다.")
        return
    }

    const inputMessage = chatInput.value.trim()

    // 빈 메시지 방지
    if (!inputMessage) {
        chatInput.value = ""
        return
    }

    // 메시지 길이 제한
    if (inputMessage.length > 300) {
        alert("메시지는 최대 300자까지 입력할 수 있습니다.")
        return
    }

    // 클라이언트에서 영문 욕설 1차 필터링
    const filteredMessage = filterEng(inputMessage)

    // 서버는 users Map에서 닉네임을 확인하므로 nickname은 보내지 않음
    socket.emit("chat-message", {
        roomId,
        message: filteredMessage
    })

    // 내 화면에는 즉시 출력
    addChatMessage(
        filteredMessage,
        "me",
        nickname
    )

    chatInput.value = ""
    chatInput.focus()
}

// 새 매칭 시 이전 대화 초기화
function clearChatMessages() {
    const chatMessages = elementCol["chatMessages"]

    if (!chatMessages) return

    chatMessages.replaceChildren()
}

// 채팅 입력창 활성화 / 비활성화
function setChatEnabled(enabled) {
    const chatInput = elementCol["chatInput"]
    const sendBtn = elementCol["sendBtn"]
    const emojiButtons = elementCol["emojiButtons"]

    if (chatInput) {
        chatInput.disabled = !enabled;
        chatInput.placeholder = enabled
            ? "메시지를 입력하세요."
            : "상대방과 매칭 후 채팅할 수 있습니다."
    }

    if (sendBtn) {
        sendBtn.disabled = !enabled
    }

    if (emojiButtons) {
        emojiButtons.forEach((button) => {
            button.disabled = !enabled
        })
    }
}

// 이모지 버튼 등록
// 이모지 버튼 클릭 시 채팅 입력창에 해당 이모지 추가
function setupEmojiButtons() {
    const emojiButtons = elementCol["emojiButtons"]
    const chatInput = elementCol["chatInput"]

    if (!emojiButtons || !chatInput) return

    emojiButtons.forEach((button) => {
        button.addEventListener("click", () => {
            if (chatInput.disabled) return

            chatInput.value += button.textContent
            chatInput.focus()
        })
    })
}

// 채팅 form submit 이벤트
// form submit 시 페이지 새로고침 방지 및 sendChatMessage 호출
elementCol["chatForm"]?.addEventListener("submit", (event) => {
    event.preventDefault()
    sendChatMessage()
});

// 초기 상태에서는 채팅 비활성화
setChatEnabled(false)

// 이모지 버튼 이벤트 등록
setupEmojiButtons()


//---------------------------------------------------------
// webRTC 설정


// WebRTC 연결 객체를 생성하고 통신에 필요한 이벤트를 등록하는 함수

function createPeerConnection(){

    // 1) peerConnection 만들기 
    peerConnection = new RTCPeerConnection(rtcConfig)

    // 2) 사용자의 track 등록하기 
    if(localStream){
        localStream.getTracks().forEach((track)=>{
            peerConnection.addTrack(track, localStream)
        })
    }
    

    // 3) 상대의 영상/음성 track 오면 실행
    peerConnection.ontrack = (e)=>{
        const remoteStream = e.streams[0]
        //  join.html의 remoteVideo에서 상대방 화면 보여주기 
        const remoteVideo = elementCol['remoteVideo']
        if(!remoteVideo){
            console.log('remoteVideo 요소 x')
            return
        }

        remoteVideo.srcObject = remoteStream

    }

    // 4) 새로운 ICE Candidate가 생성되면 상대방에게 전달
      // peerConnection.setLocalDescription(offer) / setLocalDescription(answer)이 실행하면 
    // -> 브라우저에서 ice candidate(상대방이 나에게 연결할 수 있는 주소 후보) 찾기 시작 
    peerConnection.onicecandidate=(e)=>{
       if(e.candidate && roomId){
        socket.emit('ice-candidate',{roomId , candidate : e.candidate}) 
        // 서버를 통해 상대방이 접속할 수 있는 주소 후보와 roomId를 포함한 객체를 보낸다. 
       }
        
    }
    
    // +) webRTC 연결 상태가 변경될 때마다 실행 
    peerConnection.onconnectionstatechange= () =>{
        const currentState = peerConnection.connectionState
        console.log('현재 연결 상태',currentState)
        if (currentState === "connecting"){
            setStatus('연결 시도 중...')
      
          }
          else if (currentState === "connected"){
            setStatus('화상 연결 성공!')
          }
          else if(currentState === "disconnected"){
            setStatus('상대방의 네트워크 연결이 불안정함...')
          }
          else if(currentState === "failed"){
            setStatus('연결 실패... ')
            cleanupCall()
          }
          else if(currentState === "closed"){
            setStatus('통화 종료 ')
          }

                            
    }
}

// offer 생성하는 함수 
async function makeOffer(){

    if (!localStream) { 
        await startLocalMedia();
      }

    if(!peerConnection){
        createPeerConnection()
         
    }

    const offer = await peerConnection.createOffer()

    await peerConnection.setLocalDescription(offer)
    socket.emit('offer',{roomId, offer}) // 생성한 Offer를 서버를 통해 상대방에게 전송

    
}

// 상대방이 보낸 offer을 PeerConnection의 remoteDescription으로 등록
async function handleOffer(offer){

    if(!localStream){
        await startLocalMedia()
    }

    if(!peerConnection) createPeerConnection() // peerConnection 만들어지지 않았으면 생성하기 

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer)) // 상대방의 offer를 내 브라우저에 저장 

    const answer = await peerConnection.createAnswer() // 상대방의 offer에 대한 answer 생성
    await peerConnection.setLocalDescription(answer)
    socket.emit('answer',{roomId,answer}) // 서버를 통해 사용자의 answer을 상대방에게 보내기 
}

 // 상대방이 보낸 연결정보(answer)를 
 // 사용자 peerConnection의 reomte Description으로 저장 
async function handleAnswer(answer) {
    if(!peerConnection){
        console.log('peerConnection 생성 안됨..')
        return
    }
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer)); 
   
  }

async function handleIceCandidate(candidate){ // 상대방으로부터 상대방에게 접속할 수 있는 주소 후보를 받았을 때 
    if(!peerConnection) return
    try{
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)) // 상대방이 보내준 ice candidate를 peerConnection 에 등록 

    }
    catch(error){
        console.error('후보 등록 실패:',error)
    }
}

// webRTC 연결 종료 및 초기화하는 함수 
function resetPeerConnection() {
    if (peerConnection) {
      peerConnection.ontrack = null
      peerConnection.onicecandidate = null
      peerConnection.onconnectionstatechange = null
      peerConnection.close()
      peerConnection = null
    }
  }

  // 연결 종료 시 peerConnection 관련 정보 초기화 
  function cleanupCall() {
    resetPeerConnection()
    roomId = null
    isCaller = false
    if(elementCol['remoteVideo']){
    elementCol["remoteVideo"].srcObject = null
    }
    // partnerLabel.textContent = "상대"
    setChatEnabled(false)
  }  


// ---------------------------------------------------------
// socket 설정

//입장
// 서버에서 입장 완료 응답
socket.on("joined", ({ socketId }) => {
    console.log("입장 완료. 내 소켓 ID:", socketId)
})

// 매칭 대기
// 대기 상태
socket.on("waiting", () => {
    addSystemMessage("상대방을 기다리는 중입니다.")
    setChatEnabled(false)
})

// 대기 취소
socket.on("waiting-canceled", () => {
    addSystemMessage("매칭 대기를 취소했습니다.")
    setChatEnabled(false)
})




//----------------------------------------------------
/* WebRTC 관련  */


// 서버로부터 matched 이벤트를 받고 webRTC 연결을 준비 
// matched 이벤트는 서버에서 상대방과 매칭이 완료되었을 때 발생
socket.on('matched',async(data)=>{

    roomId = data.roomId
    isCaller= data.isCaller

    clearChatMessages() // 이전 대화 초기화
    addSystemMessage(`${data.partnerNickname}님과 매칭되었습니다.`)
    setChatEnabled(true) // 채팅 활성화

    console.log('방 번호 :',roomId)
    console.log('내가 Caller인지: ',isCaller)
    console.log('상대방 이름:',data.partnerNickname)
    

    if(!localStream){// 카메라와 마이크 실행하기
        await startLocalMedia()
    }

    if(!peerConnection){ // WebRTC 연결 객체 생성 
        createPeerConnection()
    }
    if (isCaller) {
        // 내가 먼저 거는 사람이면 offer을 생성하고 전송하기 
        await makeOffer()
    }

})

// webRTC 시그널링 
socket.on('offer',async({offer})=>{ // 상대방으로부터 offer을 받았을 때 handleOffer() 함수 실행
    await handleOffer(offer)
})

socket.on('answer',async({answer})=>{ // 상대방으로부터 answer을 받았을 때 handleAnswer() 함수 실행 
    await handleAnswer(answer)
})

socket.on('ice-candidate',async({candidate})=>{
    await handleIceCandidate(candidate)
})
//----------------------------------------------------

// 실시간 채팅 관련

// 상대방 메세진 수신
socket.on("chat-message", ({ message, senderNickname }) => {
    if(!message) return

    addChatMessage(
        message,
        "partner",
        senderNickname
    )
})

// 서버 채팅 검증 실패
socket.on("chat-error", ({ message }) => {
    addSystemMessage( message || "메시지 전송에 실패했습니다.")
})

//퇴장
// 상대방이 나간 경우
socket.on("partner-left", () => {
    addSystemMessage("상대방이 나갔습니다.")
    setChatEnabled(false)
    resetPeerConnection() // webRTC 연결 종료 및 초기화
    roomId = null // 방번호 초기화
})

// 상대방이 연결을 끊은 경우
socket.on("partner-disconnected", () => {
    addSystemMessage("상대방이 연결을 끊었습니다.")
    setChatEnabled(false)
    resetPeerConnection() // webRTC 연결 종료 및 초기화
    roomId = null // 방번호 초기화
})

// 10분 대화 시간 종료
socket.on("time-out", () => {
    addSystemMessage("기본 10분 대화 시간이 종료되었습니다.")
    setChatEnabled(false)
    resetPeerConnection() // webRTC 연결 종료 및 초기화
    roomId = null // 방번호 초기화
})

// 서버 연결 관련
// 서버 연결 완료
socket.on("connect", () => {
    console.log("서버 연결 완료. 내 소켓 ID:", socket.id)
})

// 서버 연결 끊김
socket.on("disconnect", () => {
    console.log("서버 연결 끊김")
    addSystemMessage("서버 연결이 끊겼습니다.")
    setChatEnabled(false)
    resetPeerConnection() // webRTC 연결 종료 및 초기화
    roomId = null // 방번호 초기화
})  
