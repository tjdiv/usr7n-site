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
const IMGBB_API_KEY = "6e4b002bc1dd233aeb4ffc1147deed6b";

let localProducts = [];
let isFirstLoad = true;
const notificationSound = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

// 1. نظام الدخول للكاشير
const loginOverlay = document.getElementById('login-overlay');
const btnLogin = document.getElementById('btn-login');

btnLogin.addEventListener('click', () => {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const errorMsg = document.getElementById('login-error');
    
    if(!user || !pass) {
        errorMsg.textContent = "يرجى إدخال اسم المستخدم وكلمة المرور";
        return;
    }
    
    btnLogin.textContent = "جاري الدخول...";
    auth.signInWithEmailAndPassword(user + "@usr7n.com", pass)
        .then(() => {
            // Success handled by onAuthStateChanged
        })
        .catch(err => {
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

function initDashboard() {
    listenToProducts();
    listenToOrders();
}

// 2. جلب المنتجات لنقطة البيع (POS)
function listenToProducts() {
    db.collection("products").orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            localProducts = [];
            
            snapshot.forEach(docSnap => {
                const p = { id: docSnap.id, ...docSnap.data() };
                localProducts.push(p);
            });
            
            if (typeof renderAdminProducts === 'function') {
                renderAdminProducts();
            }
        });
}

const staticProducts = [
    { name: "تشيز بين", price: 18, imageUrl: "1/O/O/4.jpeg", isBuiltIn: true },
    { name: "بودينق جالكسي", price: 21, imageUrl: "1/O/O/5.jpeg", isBuiltIn: true },
    { name: "تيراميسو", price: 17, imageUrl: "1/O/O/6.jpeg", isBuiltIn: true },
    { name: "فلات وايت", price: 15, imageUrl: "1/O/O/2.jpeg", isBuiltIn: true },
    { name: "قهوة اليوم بارد", price: 12, imageUrl: "1/O/O/7.jpeg", isBuiltIn: true },
    { name: "V60", price: 16, imageUrl: "1/O/O/9.jpeg", isBuiltIn: true },
    { name: "لاتيه", price: 15, imageUrl: "1/O/O/3.jpeg", isBuiltIn: true },
    { name: "اسبريسو", price: 10, imageUrl: "1/O/O/1.jpeg", isBuiltIn: true }
];

function renderAdminProducts() {
    const tbody = document.getElementById('admin-products-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const allProductsMap = new Map();
    
    // First, add static products
    staticProducts.forEach(sp => {
        allProductsMap.set(sp.name, { ...sp, fbId: null });
    });
    
    // Then override/add with Firebase products
    localProducts.forEach(fp => {
        allProductsMap.set(fp.name, { ...fp, fbId: fp.id });
    });
    
    allProductsMap.forEach(p => {
        const isReward = p.isReward || false;
        const pts = p.pointsPrice || '';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${p.imageUrl}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">
                    <span>${p.name} ${p.isBuiltIn && !p.fbId ? '(أساسي)' : ''}</span>
                </div>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${p.price} SR</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <input type="checkbox" id="reward-cb-${p.name}" ${isReward ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--gold);" onchange="document.getElementById('reward-pts-${p.name.replace(/\\s/g, '_')}').style.display = this.checked ? 'inline-block' : 'none'">
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <input type="number" id="reward-pts-${p.name.replace(/\\s/g, '_')}" value="${pts}" placeholder="سعر النقاط" style="width:80px; padding:5px; display: ${isReward ? 'inline-block' : 'none'}; border:1px solid #ccc; border-radius:4px;">
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; white-space: nowrap;">
                <button onclick="window.saveProductReward('${p.name}')" style="background:var(--navy-deep); color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; margin-left: 5px;">حفظ</button>
                ${p.fbId ? `<button onclick="window.deleteProduct('${p.fbId}')" style="background:rgba(255,0,0,0.8); color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">🗑️ حذف</button>` : ''}
                <span id="save-status-${p.name.replace(/\\s/g, '_')}" style="font-size:12px; margin-right:5px; color:green; font-weight:bold;"></span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.saveProductReward = async (name) => {
    const safeId = name.replace(/\\s/g, '_');
    const isReward = document.getElementById(`reward-cb-${name}`).checked;
    const ptsInput = document.getElementById(`reward-pts-${safeId}`).value;
    const pts = parseInt(ptsInput) || 0;
    const statusSpan = document.getElementById(`save-status-${safeId}`);
    
    statusSpan.textContent = "⏳...";
    statusSpan.style.color = "var(--brown-mid)";
    
    try {
        const fbProd = localProducts.find(p => p.name === name);
        if (fbProd) {
            await db.collection("products").doc(fbProd.id).update({
                isReward: isReward,
                pointsPrice: pts
            });
        } else {
            const sp = staticProducts.find(p => p.name === name);
            if (sp) {
                await db.collection("products").add({
                    name: sp.name,
                    price: sp.price,
                    imageUrl: sp.imageUrl,
                    isBuiltIn: true,
                    isReward: isReward,
                    pointsPrice: pts,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        statusSpan.style.color = "green";
        statusSpan.textContent = "تم التحديث بنجاح!";
        setTimeout(() => { statusSpan.textContent = ""; }, 3000);
    } catch (e) {
        statusSpan.style.color = "red";
        statusSpan.textContent = "فشل التحديث";
        setTimeout(() => { statusSpan.textContent = ""; }, 3000);
    }
};

window.deleteProduct = async (id) => {
    if (confirm("هل تريد حذف هذا المنتج نهائياً؟")) {
        try {
            await db.collection("products").doc(id).delete();
        } catch (e) {
            alert("حدث خطأ أثناء الحذف: " + e.message);
        }
    }
};

// 3. إدارة إضافة منتج جديد ورفعه عبر ImgBB
const btnAddProduct = document.getElementById('btn-add-product');

btnAddProduct.addEventListener('click', async () => {
    const name = document.getElementById('new-prod-name').value.trim();
    const priceStr = document.getElementById('new-prod-price').value.trim();
    const fileInput = document.getElementById('new-prod-image');
    const statusDiv = document.getElementById('add-prod-status');
    
    if(!name || !priceStr || !fileInput.files[0]) {
        statusDiv.style.color = "red";
        statusDiv.textContent = "يرجى تعبئة جميع الحقول واختيار صورة";
        return;
    }
    
    const price = parseFloat(priceStr);
    const file = fileInput.files[0];
    
    statusDiv.style.color = "blue";
    statusDiv.textContent = "جاري رفع الصورة...";
    btnAddProduct.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('image', file);
        
        const imgResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const imgData = await imgResponse.json();
        
        if(imgData.success) {
            const imageUrl = imgData.data.url;
            statusDiv.textContent = "تم رفع الصورة، جاري حفظ المنتج...";
            
            const productData = {
                name: name,
                price: price,
                imageUrl: imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection("products").add(productData);
            
            statusDiv.style.color = "green";
            statusDiv.textContent = "تمت إضافة المنتج بنجاح!";
            
            // مسح الحقول
            document.getElementById('new-prod-name').value = '';
            document.getElementById('new-prod-price').value = '';
            fileInput.value = '';
        } else {
            throw new Error("فشل رفع الصورة");
        }
    } catch (err) {
        statusDiv.style.color = "red";
        statusDiv.textContent = "خطأ: " + err.message;
    } finally {
        btnAddProduct.disabled = false;
        setTimeout(() => statusDiv.textContent = '', 3000);
    }
});

// 4. جلب الطلبات لحظياً (Real-time Orders)
function listenToOrders() {
    db.collection("orders").orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            // تشغيل التنبيه إذا لم تكن المرة الأولى التي يتم فيها التحميل وهناك طلبات جديدة
            if (!isFirstLoad) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        notificationSound.play().catch(e => console.log("Sound autoplay prevented"));
                    }
                });
            }
            isFirstLoad = false;
            
            const list = document.getElementById('dashboard-orders-list');
            list.innerHTML = '';
            
            snapshot.forEach(docSnap => {
                const order = { id: docSnap.id, ...docSnap.data() };
                const typeClass = order.type === 'توصيل' ? 'type-delivery' : 'type-pickup';
                
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
                
                const isReward = order.type && order.type.includes("(مكافأة)");
                if(isReward) {
                    card.style.border = '2px solid var(--gold)';
                    card.style.background = 'rgba(216,192,146,0.1)';
                }
                
                // رقم الطلب القصير للطباعة
                const shortId = order.id.substring(order.id.length - 4).toUpperCase();
                
                card.innerHTML = `
                    <div class="order-card-header">
                        <div>
                            <div class="order-id">#${shortId}</div>
                            <div class="order-time" style="font-weight:bold; color:var(--gold); margin-top:5px;">
                                👤 ${order.customerName || 'عميل المتجر'} <br>
                                📞 ${order.customerPhone || 'بدون رقم'}
                            </div>
                        </div>
                        <span class="order-type ${typeClass}">${isReward ? '⭐ ' + (order.type || 'مكافأة') : (order.type || 'استلام')}</span>
                    </div>
                    <div class="order-items">
                        ${itemsHtml}
                    </div>
                    <div class="order-total">${order.total} SR</div>
                    ${order.deliveryLocation ? `
                    <div style="margin-bottom:12px; padding:10px 14px; background:rgba(216,192,146,0.1); border-radius:10px; border:1px solid rgba(216,192,146,0.3);">
                        <div style="font-weight:700; color:var(--navy-deep); margin-bottom:5px;">📍 موقع التوصيل</div>
                        <div style="font-size:0.85rem; color:var(--brown-mid); margin-bottom:8px; direction:rtl;">${order.deliveryLocation.address || 'موقع محدد على الخريطة'}</div>
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
        });
}

window.changeOrderStatus = async (id, newStatus) => {
    try {
        await db.collection("orders").doc(id).update({
            status: newStatus
        });
    } catch (e) {
        alert("خطأ في تحديث الحالة");
    }
};

// زر تنظيف الطلبات المكتملة
document.getElementById('btn-clear-completed').addEventListener('click', async () => {
    const btn = document.getElementById('btn-clear-completed');

    if (!confirm("هل تريد حذف جميع الطلبات المكتملة نهائياً من النظام؟")) return;

    btn.textContent = "⏳ جاري التنظيف...";
    btn.disabled = true;

    try {
        const snapshot = await db.collection("orders").where("status", "==", "completed").get();

        if (snapshot.empty) {
            btn.textContent = "✅ لا يوجد مكتملة";
            setTimeout(() => {
                btn.textContent = "🧹 تنظيف المكتملة";
                btn.disabled = false;
            }, 2000);
            return;
        }

        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        btn.textContent = `✅ تم حذف ${snapshot.size} طلب`;
        setTimeout(() => {
            btn.textContent = "🧹 تنظيف المكتملة";
            btn.disabled = false;
        }, 2500);
    } catch (e) {
        alert("فشل التنظيف: " + e.message);
        btn.textContent = "🧹 تنظيف المكتملة";
        btn.disabled = false;
    }
});

