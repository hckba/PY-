//內有API
let allRecords = [];
let currentTab = 'diet';
let searchQuery = '';
let editingId = null;
let currentDate = new Date().toISOString().split('T')[0];
const todayStr = new Date().toISOString().split('T')[0]; 

// 新增：計算 115 年前的日期
const minDate = new Date();
minDate.setFullYear(minDate.getFullYear() - 115);
const minDateStr = minDate.toISOString().split('T')[0];

async function init() {
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.innerHTML = `
        <div class="loader-logo">🥗</div>
        <div class="mt-4 text-xl font-bold text-indigo-600 tracking-widest">FOOD WORLD</div>
        <div class="mt-2 text-slate-400 text-sm">正在開啟您的健康生活...</div>
    `;
    document.body.prepend(loader);

    await loadData();

    setTimeout(() => {
        const loaderEl = document.getElementById('loader');
        const appEl = document.getElementById('app');
        if (loaderEl) {
            loaderEl.style.opacity = '0';
            loaderEl.style.visibility = 'hidden';
        }
        if (appEl) appEl.classList.add('loaded');
    }, 2000);
}
//讀取資料  呼叫 fetch('/api/records') 取得所有歷史紀錄
async function loadData() {//讀取資料  呼叫 fetch('/api/records') 取得所有歷史紀錄
    const res = await fetch('/api/records');
    allRecords = await res.json();
    render();
}

async function saveData(record, id = null) {
    // 限制：防止未來日期或超過 115 年以前的紀錄 
    if (record.date > todayStr) {
        showToast("錯誤：不能記錄未來的日子！");
        return;
    }
    if (record.date < minDateStr) {
        showToast("錯誤：日期超出合理健康紀錄範圍 (115年)！");
        return;
    }
//儲存資料  呼叫 fetch('/api/records', { method: 'POST', ... })
    await fetch('/api/records', {//儲存資料  呼叫 fetch('/api/records', { method: 'POST', ... })
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
    });
    
    if (id) {
        await deleteData(id, false); 
    }
    
    editingId = null;
    loadData();
}
//刪除資料  呼叫 fetch(\/api/records/${id}`, { method: 'DELETE' })
async function deleteData(id, isReload = true) {//刪除資料 呼叫 fetch(\/api/records/${id}`, { method: 'DELETE' })
    await fetch(`/api/records/${id}`, { method: 'DELETE' });
    if (isReload) loadData();
}

