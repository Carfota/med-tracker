let meds = JSON.parse(localStorage.getItem('my_medications')) || [];
// سجل تاريخي دائم لجميع السنوات والأيام
let medHistory = JSON.parse(localStorage.getItem('my_medications_history')) || [];

const audio = document.getElementById('alarm-audio');
const volumeSlider = document.getElementById('volumeSlider');
const modal = document.getElementById('alarm-modal');
const customAudioFileInput = document.getElementById('customAudioFile');
const audioStatusText = document.getElementById('audioStatusText');

let activeAlarmMed = null;
let triggeredToday = {};
let snoozeTimeouts = {};

// تحويل من صيغة 24 ساعة إلى 12 ساعة
function formatTo12Hour(time24) {
  if (!time24) return '';
  let [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// مفتاح تاريخ اليوم بصيغة YYYY-MM-DD
function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// استرجاع النغمة المخصصة
const savedCustomAudio = localStorage.getItem('custom_alarm_sound');
if (savedCustomAudio) {
  audio.src = savedCustomAudio;
  audioStatusText.innerText = 'النغمة الحالية: تم اختيار نغمة من الهاتف';
}

// رفع نغمة من الهاتف
customAudioFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const base64Audio = event.target.result;
    try {
      localStorage.setItem('custom_alarm_sound', base64Audio);
      audio.src = base64Audio;
      audioStatusText.innerText = `النغمة الحالية: ${file.name}`;
      alert('تم حفظ النغمة بنجاح!');
    } catch (err) {
      alert('الملف الصوتي كبير الحجم، يرجى اختيار ملف نغمة خفيف.');
    }
  };
  reader.readAsDataURL(file);
});

// إعدادات الصوت
volumeSlider.value = localStorage.getItem('med_alarm_volume') || 1;
audio.volume = parseFloat(volumeSlider.value);

volumeSlider.addEventListener('input', (e) => {
  audio.volume = e.target.value;
  localStorage.setItem('med_alarm_volume', e.target.value);
});

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

// نوع التكرار
const recurrenceSelect = document.getElementById('med-recurrence');
const weeklyBox = document.getElementById('box-weekly-day');
const monthlyBox = document.getElementById('box-monthly-day');

recurrenceSelect.addEventListener('change', (e) => {
  weeklyBox.classList.add('hidden');
  monthlyBox.classList.add('hidden');
  if (e.target.value === 'weekly') weeklyBox.classList.remove('hidden');
  if (e.target.value === 'monthly') monthlyBox.classList.remove('hidden');
});

const weekDaysArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// فحص المواعيد والساعة
function updateClockAndCheck() {
  const now = new Date();
  
  let rawHours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const period = rawHours >= 12 ? 'م' : 'ص';
  const displayHours = rawHours % 12 || 12;
  
  document.getElementById('clock').innerText = `${displayHours}:${minutes}:${seconds} ${period}`;

  const currentTime = `${String(rawHours).padStart(2, '0')}:${minutes}`;
  const currentDayOfWeek = now.getDay();
  const currentDayOfMonth = now.getDate();

  meds.forEach(med => {
    let shouldTrigger = false;

    if (med.time === currentTime) {
      if (med.recurrence === 'daily') {
        shouldTrigger = true;
      } else if (med.recurrence === 'weekly' && parseInt(med.day) === currentDayOfWeek) {
        shouldTrigger = true;
      } else if (med.recurrence === 'monthly' && parseInt(med.day) === currentDayOfMonth) {
        shouldTrigger = true;
      }
    }

    if (shouldTrigger && !triggeredToday[med.id + '_' + currentTime]) {
      triggerAlarm(med);
      triggeredToday[med.id + '_' + currentTime] = true;
    }
  });

  if (currentTime === "00:00") {
    triggeredToday = {};
    renderMeds();
  }
}

setInterval(updateClockAndCheck, 1000);

// تشغيل المنبه
function triggerAlarm(med) {
  activeAlarmMed = med;
  document.getElementById('alarm-med-name').innerText = med.name;
  document.getElementById('alarm-med-dose').innerText = med.dose;
  modal.classList.remove('hidden');

  audio.currentTime = 0;
  audio.play().catch(err => {
    console.log("يلزم التفاعل مع الصفحة للسماح بالتشغيل التلقائي للصوت");
  });

  if ('vibrate' in navigator) {
    navigator.vibrate([1000, 500, 1000, 500, 1000]);
  }
}

