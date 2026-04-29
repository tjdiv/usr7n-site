const firebaseConfig = {
  apiKey: "AIzaSyBB4CfmM4r_Z8rkbGdz5AwrOqSv6rX6twg",
  authDomain: "bayn-35bfc.firebaseapp.com",
  projectId: "bayn-35bfc",
  storageBucket: "bayn-35bfc.firebasestorage.app",
  messagingSenderId: "807550594027",
  appId: "1:807550594027:web:2df73db12b872b76ee47ae"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    console.warn("Persistence failed:", err.code);
});

// تحديث توكنات menu_control لتنبيه صفحة العميل بتغيير المنيو/المكافآت
async function notifyMenuChange() {
    try {
        await db.collection("settings").doc("menu_control").set({
            menuLastUpdate: firebase.firestore.FieldValue.serverTimestamp(),
            rewardsLastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (e) { console.warn("Failed to update menu_control:", e); }
}

// --- نظام المراقبة وتسجيل الأخطاء ---
const logErrorToFirebase = (errorData) => {
    try {
        const cashier = firebase.auth().currentUser;
        db.collection("system_logs").add({
            ...errorData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent,
            page: "bayn.js",
            userName: cashier ? cashier.email : "Unauthenticated Cashier",
            userPhone: cashier ? cashier.uid : "N/A"
        });
    } catch (e) { console.error("Failed to log to Firebase", e); }
};

window.onerror = function(msg, url, line, col) {
    logErrorToFirebase({ type: "Dashboard Global Error", message: msg, url, line, col });
    return false;
};
window.onunhandledrejection = function(event) {
    logErrorToFirebase({ type: "Dashboard Unhandled Promise", message: event.reason ? event.reason.toString() : "Unknown" });
};

const IMGBB_API_KEY = "6e4b002bc1dd233aeb4ffc1147deed6b";

let localProducts = [];
let isFirstLoad = true;
const notificationSound = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

// =========================================================================
// 1. نظام الدخول للكاشير
// =========================================================================
const loginOverlay = document.getElementById('login-overlay');
const btnLogin = document.getElementById('btn-login');

btnLogin.addEventListener('click', () => {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const errorMsg = document.getElementById('login-error');
    if (!user || !pass) { errorMsg.textContent = "يرجى إدخال اسم المستخدم وكلمة المرور"; return; }
    btnLogin.textContent = "جاري الدخول...";
    auth.signInWithEmailAndPassword(user + "@usr7n.com", pass)
        .then(() => {})
        .catch(() => {
            errorMsg.textContent = "بيانات الدخول غير صحيحة";
            btnLogin.textContent = "تسجيل الدخول";
        });
});

auth.onAuthStateChanged((user) => {
    if (user) {
        loginOverlay.classList.remove('active');
        initDashboard();
    } else {
        loginOverlay.classList.add('active');
    }
});

// التنقل بين الشاشات
document.querySelectorAll('.nav-item[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.dashboard-view').forEach(v => v.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.getAttribute('data-target')).classList.add('active');
    });
});

async function initDashboard() {
    // التأكد من جاهزية Auth token قبل أي عملية Firestore
    const user = auth.currentUser;
    if (!user) {
        console.error("initDashboard called without auth!");
        return;
    }
    try {
        await user.getIdToken(true); // تجديد التوكن
        console.log("Auth confirmed:", user.email, "UID:", user.uid);
    } catch (e) {
        console.error("Token refresh failed:", e);
    }

    cleanupDuplicateImages();
    listenToProducts();
    listenToOrders();
    listenToDeliveryStatus();
}

// =========================================================================
// تنظيف المنتجات ذات الصور المكررة من قاعدة البيانات
// =========================================================================
async function cleanupDuplicateImages() {
    try {
        const snapshot = await db.collection("products").get();
        const seenImages = new Map(); // imageUrl -> أول doc.id
        const toDelete = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const img = (data.imageUrl || "").trim().toLowerCase();
            if (!img) return;

            if (seenImages.has(img)) {
                toDelete.push(doc.id); // احتفظ بالأول، احذف الثاني وما بعده
            } else {
                seenImages.set(img, doc.id);
            }
        });

        if (toDelete.length > 0) {
            console.log(`حذف ${toDelete.length} منتجات بصور مكررة...`);
            const batch = db.batch();
            toDelete.forEach(id => batch.delete(db.collection("products").doc(id)));
            await batch.commit();
            console.log("تم التنظيف بنجاح.");
        }
    } catch (e) {
        console.error("cleanupDuplicateImages error:", e);
    }
}

