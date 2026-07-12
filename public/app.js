import elements from "./elementCollection.js"; //전역변수 모음
import Filter from 'bad-words' //영문 욕설 필터링
import {rtcConfig} from "../config/stun.js" ; // webRTC STUN 설정 

//---------------------------------------------------------
// 전역변ㅅ 설정
const elementCol = elements
const filter = new Filter()

const socket = io();

let localStream = null // 카메라/마이크 실행 -> MediaStream 객체 생성 
let peerConnection =null // webRTC 연결 객체 

let roomId= null // 방번호

function filterEng(text){
    /*
    filter.clean(text): ***로 치환
    filter.isProfane(text): 있으면 true/ 없으면 false
        > .isProfane 으로 true값 반환되면 글자수만큼 하트로 대체하는건 수작업 필요
    
    filter.addWords("필터링할단어"): 필터링할 단어 추가
    filter.removeWords("필터링안할단어"): 해당단어 필터링안함
    
    */
}






// ---------------------------------------------------------
// 기타 함수 설정


/* 사용자의 카메라와 마이크를 실행하는 함수 */
async function startLocalMedia(){
    localStream = await navigator.mediaDevices.getUserMedia({
        video : true,
        audio : true 
    }) 
    // 추후 화상채팅 시작하면 사용자의 화면 출력하게 하기 
}


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
        //  추후  상대방의 화상채팅 화면에 해당 media 보여주기 

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

        //                     
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
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
      peerConnection = null;
    }
  }


// ---------------------------------------------------------
// socket 설정




//----------------------------------------------------
/* WebRTC 관련  */


// 서버로부터 matched 이벤트를 받고 webRTC 연결을 준비 
socket.on('matched',async({roomId : matchedRoomId , isCaller, partnerNickname})=>{

    roomId = matchedRoomId

    console.log('방 번호 :',roomId)
    console.log('내가 Caller인지: ',isCaller)
    console.log('상대방 이름:',partnerNickname)
    

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
