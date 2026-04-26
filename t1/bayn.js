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
    listenToDeliveryStatus();
}

// التحكم في حالة خدمة التوصيل
function listenToDeliveryStatus() {
    const toggle = document.getElementById('delivery-toggle-input');
    const label = document.getElementById('delivery-status-label');
    
    if (!toggle || !label) return;

    // مستمع لحظي للحالة من Firestore
    db.collection("settings").doc("delivery").onSnapshot((doc) => {
        if (doc.exists) {
            const isOpen = doc.data().isOpen;
            toggle.checked = isOpen;
            label.textContent = isOpen ? "مفتوح" : "مغلق";
            label.style.color = isOpen ? "#27ae60" : "#c0392b";
        } else {
            // إنشاء الوثيقة إذا لم تكن موجودة
            db.collection("settings").doc("delivery").set({ isOpen: true });
        }
    });

    // عند تغيير الحالة يدوياً من الكاشير
    toggle.addEventListener('change', async () => {
        const newState = toggle.checked;
        label.textContent = "⏳...";
        try {
            await db.collection("settings").doc("delivery").update({ isOpen: newState });
        } catch (e) {
            alert("فشل تحديث حالة التوصيل");
            // إعادة الحالة القديمة في حال الفشل
            toggle.checked = !newState;
        }
    });
}

// 2. جلب المنتجات لنقطة البيع (POS)
async function bootstrapStaticProducts() {
    // جلب أسماء المنتجات الموجودة فعلياً في فايربيس لتجنب التكرار
    const snapshot = await db.collection("products").get();
    const existingNames = snapshot.docs.map(doc => doc.data().name);
    
    for (const sp of staticProducts) {
        if (!existingNames.includes(sp.name)) {
            await db.collection("products").add({
                ...sp,
                isHidden: false,
                isReward: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }
}

function listenToProducts() {
    // تشغيل المزامنة للأصناف الأساسية مرة واحدة عند التحميل
    bootstrapStaticProducts();

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
            if (typeof loadAdminProducts === 'function') {
                loadAdminProducts();
            }
        });
}

const staticProducts = [
    { name: "ميني تارت", price: 7, imageUrl: "1/O/O/13.jpeg", isBuiltIn: true },
    { name: "ميني كيك جزر", price: 9, imageUrl: "1/O/O/12.jpeg", isBuiltIn: true },
    { name: "كيكه تشوكليت", price: 24, imageUrl: "1/O/O/8.jpeg", isBuiltIn: true },
    { name: "دولتشي بين", price: 21, imageUrl: "1/O/O/10.jpeg", isBuiltIn: true },
    { name: "تشيز مانجو", price: 24, imageUrl: "1/O/O/11.jpeg", isBuiltIn: true },
    { name: "تشيز بين", price: 18, imageUrl: "1/O/O/4.jpeg", isBuiltIn: true },
    { name: "بودينق جالكسي", price: 21, imageUrl: "1/O/O/5.jpeg", isBuiltIn: true },
    { name: "تيراميسو", price: 17, imageUrl: "1/O/O/6.jpeg", isBuiltIn: true },
    { name: "فلات وايت", price: 15, imageUrl: "1/O/O/2.jpeg", isBuiltIn: true },
    { name: "قهوة اليوم بارد", price: 12, imageUrl: "1/O/O/7.jpeg", isBuiltIn: true },
    { name: "V60", price: 16, imageUrl: "1/O/O/9.jpeg", isBuiltIn: true },
    { name: "اسبريسو", price: 10, imageUrl: "1/O/O/1.jpeg", isBuiltIn: true },
    { name: "كابتشينو", price: 15, imageUrl: "1/O/O/3.jpeg", isBuiltIn: true },
    { name: "كورتادو", price: 14, imageUrl: "1/O/O/2.jpeg", isBuiltIn: true },
    { name: "لاتيه", price: 15, imageUrl: "1/O/O/3.jpeg", isBuiltIn: true }
];


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
        statusDiv.style.display = "block";
        statusDiv.style.background = "rgba(231, 76, 60, 0.1)";
        statusDiv.style.color = "#c0392b";
        statusDiv.textContent = "⚠️ يرجى تعبئة جميع الحقول واختيار صورة";
        return;
    }
    
    const price = parseFloat(priceStr);
    const file = fileInput.files[0];
    
    statusDiv.style.display = "block";
    statusDiv.style.background = "rgba(52, 152, 219, 0.1)";
    statusDiv.style.color = "#2980b9";
    statusDiv.textContent = "⏳ جاري رفع الصورة...";
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
                isHidden: false,
                isReward: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection("products").add(productData);
            
            statusDiv.style.background = "rgba(39, 174, 96, 0.1)";
            statusDiv.style.color = "#27ae60";
            statusDiv.textContent = "✅ تمت إضافة المنتج بنجاح!";
            
            // مسح الحقول والمعاينة
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
        statusDiv.style.background = "rgba(231, 76, 60, 0.1)";
        statusDiv.style.color = "#c0392b";
        statusDiv.textContent = "❌ خطأ: " + err.message;
    } finally {
        btnAddProduct.disabled = false;
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.style.display = 'none';
        }, 4000);
    }
});

// منطق معاينة الصورة قبل الرفع
document.getElementById('new-prod-image').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('image-preview');
    const placeholder = document.getElementById('upload-placeholder');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            preview.src = event.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
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

// =========================================================================
// إدارة المنيو والمنتجات (Admin Product Management)
// =========================================================================
const adminProductsList = document.getElementById('admin-products-list');
const editPricesList = document.getElementById('edit-prices-list');

