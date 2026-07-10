import elements from "./elementCollection.js"; //전역변수 모음
import Filter from 'bad-words' //영문 욕설 필터링
import rtcConfig from "../config/stun.js" ; // webRTC STUN 설정 

//---------------------------------------------------------
// 전역변ㅅ 설정
const elementCol = elements
const filter = new Filter()

let localStream = null // 카메라/마이크 실행 -> MediaStream 객체 생성 

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
    localStream.getTracks().forEach((track)=>{
        peerConnection.addTrack(track, localStream)
    })

    // 3) 상대의 영상/음성 track 오면 실행
    peerConnection.ontrack = (e)=>{
        const remoteStream = e.streams[0]
        //  추후  상대방의 화상채팅 화면에 해당 media 보여주기 

    }

    // 4) 새로운 ICE Candidate가 생성되면 상대방에게 전달
    peerConnection.onicecandidate=(e)=>{
       // todo : socket.io를 통해 candidate 전송 
        
    }
    
    // +) webRTC 연결 상태가 변경될 때마다 실행 
    peerConnection.onconnectionstatechange= () =>{
        const currentState = peerConnection.connectionState
        console.log('현재 연결 상태',currentState)

        //                     
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