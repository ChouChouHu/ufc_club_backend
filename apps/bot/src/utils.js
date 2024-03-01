import schedule from 'node-schedule';
import { sendTestMessage } from './external_services/discord_api';

export function formatMessageAsBlockquote(message) {
  return message
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

export function getAssignmentExpiredDate(
  assignmentName,
  startDate = '2024-02-21'
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(assignmentName)) return;
  // 將起始日期分解為年、月、日
  let [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  startDay += 5; // 起始日期為週三，加上五天為隔週一

  // 將 wxpy 字串中的周數和部分數字提取出來
  const weekNumber = parseInt(assignmentName.charAt(1), 10);
  const partNumber = parseInt(assignmentName.charAt(3), 10);

  // 計算該月第一天的日期
  const firstDayOfMonth = new Date(startYear, startMonth - 1, startDay);

  // 根據 wxpy 計算目標日期
  const targetDate = new Date(firstDayOfMonth);
  targetDate.setDate(
    firstDayOfMonth.getDate() +
      (weekNumber - 1) * 7 +
      partNumber +
      (weekNumber === 0 ? 2 : 0) // week0 start from Wednesday
  );

  // 格式化日期為 'yyyy-mm-dd'
  const formattedDate = targetDate.toISOString().split('T')[0];
  return formattedDate;
}

export function isDatePassed(inputDate) {
  if (!inputDate) return;
  const givenDate = new Date(inputDate);
  const currentDate = new Date();

  // Calculate the difference in days
  const diffDays = (currentDate - givenDate) / (1000 * 60 * 60 * 24);

  // Check if the current date is at least two days after the given date
  return diffDays > 2;
}

export function setSchedule(time, callback, content, channelID) {
  const timeArray = convertStringToArray(time);
  const scheduledTime = new Date(
    2024,
    timeArray[0] - 1,
    timeArray[1],
    timeArray[2],
    timeArray[3]
  );
  const reminderTime = new Date(scheduledTime.getTime() - 5 * 60000);

  schedule.scheduleJob(reminderTime, function () {
    // console.log(`提醒：將於5分鐘後發送訊息：${content}`);
    sendTestMessage(`提醒：將於5分鐘後發送訊息：
  
  ${content}`);
  });

  schedule.scheduleJob(scheduledTime, () => callback(content, channelID));
  console.log(`已排程 ${formatDate(scheduledTime)}`);
}

export function isTimeEarlierThanNow(time) {
  const currentTime = new Date();
  const year = currentTime.getFullYear();

  // 將給定的時間字符串轉換為 Date 物件
  const timeParts = time.split(' ');
  const datePart = timeParts[0];
  const monthDay = datePart.split('-');
  const month = parseInt(monthDay[0]) - 1; // JavaScript 中月份從 0 開始
  const day = parseInt(monthDay[1]);
  const timePart = timeParts[1];
  const hoursMinutes = timePart.split(':');
  const hours = parseInt(hoursMinutes[0]);
  const minutes = parseInt(hoursMinutes[1]);

  // 創建一個新的 Date 物件來表示給定的時間
  const givenTime = new Date(year, month, day, hours, minutes);

  // 比較時間
  return givenTime < currentTime;
}

function formatDate(date) {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${month}-${day} ${hours}:${minutes}`;
}

function convertStringToArray(str) {
  const matches = str.match(/\d+/g);
  return matches.map(Number);
}
