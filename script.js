// script.js
console.log("这是我的第一个脚本！");

let a = 100;
let b = 200;
let result = a + b;

// 把结果写到 HTML 的 <p id="result"> 里
document.getElementById("result").textContent = "计算结果：" + result;