function loadAdminProducts() {
    if (!adminProductsList && !editPricesList) return;

    db.collection("products").onSnapshot(snapshot => {
        localProducts = [];
        snapshot.forEach(docSnap => {
            localProducts.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (adminProductsList) adminProductsList.innerHTML = '';
        if (editPricesList) editPricesList.innerHTML = '';
        
        const allProductsMap = new Map();
        staticProducts.forEach(sp => allProductsMap.set(sp.name, { ...sp, fbId: null }));
        localProducts.forEach(fp => allProductsMap.set(fp.name, { ...fp, fbId: fp.id }));

        allProductsMap.forEach(p => {
            const id = p.fbId;
            const isHidden = p.isHidden || false;
            const isReward = p.isReward || false;
            const pts = p.pointsPrice || 0;
            const safeName = p.name.replace(/\s/g, '_');

            // --- القسم الثالث: إدارة المنيو والمكافآت ---
            if (adminProductsList) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div class="prod-info-cell">
                            <img src="${p.imageUrl}" class="prod-thumb">
                            <span>${p.name}</span>
                        </div>
                    </td>
                    <td>${p.price} SR</td>
                    <td>
                        <input type="number" id="reward-pts-${safeName}" value="${pts}" placeholder="النقاط"
                               style="width:70px; padding:6px; border:1px solid var(--gold); border-radius:4px; background:white;">
                    </td>
                    <td>
                        <button onclick="window.toggleRewardStatus('${p.name}', ${!isReward})" 
                                class="btn-admin ${isReward ? 'cancel-reward' : 'add-reward'}"
                                style="background: ${isReward ? 'rgba(231, 76, 60, 0.1)' : 'var(--navy-deep)'}; 
                                       color: ${isReward ? '#e74c3c' : 'var(--cream-warm)'}; 
                                       border: 1px solid ${isReward ? '#e74c3c' : 'var(--navy-deep)'};
                                       padding: 6px 15px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                            ${isReward ? '✕ إلغاء المكافأة' : '＋ إضافة للمكافآت'}
                        </button>
                    </td>
                `;
                adminProductsList.appendChild(tr);
            }

            // --- القسم الرابع: تعديل الأسماء والأسعار فقط ---
            if (editPricesList) {
                const tr = document.createElement('tr');
                tr.id = `edit-row-${safeName}`;
                tr.innerHTML = `
                    <td>
                        <div class="prod-info-cell">
                            <img src="${p.imageUrl}" class="prod-thumb">
                            <span class="prod-name-text">${p.name}</span>
                        </div>
                    </td>
                    <td class="prod-price-text">${p.price} SR</td>
                    <td>
                        <button class="btn-admin edit" onclick="editProductPriceRow('${p.name}', '${p.name}', ${p.price}, '${id || ''}')" style="background:var(--navy-deep); color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">تعديل الاسم والسعر</button>
                    </td>
                `;
                editPricesList.appendChild(tr);
            }
        });
    });
}

window.toggleRewardStatus = async (name, newStatus) => {
    const safeName = name.replace(/\s/g, '_');
    let pointsPrice = 0;
    
    if (newStatus) {
        const input = document.getElementById(`reward-pts-${safeName}`);
        if (input) {
            pointsPrice = parseInt(input.value) || 0;
        }
    }

    try {
        const prod = localProducts.find(p => p.name === name);
        if (prod) {
            await db.collection("products").doc(prod.id).update({ isReward: newStatus, pointsPrice: pointsPrice });
        } else {
            const sp = staticProducts.find(p => p.name === name);
            await db.collection("products").add({ ...sp, isReward: newStatus, pointsPrice: pointsPrice, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
    } catch (e) { alert("خطأ: " + e.message); }
};

window.editProductPriceRow = (rowKey, name, price, fbId) => {
    const row = document.getElementById(`edit-row-${rowKey.replace(/\s/g, '_')}`);
    const nameCell = row.querySelector('.prod-name-text');
    const priceCell = row.querySelector('.prod-price-text');
    const actionsCell = row.cells[2];

    nameCell.innerHTML = `<input type="text" class="edit-input" id="inp-name-${rowKey.replace(/\s/g, '_')}" value="${name}">`;
    priceCell.innerHTML = `<input type="number" class="edit-input" id="inp-price-${rowKey.replace(/\s/g, '_')}" value="${price}" style="width:80px;">`;
    
    actionsCell.innerHTML = `
        <button class="btn-admin save" onclick="saveProductPriceRow('${rowKey}', '${fbId}')">حفظ</button>
        <button class="btn-admin cancel" onclick="loadAdminProducts()">إلغاء</button>
    `;
};

window.saveProductPriceRow = async (rowKey, fbId) => {
    const safeId = rowKey.replace(/\s/g, '_');
    const newName = document.getElementById(`inp-name-${safeId}`).value;
    const newPrice = parseFloat(document.getElementById(`inp-price-${safeId}`).value);

    if (!newName || isNaN(newPrice)) {
        alert("يرجى إدخال بيانات صحيحة");
        return;
    }

    try {
        if (fbId && fbId !== 'null') {
            await db.collection("products").doc(fbId).update({ name: newName, price: newPrice });
        } else {
            // منتج أساسي جديد
            const sp = staticProducts.find(p => p.name === rowKey);
            await db.collection("products").add({
                ...sp,
                name: newName,
                price: newPrice,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (e) {
        alert("فشل التحديث: " + e.message);
    }
};

window.deleteProduct = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج نهائياً من المنيو؟")) return;

    try {
        await db.collection("products").doc(id).delete();
    } catch (e) {
        alert("فشل الحذف: " + e.message);
    }
};

// تشغيل جلب المنتجات عند تحميل الصفحة
loadAdminProducts();

// حذف المنتج الزائد
db.collection("products").where("name", "in", ["قهوه", "القهوه"]).get().then(s => s.forEach(d => d.ref.delete()));