// =========================================================================
// 2. مراقبة المنتجات — مصدر موحد يُحدِّث كل الأقسام لحظياً
// =========================================================================
let unsubscribeProducts = null;
let unsubscribeOrders = null;
let unsubscribeDelivery = null;

function listenToProducts() {
    if (unsubscribeProducts) unsubscribeProducts();

    unsubscribeProducts = db.collection("products").orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            localProducts = [];
            snapshot.forEach(docSnap => {
                localProducts.push({ id: docSnap.id, ...docSnap.data() });
            });
            // تحديث الأقسام الثلاثة دفعة واحدة
            renderAdminSection();
            renderEditSection();
        }, (error) => {
            logErrorToFirebase({ type: "Firebase Products Error", message: error.message });
        });
}

// =========================================================================
// قسم إدارة المنتجات والمكافآت
// =========================================================================
function renderAdminSection() {
    const adminList = document.getElementById('admin-products-list');
    if (!adminList) return;
    adminList.innerHTML = '';

    localProducts.forEach(p => {
        const id = p.id;
        const isReward = p.isReward || false;
        const pts = p.pointsPrice || 0;

        const tr = document.createElement('tr');
        tr.id = `admin-row-${id}`;
        tr.innerHTML = `
            <td>
                <div class="prod-info-cell">
                    <img src="${p.imageUrl || ''}" class="prod-thumb" onerror="this.style.display='none'">
                    <span>${p.name}</span>
                </div>
            </td>
            <td>${p.price} SR</td>
            <td>
                <input type="number" id="reward-pts-${id}" value="${pts}" placeholder="النقاط"
                       style="width:70px; padding:6px; border:1px solid var(--gold); border-radius:4px; background:white;">
            </td>
            <td>
                <button onclick="window.toggleRewardStatus('${id}', ${!isReward})"
                        style="background: ${isReward ? 'rgba(231,76,60,0.1)' : 'var(--navy-deep)'};
                               color: ${isReward ? '#e74c3c' : 'var(--cream-warm)'};
                               border: 1px solid ${isReward ? '#e74c3c' : 'var(--navy-deep)'};
                               padding: 6px 15px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    ${isReward ? '✕ إلغاء المكافأة' : '＋ إضافة للمكافآت'}
                </button>
            </td>
        `;
        adminList.appendChild(tr);
    });
}

