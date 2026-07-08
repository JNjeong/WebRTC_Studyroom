import elements from "./elementCollection.js"; //전역변수 모음
import Filter from 'bad-words' //영문 욕설 필터링


//---------------------------------------------------------
// 전역변ㅅ 설정
const elementCol = elements
const filter = new Filter()

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





//---------------------------------------------------------
// webRTC 설정


// ---------------------------------------------------------
// socket 설정