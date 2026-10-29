let meds = JSON.parse(localStorage.getItem('my_medications')) || [];
const audio = document.getElementById('alarm-audio');
const volumeSlider = document.getElementById('volumeSlider');
const modal = document.getElementById('alarm-modal');
let triggeredToday = {}; // لمنع تكرار التنبيه في نفس الدقيقة

// ضبط مستوى الصوت
volumeSlider.value = localStorage.getItem('med_alarm_volume') || 1;
audio.volume = parseFloat(volumeSlider.value);

volumeSlider.addEventListener('input', (e) => {
  audio.volume = e.target.value;
  localStorage.setItem('med_alarm_volume', e.target.value);
});

// تجربة الصوت
let isTesting = false;
document.getElementById('btn-test-sound').addEventListener('click', () => {
  if (!isTesting) {
    audio.play();
    document.getElementById('btn-test-sound').innerText = 'إيقاف التجربة';
    isTesting = true;
  } else {
    audio.pause();
    audio.currentTime = 0;
    document.getElementById('btn-test-sound').innerText = 'تجربة الصوت';
    isTesting = false;
  }
});

// تحديث الساعة والتحقق من التنبيهات
function updateClockAndCheck() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;

  document.getElementById('clock').innerText = `${hours}:${minutes}:${seconds}`;

  // فحص إذا كان الميعاد الحالي يطابق أي دواء
  meds.forEach(med => {
    if (med.time === currentTime && !triggeredToday[med.id + '_' + currentTime]) {
      triggerAlarm(med);
      triggeredToday[med.id + '_' + currentTime] = true;
    }
  });

  // إعادة ضبط التنبيهات في منتصف الليل
  if (currentTime === "00:00") triggeredToday = {};
}

setInterval(updateClockAndCheck, 1000);

// تشغيل المنبه وإظهار الشاشة
function triggerAlarm(med) {
  document.getElementById('alarm-med-name').innerText = med.name;
  document.getElementById('alarm-med-dose').innerText = med.dose;
  modal.classList.remove('hidden');

  audio.currentTime = 0;
  audio.play().catch(err => {
    console.log("الرجاء التفاعل مع الصفحة للسماح بتشغيل الصوت تلقائياً");
  });
}

// إيقاف المنبه
document.getElementById('btn-stop-alarm').addEventListener('click', () => {
  audio.pause();
  audio.currentTime = 0;
  modal.classList.add('hidden');
});

// حفظ دواء جديد
document.getElementById('med-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const newMed = {
    id: Date.now(),
    name: document.getElementById('med-name').value.trim(),
    dose: document.getElementById('med-dose').value.trim(),
    time: document.getElementById('med-time').value
  };

  meds.push(newMed);
  localStorage.setItem('my_medications', JSON.stringify(meds));
  e.target.reset();
  renderMeds();
});

// حذف دواء
function deleteMed(id) {
  meds = meds.filter(m => m.id !== id);
  localStorage.setItem('my_medications', JSON.stringify(meds));
  renderMeds();
}

// عرض القائمة
function renderMeds() {
  const list = document.getElementById('med-list');
  list.innerHTML = '';

  if (meds.length === 0) {
    list.innerHTML = '<li style="text-align:center; color:#a0aec0; padding:15px;">لا توجد أدوية مسجلة</li>';
    return;
  }

  meds.sort((a, b) => a.time.localeCompare(b.time));

  meds.forEach(med => {
    const li = document.createElement('li');
    li.className = 'med-item';
    li.innerHTML = `
      <div class="med-info">
        <h3>${med.name}</h3>
        <p>${med.dose}</p>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span class="med-time-tag">${med.time}</span>
        <button class="btn-del" onclick="deleteMed(${med.id})">حذف</button>
      </div>
    `;
    list.appendChild(li);
  });
}

renderMeds();