// =========================================================================
// قسم تعديل الأسماء والأسعار + حذف نهائي
// =========================================================================
function renderEditSection() {
    const editList = document.getElementById('edit-prices-list');
    if (!editList) return;
    editList.innerHTML = '';

    localProducts.forEach(p => {
        const id = p.id;
        const safeName = p.name.replace(/'/g, "\\'");

        const tr = document.createElement('tr');
        tr.id = `edit-row-${id}`;
        tr.innerHTML = `
            <td>
                <div class="prod-info-cell">
                    <img src="${p.imageUrl || ''}" class="prod-thumb" onerror="this.style.display='none'">
                    <span class="prod-name-text">${p.name}</span>
                </div>
            </td>
            <td class="prod-price-text">${p.price} SR</td>
            <td style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <button onclick="window.editProductPriceRow('${id}', '${safeName}', ${p.price})"
                        style="background:var(--navy-deep); color:white; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-weight:600;">
                    تعديل
                </button>
                <button onclick="window.toggleProductVisibility('${id}', ${!!p.isHidden})"
                        style="background:${p.isHidden ? '#27ae60' : '#e67e22'}; color:white; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-weight:600;">
                    ${p.isHidden ? '👁 إظهار' : '🚫 إخفاء'}
                </button>
                <button onclick="window.deleteProduct('${id}')"
                        style="background:#e74c3c; color:white; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-weight:600;">
                    🗑 حذف
                </button>
            </td>
        `;
        editList.appendChild(tr);
    });
}

// =========================================================================
// 3. إضافة منتج جديد عبر ImgBB
// =========================================================================
const btnAddProduct = document.getElementById('btn-add-product');

btnAddProduct.addEventListener('click', async () => {
    const name = document.getElementById('new-prod-name').value.trim();
    const priceStr = document.getElementById('new-prod-price').value.trim();
    const fileInput = document.getElementById('new-prod-image');
    const statusDiv = document.getElementById('add-prod-status');

    if (!name || !priceStr || !fileInput.files[0]) {
        statusDiv.style.display = "block";
        statusDiv.style.background = "rgba(231,76,60,0.1)";
        statusDiv.style.color = "#c0392b";
        statusDiv.textContent = "⚠️ يرجى تعبئة جميع الحقول واختيار صورة";
        return;
    }

    const price = parseFloat(priceStr);
    const file = fileInput.files[0];
    statusDiv.style.display = "block";
    statusDiv.style.background = "rgba(52,152,219,0.1)";
    statusDiv.style.color = "#2980b9";
    statusDiv.textContent = "⏳ جاري رفع الصورة...";
    btnAddProduct.disabled = true;

    try {
        const formData = new FormData();
        formData.append('image', file);
        const imgResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST', body: formData
        });
        const imgData = await imgResponse.json();
        if (imgData.success) {
            const imageUrl = imgData.data.url;
            statusDiv.textContent = "تم رفع الصورة، جاري حفظ المنتج...";
            await db.collection("products").add({
                name, price, imageUrl,
                isHidden: false, isReward: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await notifyMenuChange();
            statusDiv.style.background = "rgba(39,174,96,0.1)";
            statusDiv.style.color = "#27ae60";
            statusDiv.textContent = "✅ تمت إضافة المنتج بنجاح!";
            document.getElementById('new-prod-name').value = '';
            document.getElementById('new-prod-price').value = '';
            fileInput.value = '';
            document.getElementById('image-preview').style.display = 'none';
            document.getElementById('upload-placeholder').style.display = 'flex';
        } else {
            throw new Error("فشل رفع الصورة");
        }
    } catch (err) {
        statusDiv.style.display = "block";
        statusDiv.style.background = "rgba(231,76,60,0.1)";
        statusDiv.style.color = "#c0392b";
        statusDiv.textContent = "❌ خطأ: " + err.message;
    } finally {
        btnAddProduct.disabled = false;
        setTimeout(() => { statusDiv.textContent = ''; statusDiv.style.display = 'none'; }, 4000);
    }
});

document.getElementById('new-prod-image').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('image-preview');
    const placeholder = document.getElementById('upload-placeholder');
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            preview.src = event.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
});

