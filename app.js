let meds = JSON.parse(localStorage.getItem('my_medications')) || [];
const audio = document.getElementById('alarm-audio');
const volumeSlider = document.getElementById('volumeSlider');
const modal = document.getElementById('alarm-modal');
const customAudioFileInput = document.getElementById('customAudioFile');
const audioStatusText = document.getElementById('audioStatusText');

let triggeredToday = {};

// 1. تحويل الوقت من صيغة 24 إلى 12 ساعة (ص / م)
function formatTo12Hour(time24) {
  if (!time24) return '';
  let [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// 2. تحميل النغمة المخصصة المحفوظة إن وجدت
const savedCustomAudio = localStorage.getItem('custom_alarm_sound');
if (savedCustomAudio) {
  audio.src = savedCustomAudio;
  audioStatusText.innerText = 'النغمة الحالية: تم اختيار نغمة مخصصة من الهاتف';
}

// 3. رفع وحفظ نغمة من الهاتف محلياً كـ Data URL
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
      alert('الملف الصوتي كبير جداً على التخزين المحلي، يرجى اختيار ملف نغمة صغير الحجم.');
    }
  };
  reader.readAsDataURL(file);
});

// 4. مستوى الصوت
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

// 5. إظهار حقول اليوم بحسب نظام التكرار المختار
const recurrenceSelect = document.getElementById('med-recurrence');
const weeklyBox = document.getElementById('box-weekly-day');
const monthlyBox = document.getElementById('box-monthly-day');

recurrenceSelect.addEventListener('change', (e) => {
  weeklyBox.classList.add('hidden');
  monthlyBox.classList.add('hidden');
  if (e.target.value === 'weekly') weeklyBox.classList.remove('hidden');
  if (e.target.value === 'monthly') monthlyBox.classList.remove('hidden');
});

// 6. الساعة ونظام التنبيه اليومي / الأسبوعي / الشهري
const weekDaysArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function updateClockAndCheck() {
  const now = new Date();
  
  // صيغة 12 ساعة للساعة الكبيرة
  let rawHours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const period = rawHours >= 12 ? 'م' : 'ص';
  const displayHours = rawHours % 12 || 12;
  
  document.getElementById('clock').innerText = `${displayHours}:${minutes}:${seconds} ${period}`;

  // الوقت الحالي للمقارنة بصيغة 24 ساعة
  const currentTime = `${String(rawHours).padStart(2, '0')}:${minutes}`;
  const currentDayOfWeek = now.getDay(); // 0-6
  const currentDayOfMonth = now.getDate(); // 1-31

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

  if (currentTime === "00:00") triggeredToday = {};
}

setInterval(updateClockAndCheck, 1000);

// 7. تشغيل التنبيه
function triggerAlarm(med) {
  document.getElementById('alarm-med-name').innerText = med.name;
  document.getElementById('alarm-med-dose').innerText = med.dose;
  modal.classList.remove('hidden');

  audio.currentTime = 0;
  audio.play().catch(err => {
    console.log("يلزم تفاعل مسبق لتشغيل الصوت تلقائياً");
  });
}

// إيقاف التنبيه
document.getElementById('btn-stop-alarm').addEventListener('click', () => {
  audio.pause();
  audio.currentTime = 0;
  modal.classList.add('hidden');
});

// 8. حفظ الدواء
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
    let recLabel = 'يومياً';
    if (med.recurrence === 'weekly') {
      recLabel = `أسبوعياً (كل يوم ${weekDaysArabic[med.day]})`;
    } else if (med.recurrence === 'monthly') {
      recLabel = `شهرياً (يوم ${med.day} في الشهر)`;
    }

    const li = document.createElement('li');
    li.className = 'med-item';
    li.innerHTML = `
      <div class="med-info">
        <h3>${med.name}</h3>
        <p>${med.dose}</p>
        <span class="tag-badge">${recLabel}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span class="med-time-tag">${formatTo12Hour(med.time)}</span>
        <button class="btn-del" onclick="deleteMed(${med.id})">حذف</button>
      </div>
    `;
    list.appendChild(li);
  });
}

renderMeds();
