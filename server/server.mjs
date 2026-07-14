import express from "express"
import http from "http"
import {Server} from "socket.io"
import path from "path"
//import ProfanityFilter from "korean-profanity-filter"
import fs from "fs"
import { fileURLToPath } from "url"

const app = express()
const server = http.createServer(app)    // HTTP 서버 생성(소켓과 공유하기 위함)

const io = new Server(server)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use(express.static(path.join(__dirname, "public")))

let waitingUser = null;      // 매칭을 기다리는 한명의 사용자 소켓 객체를 저장(없으면 null)
const maleQueue = [];   //남자 대기열
const femaleQueue = [];    // 여자대기열
const users = new Map()     // 현재 접속중인 유저 정보를 저장하는 Map객체 (key: 소켓ID, Value: 유저 정보)
const roomTimers = new Map()// 10분 타이머 관리하는 객체


// function run(){
//     console.log(ProfanityFilter.check("씨발"))
// }
// run()

const filterConfigPath = path.join(__dirname, "..", "config", "KoreanFilterRegex.json")
const { korfilter } = JSON.parse(fs.readFileSync(filterConfigPath, "utf-8"))
const profanityRegex = new RegExp(korfilter, "gi")
// 메시지 안의 비속어를 찾아 같은 글자수의 '*'로 치환해서 돌려주는 함수
function filterProfanity(message) {
    // regex에 g 플래그가 있으므로 lastIndex가 남아있지 않도록 매번 새로 검사
    profanityRegex.lastIndex = 0
    const hasProfanity = profanityRegex.test(message)

    profanityRegex.lastIndex = 0
    const filteredMessage = message.replace(profanityRegex, (matched) => "*".repeat(matched.length))

    return { filteredMessage, hasProfanity }
}

function createRoomID(socketA, socketB) {   // 두 사용자의 소켓 ID를 조합하여 방 ID 생성
    return `room-${socketA.id}-${socketB.id}`
}

function handleRoomTimeOut(roomId) {        // 10분 타이머가 끝나면 매칭 종료(방 폭파)
    console.log("시간이 만료되어 매칭을 끝냅니다.")

    const roomSockets = io.sockets.adapter.rooms.get(roomId)

    if(roomSockets) {
        for (const socketId of [...roomSockets]) {
            const socket = io.sockets.sockets.get(socketId)
            if(socket) {
                socket.emit("time-out")

                const user = users.get(socketId)
                if (user) {
                    user.roomId = null
                    user.isCaller = false
                    users.set(socketId, user)
                }
                socket.leave(roomId)
            }
        }
    }

    roomTimers.delete(roomId)
}

function leaveCurrentRoom(socket) {         // 방에서 퇴장하고 상대방에게 알리는 함수
    const user = users.get(socket.id)
    if(!user || !user.roomId) return        // 방에 참여하고 있지 않다면 종료
    
    const roomId = user.roomId
    
    if (roomTimers.has(roomId)) {
        clearTimeout(roomTimers.get(roomId))
        roomTimers.delete(roomId)
        console.log(`[타이머 취소] 10분이 되기 전 매칭이 끝나 타이머 해제 : ${roomId}`)
    }

    socket.to(roomId).emit("partner-left")   // 같은 방 상대방에게 "partner-left" 이벤트 발송(화면 정리)
    socket.leave(roomId)                    //  Socket.io의 룸에서 나감

    user.roomId = null
    user.isCaller = false
    users.set(socket.id, user)
}

// 남녀 매칭 함수
function tryMatch() {
    if (maleQueue.length > 0 && femaleQueue.length > 0) {
        const male = maleQueue.shift()
        const female = femaleQueue.shift()

        const roomId = createRoomID(male, female)
        const userA = users.get(male.id)
        const userB = users.get(female.id)

        if (!userA || !userB) return

        male.join(roomId)
        female.join(roomId)

        userA.roomId = roomId
        userA.isCaller = true
        userB.roomId = roomId
        userB.isCaller = false

        users.set(male.id, userA)
        users.set(female.id, userB)

        male.emit("matched", {
            roomId,
            isCaller: true,
            partnerNickname: userB.nickname
        })
        female.emit("matched", {
            roomId,
            isCaller: false,
            partnerNickname: userA.nickname
        })

        const timeoutId = setTimeout(() => {
            handleRoomTimeOut(roomId)
        }, 10 * 60 * 1000)
        roomTimers.set(roomId, timeoutId)
    }
}

//  성별 큐에서 제거하는 함수
function removeFromQueues(socket) {
    const idxMale = maleQueue.indexOf(socket)
    if (idxMale !== -1) maleQueue.splice(idxMale, 1)

    const idxFemale = femaleQueue.indexOf(socket)
    if (idxFemale !== -1) femaleQueue.splice(idxFemale, 1)
}

