// Cart Data
let cart = [];
let currentPage = 'home';

// Products Data
const products = {
    'cold-coffee': [
        { id: 1, name: 'قهوة باردة كلاسيكية', price: 15, category: 'cold-coffee' },
        { id: 2, name: 'آيس لاتيه', price: 18, category: 'cold-coffee' },
        { id: 3, name: 'آيس كابتشينو', price: 18, category: 'cold-coffee' },
        { id: 4, name: 'آيس موكا', price: 20, category: 'cold-coffee' },
    ],
    'hot-coffee': [
        { id: 5, name: 'قهوة عربية', price: 12, category: 'hot-coffee' },
        { id: 6, name: 'لاتيه', price: 16, category: 'hot-coffee' },
        { id: 7, name: 'كابتشينو', price: 16, category: 'hot-coffee' },
        { id: 8, name: 'موكا', price: 18, category: 'hot-coffee' },
        { id: 29, name: 'سبانش لاتيه حار', price: 15, category: 'hot-coffee', image: '1/5.jpeg' },
        { id: 30, name: 'قهوة اليوم حار', price: 30, category: 'hot-coffee', image: '1/6.jpeg' },
    ],
    'sweets': [
        { id: 9, name: 'كيك الشوكولاتة', price: 22, category: 'sweets' },
        { id: 10, name: 'كيك الفانيليا', price: 20, category: 'sweets' },
        { id: 11, name: 'تشيز كيك', price: 25, category: 'sweets' },
        { id: 12, name: 'براونيز', price: 18, category: 'sweets' },
        { id: 25, name: 'تراميسو', price: 19, category: 'sweets', image: '1/1.jpeg' },
        { id: 26, name: 'ترافل مانجو', price: 22, category: 'sweets', image: '1/2.jpeg' },
    ],
    'smoothies': [
        { id: 13, name: 'سموثي الفراولة', price: 16, category: 'smoothies' },
        { id: 14, name: 'سموثي المانجو', price: 16, category: 'smoothies' },
        { id: 15, name: 'سموثي الموز', price: 14, category: 'smoothies' },
        { id: 16, name: 'سموثي المشمش', price: 16, category: 'smoothies' },
        { id: 27, name: 'سبانش لاتيه بارد', price: 15, category: 'smoothies', image: '1/3.jpeg' },
        { id: 28, name: 'قهوة اليوم بارد', price: 9, category: 'smoothies', image: '1/4.jpeg' },
    ],
    'milkshakes': [
        { id: 17, name: 'ميلك شيك الشوكولاتة', price: 18, category: 'milkshakes' },
        { id: 18, name: 'ميلك شيك الفراولة', price: 18, category: 'milkshakes' },
        { id: 19, name: 'ميلك شيك الفانيليا', price: 16, category: 'milkshakes' },
        { id: 20, name: 'ميلك شيك الكراميل', price: 19, category: 'milkshakes' },
    ],
    'pastries': [
        { id: 21, name: 'كرواسان', price: 12, category: 'pastries' },
        { id: 22, name: 'دونات', price: 10, category: 'pastries' },
        { id: 23, name: 'مافن', price: 11, category: 'pastries' },
        { id: 24, name: 'خبز الزبيب', price: 13, category: 'pastries' },
    ]
};

// Navigation
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('show'));
    document.querySelector('main').style.display = page === 'home' ? 'block' : 'none';
    
    // Show selected page
    if (page !== 'home') {
        const pageElement = document.getElementById(page + 'Page');
        if (pageElement) {
            pageElement.classList.add('show');
        }
    }
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    
    currentPage = page;
}

// Cart Functions
function openCart() {
    const modal = document.getElementById('cartModal');
    modal.classList.add('show');
    updateCartDisplay();
}

function closeCart() {
    const modal = document.getElementById('cartModal');
    modal.classList.remove('show');
}

function addToCart(productId, productName, price) {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: price,
            quantity: 1
        });
    }
    
    updateCartCount();
    showNotification('تمت إضافة المنتج إلى السلة');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
    updateCartCount();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartDisplay();
        }
    }
    updateCartCount();
}