function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="flex flex-col lg:flex-row min-h-screen bg-slate-50">
            <aside class="w-full lg:w-72 bg-white border-r border-slate-200 p-6 lg:fixed lg:h-full overflow-y-auto z-10">
                <div class="mb-8 text-center lg:text-left">
                    <h2 class="text-xl font-black text-indigo-600 tracking-tighter">MONTHLY STATS</h2>
                    <p class="text-xs text-slate-400 uppercase font-bold" id="current-month-label"></p>
                </div>
                <div id="monthly-stats-area" class="space-y-4"></div>
            </aside>

            <main class="flex-1 lg:ml-72 p-4 md:p-8">
                <header class="text-center mb-8">
                    <div class="inline-block bg-white p-3 rounded-full shadow-lg mb-4 text-4xl">🍎</div>
                    <h1 class="text-4xl font-extrabold text-slate-800 tracking-tight">健康管理系統</h1>
                    <p class="text-slate-500 mt-2">記錄你的每日健康數據，邁向理想生活</p>
                </header>

                <div class="flex justify-center items-center gap-4 mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 max-w-xs mx-auto">
                    <button onclick="changeDate(-1)" id="prev-date-btn" class="text-slate-400 hover:text-indigo-600 transition disabled:opacity-20">◀</button>
                    <input type="date" id="date-picker" value="${currentDate}" max="${todayStr}" min="${minDateStr}"
                           class="font-bold text-slate-700 border-none focus:ring-0 cursor-pointer bg-transparent">
                    <button onclick="changeDate(1)" id="next-date-btn" class="text-slate-400 hover:text-indigo-600 transition disabled:opacity-20">▶</button>
                </div>

                <div id="stats-area" class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12"></div>

                <div class="bg-white/50 backdrop-blur-md p-1 rounded-2xl flex mb-8 shadow-inner">
                    <button id="btn-diet" class="flex-1 py-4 rounded-xl font-bold transition-all ${currentTab==='diet'?'bg-white text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}">🍽️ 飲食記錄</button>
                    <button id="btn-ex" class="flex-1 py-4 rounded-xl font-bold transition-all ${currentTab==='exercise'?'bg-white text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}">🏃 運動記錄</button>
                </div>

                <div id="main-content" class="grid grid-cols-1 lg:grid-cols-2 gap-8"></div>
            </main>
        </div>
    `;

    document.getElementById('date-picker').onchange = (e) => {
        currentDate = e.target.value;
        render();
    };

    // 限制：今日以後不能按 ▶，115 年以前不能按 ◀
    if (currentDate >= todayStr) document.getElementById('next-date-btn').disabled = true;
    if (currentDate <= minDateStr) document.getElementById('prev-date-btn').disabled = true;

    renderStats();     
    renderMonthlyStats(); 
    renderMain();
    
    document.getElementById('btn-diet').onclick = () => { currentTab = 'diet'; editingId = null; render(); };
    document.getElementById('btn-ex').onclick = () => { currentTab = 'exercise'; editingId = null; render(); };
}

function renderMonthlyStats() {
    const [year, month] = currentDate.split('-');
    const monthPrefix = `${year}-${month}`;
    document.getElementById('current-month-label').textContent = `${year} / ${month} 總覽`;
    const monthRecs = allRecords.filter(r => r.date.startsWith(monthPrefix));
    const mIntake = monthRecs.filter(r => r.type === 'diet').reduce((s, r) => s + r.calories, 0);
    const mBurn = monthRecs.filter(r => r.type === 'exercise').reduce((s, r) => s + r.calories, 0);

    const mStats = [
        { label: '月攝取總量', val: mIntake.toFixed(0), unit: 'kcal', icon: '🍽️', color: 'text-orange-500', bg: 'bg-orange-50' },
        { label: '月消耗總量', val: mBurn.toFixed(0), unit: 'kcal', icon: '🔥', color: 'text-red-500', bg: 'bg-red-50' },
        { label: '月淨熱量', val: (mIntake - mBurn).toFixed(0), unit: 'kcal', icon: '📊', color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: '本月總紀錄', val: monthRecs.length, unit: '筆', icon: '📝', color: 'text-emerald-500', bg: 'bg-emerald-50' }
    ];
    document.getElementById('monthly-stats-area').innerHTML = mStats.map(s => `
        <div class="${s.bg} p-5 rounded-2xl border border-white shadow-sm transition-all">
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${s.label}</div>
            <div class="text-2xl font-black ${s.color}">${s.val} <span class="text-xs font-normal text-slate-400">${s.unit}</span></div>
        </div>
    `).join('');
}

function renderStats() {
    const filteredRecs = allRecords.filter(r => r.date === currentDate);
    const intake = filteredRecs.filter(r => r.type === 'diet').reduce((s, r) => s + r.calories, 0);
    const burn = filteredRecs.filter(r => r.type === 'exercise').reduce((s, r) => s + r.calories, 0);
    const stats = [
        { label: '熱量攝取', val: intake.toFixed(0), unit: 'kcal', icon: '🍽️', color: 'text-orange-500' },
        { label: '熱量消耗', val: burn.toFixed(0), unit: 'kcal', icon: '🔥', color: 'text-red-500' },
        { label: '淨熱量', val: (intake - burn).toFixed(0), unit: 'kcal', icon: '📊', color: 'text-indigo-600' },
        { label: '該日紀錄', val: filteredRecs.length, unit: '筆', icon: '📝', color: 'text-emerald-500' }
    ];
    document.getElementById('stats-area').innerHTML = stats.map(s => `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div class="text-xs font-bold px-2 py-1 bg-slate-100 rounded text-slate-400 uppercase tracking-tighter mb-4 inline-block">${s.label}</div>
            <div class="text-3xl font-black ${s.color}">${s.val} <span class="text-sm font-normal text-slate-400">${s.unit}</span></div>
        </div>
    `).join('');
}

window.changeDate = (offset) => {
    let d = new Date(currentDate);
    d.setDate(d.getDate() + offset);
    const newDateStr = d.toISOString().split('T')[0];
    
    // 限制跳轉範圍 
    if (newDateStr > todayStr || newDateStr < minDateStr) return;
    
    currentDate = newDateStr;
    render();
};

function updateFoodList() {
    const listEl = document.getElementById('food-list-container');
    if (!listEl) return;
    const filtered = FOOD_DATABASE.filter(f => f.name.includes(searchQuery)).slice(0, 50);
    listEl.innerHTML = filtered.map(f => `
        <div class="flex justify-between items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition group">
            <div>
                <div class="font-bold text-slate-700">${f.name}</div>
                <div class="text-xs text-slate-400">${f.calories} kcal · ${f.serving}</div>
            </div>
            <div class="flex items-center gap-2">
                <input type="number" id="amt-${f.id}" value="1" step="0.1" min="0.1" class="w-16 p-2 text-center border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                <button onclick='addFoodWithAmount(${JSON.stringify(f)})' class="btn-primary text-white px-4 py-2 rounded-lg text-sm font-bold">加入</button>
            </div>
        </div>
    `).join('');
}

function renderMain() {
    const content = document.getElementById('main-content');
    const currentRecords = allRecords.filter(r => r.date === currentDate).sort((a, b) => a.time.localeCompare(b.time));

    if (currentTab === 'diet') {
        content.innerHTML = `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 class="text-xl font-bold text-slate-800 mb-6">食物查詢</h3>
                <div class="relative mb-6">
                    <input type="text" id="search" placeholder="搜尋食物..." class="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition" value="${searchQuery}">
                    <span class="absolute left-3 top-3.5 text-slate-400">🔍</span>
                </div>
                <div id="food-list-container" class="h-[500px] overflow-y-auto pr-2 space-y-3"></div>
            </div>
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 class="text-xl font-bold text-slate-800 mb-6">${currentDate} 清單</h3>
                <div class="space-y-3">
                    ${currentRecords.filter(r => r.type === 'diet').reverse().map(r => {
                        const isEditing = editingId === r.__backendId;
                        const foodBase = FOOD_DATABASE.find(f => f.name === r.food_name);
                        const currentAmount = foodBase ? (r.calories / foodBase.calories).toFixed(1) : 1;
                        return `
                        <div class="p-4 border border-slate-50 rounded-xl transition-all ${isEditing ? 'bg-indigo-50 ring-2 ring-indigo-200' : ''}">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center gap-3">
                                    ${isEditing ? `
                                        <div><input type="number" id="edit-amt-${r.__backendId}" value="${currentAmount}" step="0.1" class="w-16 p-1 text-sm border rounded"></div>
                                    ` : `
                                        <div><div class="font-bold text-slate-700">${r.food_name}</div><div class="text-xs text-slate-400">${r.time} · ${r.calories.toFixed(1)} kcal</div></div>
                                    `}
                                </div>
                                <div class="flex gap-1">
                                    ${isEditing ? `<button onclick="saveEdit(${r.__backendId}, 'diet')" class="p-2 text-indigo-600">✅</button>` : `<button onclick="setEditing(${r.__backendId})" class="p-2 text-slate-400">✏️</button>`}
                                    <button onclick="deleteData(${r.__backendId})" class="p-2 text-slate-400">🗑️</button>
                                </div>
                            </div>
                        </div>
                    `}).join('') || `<p class="text-center text-slate-300 py-10">此日期沒有紀錄</p>`}
                </div>
            </div>`;
        const searchInput = document.getElementById('search');
        if (searchInput) { searchInput.oninput = (e) => { searchQuery = e.target.value; updateFoodList(); }; updateFoodList(); }
    } else {
        content.innerHTML = `
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <h3 class="text-xl font-bold text-slate-800 mb-8">新增運動紀錄 (${currentDate})</h3>
                <div class="space-y-6">
                    <select id="ex-name" class="w-full p-4 bg-slate-50 border-none rounded-xl">${Object.keys(EXERCISE_DATABASE).map(e => `<option value="${e}">${e}</option>`).join('')}</select>
                    <div class="grid grid-cols-2 gap-4">
                        <input type="number" id="ex-dur" class="w-full p-4 bg-slate-50 border-none rounded-xl" placeholder="分">
                        <input type="number" id="ex-weight" class="w-full p-4 bg-slate-50 border-none rounded-xl" placeholder="kg">
                    </div>
                    <input type="number" id="ex-hr" placeholder="平均心率" class="w-full p-4 bg-slate-50 border-none rounded-xl">
                    <button id="save-ex" class="w-full btn-primary text-white py-4 rounded-xl font-bold">儲存紀錄</button>
                </div>
            </div>
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 class="text-xl font-bold text-slate-800 mb-6">${currentDate} 運動清單</h3>
                <div class="space-y-3">
                    ${currentRecords.filter(r => r.type === 'exercise').reverse().map(r => {
                        const isEditing = editingId === r.__backendId;
                        return `
                        <div class="p-4 border border-slate-50 rounded-xl transition-all ${isEditing ? 'bg-red-50 ring-2 ring-red-100' : ''}">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center gap-3">
                                    ${isEditing ? `
                                        <div class="grid grid-cols-3 gap-2">
                                            <input type="number" id="edit-dur-${r.__backendId}" value="${r.duration}" class="w-full p-1 text-xs border rounded">
                                            <input type="number" id="edit-hr-${r.__backendId}" value="${r.heart_rate || ''}" class="w-full p-1 text-xs border rounded">
                                            <input type="number" id="edit-weight-${r.__backendId}" value="${r.weight || 60}" class="w-full p-1 text-xs border rounded">
                                        </div>
                                    ` : `
                                        <div><div class="font-bold text-slate-700">${r.exercise_name}</div><div class="text-xs text-slate-400">${r.time} · ${r.duration} 分 · 消耗 ${r.calories.toFixed(1)} kcal</div></div>
                                    `}
                                </div>
                                <div class="flex gap-1">
                                    ${isEditing ? `<button onclick="saveEdit(${r.__backendId}, 'exercise')" class="p-2 text-red-600">✅</button>` : `<button onclick="setEditing(${r.__backendId})" class="p-2 text-slate-400">✏️</button>`}
                                    <button onclick="deleteData(${r.__backendId})" class="p-2 text-slate-400">🗑️</button>
                                </div>
                            </div>
                        </div>`}).join('') || `<p class="text-center text-slate-300 py-10">此日期沒有紀錄</p>`}
                </div>
            </div>`;
        document.getElementById('save-ex').onclick = () => {
            const name = document.getElementById('ex-name').value;
            const dur = parseInt(document.getElementById('ex-dur').value);
            const weight = parseFloat(document.getElementById('ex-weight').value) || 60;
            const hr = parseInt(document.getElementById('ex-hr').value) || 0;
            if (!dur) return;
            let met = EXERCISE_DATABASE[name].calories_per_min;
            let hrBonus = hr > 120 ? 1.0 + ((hr - 120) / 100) : 1.0;
            saveData({ type: 'exercise', date: currentDate, time: new Date().toTimeString().slice(0, 5), exercise_name: name, duration: dur, weight: weight, heart_rate: hr, calories: met * weight * (dur / 60) * hrBonus });
        };
    }
}

window.setEditing = (id) => { editingId = id; renderMain(); };

window.saveEdit = (id, type) => {
    const oldRecord = allRecords.find(r => r.__backendId === id);
    let updatedData = { ...oldRecord };
    if (type === 'diet') {
        const foodBase = FOOD_DATABASE.find(f => f.name === oldRecord.food_name);
        const newAmount = parseFloat(document.getElementById(`edit-amt-${id}`).value) || 1.0;
        if (foodBase) { updatedData.calories = foodBase.calories * newAmount; updatedData.protein = foodBase.protein * newAmount; updatedData.fat = foodBase.fat * newAmount; updatedData.carbs = foodBase.carbs * newAmount; }
    } else {
        const newDur = parseInt(document.getElementById(`edit-dur-${id}`).value);
        const newHr = parseInt(document.getElementById(`edit-hr-${id}`).value) || 0;
        const newWeight = parseFloat(document.getElementById(`edit-weight-${id}`).value) || 60;
        let met = EXERCISE_DATABASE[oldRecord.exercise_name].calories_per_min;
        let hrBonus = newHr > 120 ? 1.0 + ((newHr - 120) / 100) : 1.0;
        updatedData.duration = newDur; updatedData.heart_rate = newHr; updatedData.weight = newWeight; updatedData.calories = met * newWeight * (newDur / 60) * hrBonus;
    }
    saveData(updatedData, id);
};

window.addFoodWithAmount = (f) => {
    const amountInput = document.getElementById(`amt-${f.id}`);
    const amount = parseFloat(amountInput.value) || 1.0;
    saveData({ type: 'diet', date: currentDate, time: new Date().toTimeString().slice(0, 5), food_name: f.name, calories: f.calories * amount, protein: f.protein * amount, fat: f.fat * amount, carbs: f.carbs * amount });
    showToast(`已記錄 ${amount} 份 ${f.name}`);
};

function showToast(msg) {
    const t = document.createElement('div');
    t.className = "fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full z-[10001]";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

init();