// زر تأكيد أخذ الدواء وتخزينه في السجل الدائم
document.getElementById('btn-stop-alarm').addEventListener('click', () => {
  audio.pause();
  audio.currentTime = 0;
  modal.classList.add('hidden');

  if (activeAlarmMed) {
    const now = new Date();
    const todayStr = getTodayDateString();
    const timeFormatted = formatTo12Hour(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    
    // إضافة لسجل الهيستوري الدائم
    const historyEntry = {
      id: Date.now(),
      medId: activeAlarmMed.id,
      medName: activeAlarmMed.name,
      dose: activeAlarmMed.dose,
      date: todayStr,
      takenAtTime: timeFormatted,
      fullTimestamp: now.toISOString()
    };

    medHistory.unshift(historyEntry); // إضافة في البداية
    localStorage.setItem('my_medications_history', JSON.stringify(medHistory));

    // إلغاء أي غفوة مجدولة لنفس الدواء
    if (snoozeTimeouts[activeAlarmMed.id]) {
      clearTimeout(snoozeTimeouts[activeAlarmMed.id]);
      delete snoozeTimeouts[activeAlarmMed.id];
    }

    renderMeds();
    renderHistory();
    activeAlarmMed = null;
  }
});

// ميزة الغفوة (10 دقائق)
document.getElementById('btn-snooze-alarm').addEventListener('click', () => {
  audio.pause();
  audio.currentTime = 0;
  modal.classList.add('hidden');

  if (activeAlarmMed) {
    const medToSnooze = activeAlarmMed;
    alert(`تم تأجيل التنبيه لدواء (${medToSnooze.name}) لمدة 10 دقائق.`);
    
    snoozeTimeouts[medToSnooze.id] = setTimeout(() => {
      triggerAlarm(medToSnooze);
    }, 10 * 60 * 1000); // 10 دقائق

    activeAlarmMed = null;
  }
});

// فحص هل تم أخذ الدواء اليوم
function isMedTakenToday(medId) {
  const todayStr = getTodayDateString();
  return medHistory.some(entry => entry.medId === medId && entry.date === todayStr);
}

// حفظ دواء جديد
document.getElementById('med-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const recType = recurrenceSelect.value;
  let recDay = null;

  if (recType === 'weekly') {
    recDay = document.getElementById('med-weekday').value;
  } else if (recType === 'monthly') {
    recDay = document.getElementById('med-monthday').value;
  }

  const newMed = {
    id: Date.now(),
    name: document.getElementById('med-name').value.trim(),
    dose: document.getElementById('med-dose').value.trim(),
    time: document.getElementById('med-time').value,
    recurrence: recType,
    day: recDay
  };

  meds.push(newMed);
  localStorage.setItem('my_medications', JSON.stringify(meds));
  e.target.reset();
  weeklyBox.classList.add('hidden');
  monthlyBox.classList.add('hidden');
  renderMeds();
});

// حذف ميعاد
function deleteMed(id) {
  meds = meds.filter(m => m.id !== id);
  localStorage.setItem('my_medications', JSON.stringify(meds));
  renderMeds();
}

// عرض قائمة الأدوية
function renderMeds() {
  const list = document.getElementById('med-list');
  list.innerHTML = '';

  if (meds.length === 0) {
    list.innerHTML = '<li style="text-align:center; color:#a0aec0; padding:15px;">لا توجد أدوية مسجلة</li>';
    return;
  }

  meds.sort((a, b) => a.time.localeCompare(b.time));

  meds.forEach(med => {
    let recLabel = 'يومياً';
    if (med.recurrence === 'weekly') {
      recLabel = `أسبوعياً (كل ${weekDaysArabic[med.day]})`;
    } else if (med.recurrence === 'monthly') {
      recLabel = `شهرياً (يوم ${med.day} في الشهر)`;
    }

    const takenToday = isMedTakenToday(med.id);
    const statusHtml = takenToday 
      ? `<span class="status-indicator taken-yes">✔ تم أخذ جرعة اليوم</span>`
      : `<span class="status-indicator taken-no">⏳ في انتظار الجرعة</span>`;

    const li = document.createElement('li');
    li.className = 'med-item';
    li.innerHTML = `
      <div class="med-info">
        <h3>${med.name}</h3>
        <p>${med.dose}</p>
        <span class="tag-badge">${recLabel}</span>
        <div>${statusHtml}</div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        <span class="med-time-tag">${formatTo12Hour(med.time)}</span>
        <button class="btn-del" onclick="deleteMed(${med.id})">حذف</button>
      </div>
    `;
    list.appendChild(li);
  });
}

// عرض السجل التاريخي الدائم
function renderHistory() {
  const historyList = document.getElementById('history-list');
  historyList.innerHTML = '';

  if (medHistory.length === 0) {
    historyList.innerHTML = '<li style="text-align:center; color:#a0aec0; padding:15px;">لا توجد جرعات مسجلة في السجل بعد</li>';
    return;
  }

  medHistory.forEach(item => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <div>
        <div class="hist-title">${item.medName} (${item.dose})</div>
        <div style="font-size:12px; color:#718096; margin-top:2px;">تاريخ: ${item.date}</div>
      </div>
      <div class="hist-time">تم الأخذ: ${item.takenAtTime}</div>
    `;
    historyList.appendChild(li);
  });
}

// زر تصدير السجل وتحميله كملف نصي للرجوع له مع الطبيب
document.getElementById('btn-export-history').addEventListener('click', () => {
  if (medHistory.length === 0) {
    alert('السجل فارغ حالياً.');
    return;
  }

  let fileContent = "سجل التزام مواعيد الدواء الدائم:\n";
  fileContent += "====================================\n\n";

  medHistory.forEach((h, index) => {
    fileContent += `${index + 1}. الدواء: ${h.medName} | الجرعة: ${h.dose}\n   التاريخ: ${h.date} | وقت التأكيد: ${h.takenAtTime}\n------------------------------------\n`;
  });

  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `سجل_الأدوية_${getTodayDateString()}.txt`;
  a.click();


  if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker Registered'))
    .catch((err) => console.log('SW registration failed:', err));
}

  
});

renderMeds();
renderHistory();