function updateCartDisplay() {
    const cartItemsDiv = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p class="empty-message">السلة فارغة</p>';
        return;
    }
    
    cartItemsDiv.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${item.price} ر.س</div>
            </div>
            <div class="cart-item-quantity">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                <button class="qty-btn" onclick="removeFromCart(${item.id})" style="background-color: #ff6b6b;">✕</button>
            </div>
        </div>
    `).join('');
    
    updateCartTotal();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

function updateCartTotal() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = total + ' ر.س';
}

function checkout() {
    if (cart.length === 0) {
        showNotification('السلة فارغة');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    showNotification(`تم تأكيد الطلب بقيمة ${total} ر.س`);
    cart = [];
    updateCartCount();
    closeCart();
}

// Category Navigation
function goToCategory(category) {
    const categoryProducts = products[category];
    
    // Create a temporary page with products
    let html = `
        <header class="header">
            <div class="header-container">
                <button class="back-btn" onclick="navigateTo('home')">←</button>
                <h1>${getCategoryName(category)}</h1>
                <div></div>
            </div>
        </header>
        <main class="main-content">
            <div class="categories-grid" style="padding: 16px;">
    `;
    
    categoryProducts.forEach(product => {
        const iconHtml = product.image 
            ? `<img src="${product.image}" alt="${product.name}" class="product-img">`
            : `<div class="category-icon">🛍️</div>`;
            
        html += `
            <div class="category-card product-card">
                ${iconHtml}
                <h3>${product.name}</h3>
                <p class="product-price">${product.price} ر.س</p>
                <button class="btn-primary" onclick="addToCart(${product.id}, '${product.name}', ${product.price})">أضف للسلة</button>
            </div>
        `;
    });
    
    html += `
            </div>
        </main>
        <nav class="bottom-nav">
            <button class="nav-item" onclick="navigateTo('home')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>الرئيسية</span>
            </button>
            <button class="nav-item" onclick="navigateTo('orders')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                </svg>
                <span>طلباتي</span>
            </button>
            <button class="nav-item" onclick="navigateTo('rewards')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9v12a2 2 0 002 2h8a2 2 0 002-2V9"></path>
                    <path d="M9 5a3 3 0 016 0"></path>
                    <line x1="12" y1="8" x2="12" y2="13"></line>
                    <line x1="9" y1="11" x2="15" y2="11"></line>
                </svg>
                <span>المكافآت</span>
            </button>
            <button class="nav-item" onclick="navigateTo('account')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>حسابي</span>
            </button>
        </nav>
    `;
    
    // Store the category page
    let categoryPage = document.getElementById('categoryPage');
    if (!categoryPage) {
        categoryPage = document.createElement('div');
        categoryPage.id = 'categoryPage';
        categoryPage.className = 'page';
        document.body.appendChild(categoryPage);
    }
    
    categoryPage.innerHTML = html;
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('show'));
    document.querySelector('main').style.display = 'none';
    categoryPage.classList.add('show');
}

function getCategoryName(category) {
    const names = {
        'cold-coffee': 'قهوة باردة',
        'hot-coffee': 'قهوة حارة',
        'sweets': 'حلويات',
        'smoothies': 'عصائر',
        'milkshakes': 'ميلك شيك',
        'pastries': 'معجنات'
    };
    return names[category] || category;
}

// Account Sections
function showSection(section) {
    const sectionNames = {
        'branches': 'فروع رونق',
        'addresses': 'عناويني',
        'vouchers': 'قسائم الهدايا',
        'payment': 'طرق الدفع',
        'notifications': 'الإشعارات',
        'settings': 'الإعدادات',
        'profile': 'تعديل الملف الشخصي'
    };
    
    const content = {
        'branches': `
            <div style="text-align: right; font-family: 'Tajawal', sans-serif;">
                <p>📍 فرع التحلية - مفتوح الآن</p>
                <p>📍 فرع واجهة الرياض - مفتوح الآن</p>
                <p>📍 فرع النخيل مول - قريباً</p>
            </div>
        `,
        'addresses': `
            <div style="text-align: right; font-family: 'Tajawal', sans-serif;">
                <p>🏠 المنزل: حي النرجس، شارع 15</p>
                <p>🏢 العمل: برج المملكة، الطابق 22</p>
            </div>
        `,
        'vouchers': `
            <div style="text-align: right; font-family: 'Tajawal', sans-serif;">
                <p>🎁 لا توجد قسائم هدايا فعالة حالياً.</p>
                <button class="btn-primary" style="margin-top:10px;">إضافة قسيمة جديدة</button>
            </div>
        `,
        'payment': `
            <div style="text-align: right; font-family: 'Tajawal', sans-serif;">
                <p>💳 أبل باي (Apple Pay)</p>
                <p>💳 بطاقة مدى تنتهي بـ 4521</p>
                <button class="btn-secondary" style="margin-top:10px;">إضافة بطاقة جديدة</button>
            </div>
        `,
        'notifications': `
            <div style="text-align: right; font-family: 'Tajawal', sans-serif;">
                <p>🔔 تم تفعيل التنبيهات للعروض الجديدة.</p>
                <p>🔔 تم تفعيل تنبيهات حالة الطلب.</p>
            </div>
        `,
        'settings': `
            <div style="text-align: right; font-family: 'Tajawal', sans-serif;">
                <p>🌐 اللغة: العربية</p>
                <p>🌙 المظهر: فاتح</p>
                <p>🔒 الخصوصية والأمان</p>
            </div>
        `,
        'profile': `
            <div style="text-align: right; font-family: 'Tajawal', sans-serif;">
                <p>الاسم: أحمد خالد</p>
                <p>رقم الجوال: 050XXXXXXX</p>
                <p>البريد الإلكتروني: ahmed@example.com</p>
                <button class="btn-primary" style="margin-top:10px;">حفظ التعديلات</button>
            </div>
        `
    };

    const modalHtml = `
        <div class="modal show" id="dynamicModal" onclick="this.remove()">
            <div class="modal-content" onclick="event.stopPropagation()" style="padding: 24px;">
                <div class="modal-header">
                    <h2>${sectionNames[section]}</h2>
                    <button class="close-btn" onclick="document.getElementById('dynamicModal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    ${content[section]}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Order Options
function selectOption(option) {
    showNotification(`تم اختيار: ${getOptionName(option)}`);
}

function getOptionName(option) {
    const names = {
        'pickup': 'استلام من الفرع',
        'delivery': 'توصيل للمنزل',
        'carservice': 'الطلب من السيارة'
    };
    return names[option] || option;
}

// Notifications
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4A1D1D;
        color: #F5E6D3;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: 'Tajawal', sans-serif;
        font-weight: 600;
        z-index: 2000;
        animation: slideInRight 0.3s;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('cartBtn').addEventListener('click', openCart);
    
    // Close modal when clicking outside
    document.getElementById('cartModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeCart();
        }
    });
});

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
