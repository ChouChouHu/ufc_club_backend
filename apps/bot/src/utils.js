import schedule from 'node-schedule';
import { sendTestMessage } from './external_services/discord_api';

export function setSchedule(time, callback, content) {
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

  schedule.scheduleJob(scheduledTime, () => callback(content));
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