// socket.io 실시간 이벤트 리스너 정의
io.on("connection", (socket) => {
    console.log("새로운 사용자가 연결되었습니다. 소켓ID:", socket.id)

    socket.on("join", ({ nickname, gender, age }) => {   // 유저가 이름/성별/나이 입력하고 입장했을 때
        users.set(socket.id, {
            nickname: nickname || "익명", 
            gender: gender,
            age: age,
            roomId: null, 
            isCaller: false,
        })

        socket.emit("joined", { socketId: socket.id })
    })

    // 사용자가 매칭 시작 버튼 눌렀을 때
    socket.on("find-match", () => {
        leaveCurrentRoom(socket)    // 혹시 기존 참여하던 방이 있다면 퇴장처리

        const user = users.get(socket.id)
        if(!user) return
        
        //성별별 큐에 넣기
        if(user.gender === "male") maleQueue.push(socket)
            else if(user.gender === "female") femaleQueue.push(socket)
        
        socket.emit("waiting")
        tryMatch()
        /* 
        if(waitingUser && waitingUser.id !== socket.id) {    // 대기열에 다른 사람이 있고, 그게 자기 자신이 아닐때 매칭 성사
            const partner = waitingUser  // 기다리던 상대를 partner로 지정
            waitingUser = null           // 대기열 비워둠
            
            const roomId = createRoomID(partner, socket)    // 방 ID 생성
            const userA = users.get(partner.id)             // 기다리던 상대 유저의 데이터
            const userB = users.get(socket.id)              // 매칭을 신청한 유저의 데이터
            
            if (!userA || !userB) return
            
            // 두 소켓을 동일한 방으로 입장
            partner.join(roomId)
            socket.join(roomId)
            
            // 기다리던 상대(A)를 Caller로 설정
            userA.roomId = roomId
            userA.isCaller = true
            
            // 방금 매칭을 누른 유저(B)
            userB.roomId = roomId
            userB.isCaller = false

            // 변경된 유저 상태를 Map에 저장
            users.set(partner.id, userA)
            users.set(socket.id, userB)

            partner.emit("matched", {       // A 유저에게 매칭 성공 알림 전송
                roomId,
                isCaller: true,
                partnerNickname: userB.nickname
            })

            socket.emit("matched", {       // B 유저에게 매칭 성공 알림 전송
                roomId,
                isCaller: false,
                partnerNickname: userA.nickname
            })

            const timeoutId = setTimeout(() => {        // 10분 타이머 설정 가동 로직
                handleRoomTimeOut(roomId)
            }, 10 * 60 * 1000)
            roomTimers.set(roomId, timeoutId)

        } else {        // 만약 대기열에 아무도 없다면 본인을 대기자로 등록하고 클라이언트에 waiting 전송
            waitingUser = socket
            socket.emit("waiting")
        }
        */
    })

    socket.on("cancel-waiting", () => {     // 대기열에 있던 유저가 매칭을 취소했을 때
        /* 
        
        if(waitingUser?.id === socket.id) {
            waitingUser = null
        }
        */
       removeFromQueues(socket)
        socket.emit("waiting-canceled")
    })



    // WebRTC 시그너링 중계 이벤트
    socket.on("offer", ({ roomId, offer }) => {
        socket.to(roomId).emit("offer", {offer})
    })
    socket.on("answer", ({ roomId, answer }) => {
        socket.to(roomId).emit("answer", {answer})
    })
    socket.on("ice-candidate", ({roomId, candidate}) => {
        socket.to(roomId).emit("ice-candidate", {candidate})
    })

    socket.on("chat-message", ({ roomId, message }) => {
        const user = users.get(socket.id)

        // 유효성 검증: 유저 정보/roomId/메시지가 없거나, 본인이 실제로 그 방에 속해있지 않으면 무시
        if (!user || !roomId || user.roomId !== roomId) {
            socket.emit("chat-error", { message: "매칭된 상대방이 없어 메시지를 보낼 수 없습니다." })
            return
        }

        if (typeof message !== "string" || !message.trim()) {
            return
        }

        // 서버에서도 300자 제한 (클라이언트단 검증 우회 방지)
        const trimmedMessage = message.trim().slice(0, 300)

        // 비속어 필터링 (korean-profanity-filter 패키지 대신 config/KoreanFilterRegex.json 정규식 사용)
        const { filteredMessage } = filterProfanity(trimmedMessage)

        // 상대방에게만 전송 (내 화면에는 app.js에서 이미 즉시 출력하고 있음)
        socket.to(roomId).emit("chat-message", {
            message: filteredMessage,
            senderNickname: user.nickname
        })
    })

    socket.on("disconnect", () => {         // 유저가 브라우저를 닫았을 때 발생
        console.log("사용자 연결이 끊어졌습니다.")

        removeFromQueues(socket)
        /*
        if (waitingUser?.id === socket.id) {
            waitingUser = null
        }
        */
        
        leaveCurrentRoom(socket)    // 방 퇴장 처리
        users.delete(socket.id)     // Map에서 삭제
    })
})


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`BlindMeet 서버가 구동되었습니다: http://localhost:${PORT}`);
});