// =========================================================================
// 4. مراقبة الطلبات لحظياً
// =========================================================================
function listenToOrders() {
    if (unsubscribeOrders) unsubscribeOrders();

    unsubscribeOrders = db.collection("orders").orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            if (!isFirstLoad) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        notificationSound.play().catch(() => {});
                    }
                });
            }
            isFirstLoad = false;

            const list = document.getElementById('dashboard-orders-list');
            list.innerHTML = '';

            snapshot.forEach(docSnap => {
                const order = { id: docSnap.id, ...docSnap.data() };
                const typeClass = order.type === 'توصيل' ? 'type-delivery' : 'type-pickup';
                const shortId = order.id.substring(order.id.length - 4).toUpperCase();
                const isReward = order.type && order.type.includes("(مكافأة)");

                let statusOptions = `
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>قيد التحضير</option>
                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>جاهز</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>مكتمل</option>
                `;

                let itemsHtml = '';
                if (order.items && Array.isArray(order.items)) {
                    itemsHtml = order.items.map(item => `
                        <div class="order-item-line">
                            <span>${item.qty}x ${item.name}</span>
                            <span>${item.qty * item.price} SR</span>
                        </div>
                    `).join('');
                }

                const card = document.createElement('div');
                card.className = 'order-card';
                if (isReward) {
                    card.style.border = '2px solid var(--gold)';
                    card.style.background = 'rgba(216,192,146,0.1)';
                }

                card.innerHTML = `
                    <div class="order-card-header">
                        <div>
                            <div class="order-id">#${shortId}</div>
                            <div class="order-time" style="font-weight:bold; color:var(--gold); margin-top:5px;">
                                👤 ${order.customerName || 'عميل المتجر'}<br>
                                📞 ${order.customerPhone || 'بدون رقم'}
                            </div>
                        </div>
                        <span class="order-type ${typeClass}">${isReward ? '⭐ ' + (order.type || 'مكافأة') : (order.type || 'استلام')}</span>
                    </div>
                    <div class="order-items">${itemsHtml}</div>
                    <div class="order-total">${order.total} SR</div>
                    ${order.deliveryLocation ? `
                    <div style="margin-bottom:12px; padding:10px 14px; background:rgba(216,192,146,0.1); border-radius:10px; border:1px solid rgba(216,192,146,0.3);">
                        <div style="font-weight:700; color:var(--navy-deep); margin-bottom:5px;">📍 موقع التوصيل</div>
                        <div style="font-size:0.85rem; color:var(--brown-mid); margin-bottom:8px;">${order.deliveryLocation.address || 'موقع محدد على الخريطة'}</div>
                        <a href="https://www.google.com/maps?q=${order.deliveryLocation.lat},${order.deliveryLocation.lng}" target="_blank" style="display:inline-block; padding:6px 14px; background:var(--navy-deep); color:var(--gold); border-radius:8px; font-size:0.85rem; font-weight:700; text-decoration:none;">🗺️ فتح في الخريطة</a>
                    </div>` : ''}
                    <div class="order-actions">
                        <select class="status-select" onchange="window.changeOrderStatus('${order.id}', this.value)">
                            ${statusOptions}
                        </select>
                    </div>
                `;
                list.appendChild(card);
            });
        }, (error) => {
            console.error("Firebase Orders Error:", error);
            logErrorToFirebase({ type: "Firebase Orders Admin Error", message: error.message });
            const list = document.getElementById('dashboard-orders-list');
            if (list) list.innerHTML = `<div style="color:red; padding:20px;">
                <strong>خطأ في جلب الطلبات:</strong><br>
                <span style="font-size:0.85rem; color:#888; direction:ltr; display:block; margin-top:8px;">${error.code || ''}: ${error.message}</span>
            </div>`;
        });
}

// =========================================================================
// 5. التحكم في التوصيل
// =========================================================================
function listenToDeliveryStatus() {
    const toggle = document.getElementById('delivery-toggle-input');
    const label = document.getElementById('delivery-status-label');
    if (!toggle || !label) return;

    if (unsubscribeDelivery) unsubscribeDelivery();

    unsubscribeDelivery = db.collection("settings").doc("delivery").onSnapshot((doc) => {
        if (doc.exists) {
            const isOpen = doc.data().isOpen;
            toggle.checked = isOpen;
            label.textContent = isOpen ? "مفتوح" : "مغلق";
            label.style.color = isOpen ? "#27ae60" : "#c0392b";
        } else {
            db.collection("settings").doc("delivery").set({ isOpen: true }).catch(e => console.error(e));
        }
    }, (error) => {
        logErrorToFirebase({ type: "Firebase Delivery Error", message: error.message });
    });

    toggle.addEventListener('change', async () => {
        const newState = toggle.checked;
        label.textContent = "⏳...";
        try {
            await db.collection("settings").doc("delivery").update({ isOpen: newState });
        } catch (e) {
            alert("فشل تحديث حالة التوصيل");
            toggle.checked = !newState;
        }
    });
}

