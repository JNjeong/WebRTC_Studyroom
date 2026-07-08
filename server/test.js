// server/filterTest.js
// import ProfanityFilter from "korean-profanity-filter"; // ES 모듈 방식
// CommonJS라면: 
const { ProfanityFilter } = require("korean-profanity-filter");

const filter = new ProfanityFilter();

// 테스트용 문장
const samples = [
  "이 문장은 깨끗합니다",
  "이 문장에는 욕설이 들어있어 시발",
  "닉네임: 욕설닉네임",
  "안녕하세요"
];

samples.forEach(text => {
  const result = filter.check(text);
  console.log(`"${text}" → ${result ? "비속어 포함" : "정상"}`);
});