// =========================================================================
// 6. إجراءات الطلبات
// =========================================================================
window.changeOrderStatus = async (id, newStatus) => {
    try {
        await db.collection("orders").doc(id).update({ status: newStatus });

        // معالجة النقاط فقط عند اكتمال الطلب — من الكاشير المسجل (Auth) فقط
        if (newStatus === 'completed') {
            const orderSnap = await db.collection("orders").doc(id).get();
            if (!orderSnap.exists) return;
            const order = orderSnap.data();
            const userDocId = order.userId || order.customerPhone;
            if (!userDocId) return;

            const userRef = db.collection("users").doc(userDocId);
            const userDoc = await userRef.get();

            if (order.rewardCost && order.rewardCost > 0) {
                // طلب مكافأة → خصم النقاط
                if (userDoc.exists) {
                    await userRef.update({
                        points: firebase.firestore.FieldValue.increment(-order.rewardCost)
                    });
                }
            } else if (order.total > 0) {
                // طلب عادي → إضافة النقاط
                if (userDoc.exists) {
                    await userRef.update({
                        points: firebase.firestore.FieldValue.increment(order.total)
                    });
                } else {
                    await userRef.set({
                        name: order.customerName || "عميل",
                        phone: order.customerPhone || "",
                        points: order.total,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }
    } catch (e) {
        alert("خطأ في تحديث الحالة: " + e.message);
    }
};

document.getElementById('btn-clear-completed').addEventListener('click', async () => {
    const btn = document.getElementById('btn-clear-completed');
    if (!confirm("هل تريد حذف جميع الطلبات المكتملة نهائياً من النظام؟")) return;
    btn.textContent = "⏳ جاري التنظيف...";
    btn.disabled = true;
    try {
        const snapshot = await db.collection("orders").where("status", "==", "completed").get();
        if (snapshot.empty) {
            btn.textContent = "✅ لا يوجد مكتملة";
            setTimeout(() => { btn.textContent = "🧹 تنظيف المكتملة"; btn.disabled = false; }, 2000);
            return;
        }
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        btn.textContent = `✅ تم حذف ${snapshot.size} طلب`;
        setTimeout(() => { btn.textContent = "🧹 تنظيف المكتملة"; btn.disabled = false; }, 2500);
    } catch (e) {
        alert("فشل التنظيف: " + e.message);
        btn.textContent = "🧹 تنظيف المكتملة";
        btn.disabled = false;
    }
});

// =========================================================================
// 7. إجراءات المنتجات (تعديل، حذف، مكافآت)
// =========================================================================
window.toggleRewardStatus = async (id, newStatus) => {
    let pointsPrice = 0;
    if (newStatus) {
        const input = document.getElementById(`reward-pts-${id}`);
        if (input) pointsPrice = parseInt(input.value) || 0;
    }
    try {
        await db.collection("products").doc(id).update({ isReward: newStatus, pointsPrice });
        await notifyMenuChange();
    } catch (e) { alert("خطأ: " + e.message); }
};

window.editProductPriceRow = (id, name, price) => {
    const row = document.getElementById(`edit-row-${id}`);
    if (!row) return;
    const nameCell = row.querySelector('.prod-name-text');
    const priceCell = row.querySelector('.prod-price-text');
    const actionsCell = row.cells[2];

    nameCell.innerHTML = `<input type="text" class="edit-input" id="inp-name-${id}" value="${name}">`;
    priceCell.innerHTML = `<input type="number" class="edit-input" id="inp-price-${id}" value="${price}" style="width:80px;">`;
    actionsCell.innerHTML = `
        <button onclick="window.saveProductPriceRow('${id}')" style="background:#2ecc71; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; margin-left:5px;">حفظ</button>
        <button onclick="renderEditSection()" style="background:#95a5a6; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">إلغاء</button>
    `;
};

window.saveProductPriceRow = async (id) => {
    const nameInput = document.getElementById(`inp-name-${id}`);
    const priceInput = document.getElementById(`inp-price-${id}`);
    if (!nameInput || !priceInput) return;
    const newName = nameInput.value.trim();
    const newPrice = parseFloat(priceInput.value);
    if (!newName || isNaN(newPrice)) { alert("يرجى إدخال بيانات صحيحة"); return; }
    try {
        await db.collection("products").doc(id).update({ name: newName, price: newPrice });
        await notifyMenuChange();
    } catch (e) {
        alert("فشل التحديث: " + e.message);
    }
};

window.toggleProductVisibility = async (id, currentlyHidden) => {
    const newHidden = !currentlyHidden;
    try {
        await db.collection("products").doc(id).update({ isHidden: newHidden });
        await notifyMenuChange();
    } catch (e) {
        alert("فشل تغيير حالة المنتج: " + e.message);
    }
};

window.deleteProduct = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟ لا يمكن التراجع.")) return;
    try {
        await db.collection("products").doc(id).delete();
        await notifyMenuChange();
    } catch (e) {
        alert("فشل الحذف: " + e.message);
    }
};

// دالة متوافقة للاستدعاءات القديمة
function loadAdminProducts() {
    renderAdminSection();
    renderEditSection();
}
