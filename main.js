// main.js - โค้ดที่อัปเดตสำหรับ POS Takeaway, ระบบสมาชิก, สต็อก, รายงาน, Modifier, สถานะสินค้าหมด, และแต้มสะสม

// --- 1. Initial Data และ Local Storage Setup ---
const initialMenuData = [
    { id: 1, name: 'ข้าวผัดกุ้ง', price: 75, category: 'อาหารหลัก', isDrink: false, imageUrl: 'https://via.placeholder.com/150/ff9800?text=Shrimp+Fried+Rice' },
    { id: 2, name: 'ยำวุ้นเส้น', price: 60, category: 'อาหารหลัก', isDrink: false, imageUrl: 'https://via.placeholder.com/150/ff5722?text=Spicy+Vermicelli' },
    { id: 3, name: 'ชาเขียวเย็น', price: 50, category: 'เครื่องดื่ม', isDrink: true, imageUrl: 'https://via.placeholder.com/150/4caf50?text=Iced+Green+Tea' },
    { id: 4, name: 'กาแฟอเมริกาโน่', price: 45, category: 'เครื่องดื่ม', isDrink: true, imageUrl: 'https://via.placeholder.com/150/795548?text=Americano' },
    { id: 5, name: 'เค้กช็อกโกแลต', price: 80, category: 'ของหวาน', isDrink: false, imageUrl: 'https://via.placeholder.com/150/607d8b?text=Chocolate+Cake' },
];

// ข้อมูลเริ่มต้นสำหรับสมาชิก (ถ้าไม่มีใน Local Storage)
const initialMemberData = [
    { phone: '0812223333', name: 'คุณมานี', discountRate: 0.15, points: 50 }, 
    { phone: '0894445555', name: 'คุณสมชาย', discountRate: 0.15, points: 120 },
    { phone: '123', name: 'VIP', discountRate: 0.20, points: 500 }, 
];

// --- Member/Point Functions (NEW/MODIFIED) ---
function getMemberData() {
    const data = localStorage.getItem('memberList');
    if (data) return JSON.parse(data);
    // บันทึกข้อมูลเริ่มต้นหากยังไม่มี
    localStorage.setItem('memberList', JSON.stringify(initialMemberData));
    return initialMemberData;
}

function saveMemberData(members) {
    localStorage.setItem('memberList', JSON.stringify(members));
}
// --- End Member/Point Functions ---


// --- Stock/Report Functions ---
function getMenuData() {
    const data = localStorage.getItem('cafeMenu');
    if (data) return JSON.parse(data);
    localStorage.setItem('cafeMenu', JSON.stringify(initialMenuData));
    return initialMenuData;
}

function saveMenuData(menu) {
    localStorage.setItem('cafeMenu', JSON.stringify(menu));
}

function getOrderSequence() {
    const seq = localStorage.getItem('orderSequence');
    return seq ? parseInt(seq) : 1; 
}

function incrementOrderSequence() {
    let currentSeq = getOrderSequence();
    currentSeq++;
    localStorage.setItem('orderSequence', currentSeq);
    return currentSeq;
}

function getTransactions() {
    const data = localStorage.getItem('transactions');
    return data ? JSON.parse(data) : [];
}

function saveTransaction(transaction) {
    const transactions = getTransactions();
    transactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function getStock() {
    const data = localStorage.getItem('stockLevels');
    if (data) return JSON.parse(data);
    
    const menu = getMenuData();
    const initialStock = menu.map(item => ({
        id: item.id,
        name: item.name,
        qty: 100 
    }));
    localStorage.setItem('stockLevels', JSON.stringify(initialStock));
    return initialStock;
}

function saveStock(stockData) {
    localStorage.setItem('stockLevels', JSON.stringify(stockData));
}

function decreaseStock(cart) {
    let currentStock = getStock();
    cart.forEach(item => {
        const stockItem = currentStock.find(s => s.id === item.id);
        if (stockItem) {
            stockItem.qty = Math.max(0, stockItem.qty - item.qty);
        }
    });
    saveStock(currentStock);
}
// --- End Stock/Report Functions ---

let currentCart = []; 
let currentOrderNumber = getOrderSequence(); 
let currentMember = null; 
let pointsToUse = 0; // คะแนนที่ใช้สำหรับออเดอร์นี้
let maxPointsAvailable = 0; // คะแนนสูงสุดที่สมาชิกมี

const PROMO_DISCOUNT_RATE = 0.10; 
const VAT_RATE = 0.07;
const sugarLevels = ['100% (ปกติ)', '75%', '50% (หวานน้อย)', '25% (หวานมากน้อย)', '0% (ไม่หวาน)'];
const temperatures = ['เย็น', 'ปั่น', 'ร้อน'];
let selectedItemForModifier = null;


// --- 2. ฟังก์ชันหลักในการอัปเดตสถานะ POS ---
function updatePOSDisplay() {
    document.getElementById('order-sequence').textContent = currentOrderNumber;
    
    document.getElementById('clear-cart-btn').disabled = currentCart.length === 0;
    document.getElementById('print-kot-btn').disabled = currentCart.length === 0;
    
    renderCart(); 
    updateMemberDisplay();
}


// --- 3. ฟังก์ชันจัดการสมาชิกและการใช้แต้ม (MODIFIED) ---
function updateMemberDisplay() {
    const display = document.getElementById('member-discount-display');
    const rateDisplay = document.getElementById('member-discount-rate-display');
    const applyBtn = document.getElementById('apply-member-btn');
    const input = document.getElementById('member-input');
    const pointsUseInput = document.getElementById('points-use-input');
    
    if (currentMember) {
        display.textContent = `${(currentMember.discountRate * 100).toFixed(0)}% (${currentMember.name})`;
        rateDisplay.textContent = `${(currentMember.discountRate * 100).toFixed(0)}`;
        display.style.color = 'var(--success-color)';
        applyBtn.innerHTML = `<i class="fas fa-user-times"></i> ยกเลิกสมาชิก`;
        input.value = currentMember.phone;
        input.disabled = true;
        
        // แสดงแต้มสะสม
        document.getElementById('member-points-display').textContent = `${currentMember.points} แต้ม`; 
        maxPointsAvailable = currentMember.points;
        pointsUseInput.disabled = false;
        
    } else {
        display.textContent = `0% (ไม่มีสมาชิก)`;
        rateDisplay.textContent = '0';
        display.style.color = 'var(--text-color-light)';
        applyBtn.innerHTML = `<i class="fas fa-user-plus"></i> เพิ่มสมาชิก`;
        input.value = '';
        input.disabled = false;
        
        // ซ่อนแต้ม
        document.getElementById('member-points-display').textContent = `0 แต้ม`;
        maxPointsAvailable = 0;
        pointsToUse = 0;
        document.getElementById('points-to-use-display').textContent = '0';
        pointsUseInput.value = '';
        pointsUseInput.disabled = true;
    }
    
    // รีเฟรชส่วนลดจากแต้ม
    renderCart();
}

function setupMemberSystem() {
    const input = document.getElementById('member-input');
    const applyBtn = document.getElementById('apply-member-btn');

    applyBtn.addEventListener('click', () => {
        if (currentMember) {
            // โค้ดเดิม: ยกเลิกสมาชิก
            currentMember = null;
            pointsToUse = 0; // รีเซ็ตแต้มที่ใช้
            alert('ยกเลิกส่วนลดสมาชิกแล้ว');
        } else {
            const searchTerm = input.value.trim();
            if (!searchTerm) {
                alert('กรุณากรอกเบอร์โทรหรือชื่อสมาชิก');
                return;
            }

            let members = getMemberData(); 
            
            // 1. ค้นหาสมาชิกที่มีอยู่แล้ว
            let member = members.find(m => m.phone === searchTerm || m.name.includes(searchTerm));

            if (member) {
                // 2. ถ้าพบ: ใช้สมาชิกคนนี้
                currentMember = member;
                alert(`พบสมาชิก: ${member.name} - ใช้ส่วนลด ${(member.discountRate * 100).toFixed(0)}% มี ${member.points} แต้ม`);
            } else {
                // 3. ถ้าไม่พบ: บันทึกเป็นสมาชิกใหม่ (กรณีเป็นเบอร์โทร)
                // ตรวจสอบว่าเป็นเบอร์โทร (มีแต่ตัวเลข และมีความยาวอย่างน้อย 9 หลัก)
                const isPhoneNumber = /^[0-9]+$/.test(searchTerm) && searchTerm.length >= 9; 
                
                if (isPhoneNumber) {
                    const newMember = { 
                        phone: searchTerm, 
                        name: `ลูกค้าใหม่ (${searchTerm})`, // กำหนดชื่อเริ่มต้น
                        discountRate: 0.0, // <-- เปลี่ยนจาก 0.05 เป็น 0.0
                        points: 0 // แต้มเริ่มต้น 0
                    };
                    members.push(newMember); // เพิ่มเข้าใน List
                    saveMemberData(members); // บันทึกไปยัง Local Storage

                    currentMember = newMember;
                    alert(`✅ บันทึกเบอร์ ${searchTerm} เป็นสมาชิกใหม่แล้ว! ได้รับส่วนลด 0%`); // <-- แก้ไขข้อความแจ้งเตือน
                    
                } else {
                    // หากไม่ได้กรอกเป็นเบอร์โทร และไม่พบชื่อ
                    alert(`ไม่พบสมาชิก: "${searchTerm}" และรูปแบบไม่ถูกต้องสำหรับการบันทึกเบอร์โทรใหม่`);
                    currentMember = null;
                    input.value = '';
                }
            }
        }
        updatePOSDisplay();
    });
}

function setupPointSystem() {
    const input = document.getElementById('points-use-input');
    const applyBtn = document.getElementById('apply-points-btn');
    
    applyBtn.addEventListener('click', () => {
        if (!currentMember) {
            alert('กรุณาเพิ่มสมาชิกก่อนใช้แต้ม');
            input.value = '';
            pointsToUse = 0;
            updatePOSDisplay();
            return;
        }

        let requestedPoints = parseInt(input.value) || 0;
        
        if (requestedPoints < 0) requestedPoints = 0;
        
        // ตรวจสอบไม่ให้ใช้เกินแต้มที่มี
        if (requestedPoints > maxPointsAvailable) {
            alert(`แต้มไม่พอ! คุณมีเพียง ${maxPointsAvailable} แต้ม`);
            requestedPoints = maxPointsAvailable;
        }
        
        pointsToUse = requestedPoints;
        document.getElementById('points-to-use-display').textContent = pointsToUse;
        input.value = pointsToUse; // อัปเดต input
        
        if (pointsToUse > 0) {
            alert(`ใช้ ${pointsToUse} แต้ม (ส่วนลด ฿${(pointsToUse / 10).toFixed(2)})`);
        } else {
             alert(`ยกเลิกการใช้แต้มแล้ว`);
        }
        updatePOSDisplay();
    });
}


// --- 4. ฟังก์ชันแสดงเมนูอาหาร และหมวดหมู่ พร้อมสถานะสินค้าหมด ---
function renderMenu() {
    const menuData = getMenuData(); 
    const categoryDiv = document.getElementById('menu-categories');
    
    const categories = ['ทั้งหมด', ...new Set(menuData.map(item => item.category))];
    categoryDiv.innerHTML = '';

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = cat;
        btn.dataset.category = cat;
        btn.addEventListener('click', () => filterMenu(cat));
        categoryDiv.appendChild(btn);
    });
    
    if(categoryDiv.children.length > 0) {
        categoryDiv.children[0].classList.add('active');
        filterMenu('ทั้งหมด');
    }
}

function filterMenu(category) {
    const menuData = getMenuData();
    const stockData = getStock(); 
    const menuGrid = document.getElementById('menu-grid');
    
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-category="${category}"]`).classList.add('active');

    const filteredMenu = category === 'ทั้งหมด' 
        ? menuData 
        : menuData.filter(item => item.category === category);
        
    menuGrid.innerHTML = '';
    filteredMenu.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'menu-item';
        itemDiv.dataset.id = item.id;
        
        // ตรวจสอบสต็อก
        const stockItem = stockData.find(s => s.id === item.id);
        const isOutOfStock = stockItem && stockItem.qty <= 0;
        
        if (isOutOfStock) {
            itemDiv.classList.add('out-of-stock');
        }
        
        itemDiv.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}">
            <p class="item-name">${item.name}</p>
            <p class="item-price">${isOutOfStock ? '<span class="out-of-stock-label">สินค้าหมด</span>' : `฿${item.price}`}</p>
        `;
        
        // กำหนด Event Listener เฉพาะเมื่อสินค้าไม่หมด
        if (!isOutOfStock) {
            itemDiv.addEventListener('click', () => {
                if (item.isDrink) {
                    showModifierModal(item);
                } else {
                    addItemToCart(item);
                }
            });
        }
        
        menuGrid.appendChild(itemDiv);
    });
}

function showModifierModal(item) {
    selectedItemForModifier = item;
    const modal = document.getElementById('modifier-modal');
    document.getElementById('modifier-item-name').textContent = item.name;

    const sugarOptionsDiv = document.getElementById('sugar-options');
    const tempOptionsDiv = document.getElementById('temp-options');
    
    sugarOptionsDiv.innerHTML = '';
    tempOptionsDiv.innerHTML = '';

    // สร้างปุ่มสำหรับความหวาน
    sugarLevels.forEach((level) => {
        const btn = document.createElement('button');
        btn.className = 'modifier-option-btn';
        if (level === '50% (หวานน้อย)') { 
            btn.classList.add('selected');
        }
        btn.dataset.type = 'sugar';
        btn.textContent = level;
        sugarOptionsDiv.appendChild(btn);
    });

    // สร้างปุ่มสำหรับอุณหภูมิ
    temperatures.forEach((temp) => {
        const btn = document.createElement('button');
        btn.className = 'modifier-option-btn';
        if (temp === 'เย็น') { 
            btn.classList.add('selected');
        }
        btn.dataset.type = 'temp';
        btn.textContent = temp;
        tempOptionsDiv.appendChild(btn);
    });
    
    // ตั้งค่า Event Listener ให้กับปุ่มตัวเลือกใหม่ทั้งหมด
    document.querySelectorAll('.modifier-option-btn').forEach(btn => {
        btn.addEventListener('click', handleModifierSelection);
    });

    modal.style.display = 'block';
}

function handleModifierSelection(event) {
    const selectedBtn = event.currentTarget;
    const type = selectedBtn.dataset.type;
    
    // เคลียร์การเลือกเดิมในกลุ่มเดียวกัน
    document.querySelectorAll(`.modifier-option-btn[data-type="${type}"]`).forEach(btn => {
        btn.classList.remove('selected');
    });

    // เลือกปุ่มใหม่
    selectedBtn.classList.add('selected');
}


// --- 5. ฟังก์ชันจัดการ Cart และการคำนวณใหม่ ---
function addItemToCart(item, modifiers = {}) {
    // ตรวจสอบสต็อกอีกครั้งก่อนเพิ่มลงตะกร้า (เป็น Best Practice)
    const stockData = getStock();
    const stockItem = stockData.find(s => s.id === item.id);
    if (stockItem && stockItem.qty <= 0) {
        alert(`ขออภัย! ${item.name} หมดสต็อกแล้ว`);
        return; 
    }
    
    const isDrink = item.isDrink;
    
    let modifierNote = '';
    const isDefaultSugar = modifiers.sugar === '50% (หวานน้อย)';
    const isDefaultTemp = modifiers.temp === 'เย็น';
    
    if (modifiers.sugar && !isDefaultSugar) modifierNote += ` หวาน: ${modifiers.sugar}`;
    if (modifiers.temp && !isDefaultTemp) modifierNote += ` อุณหภูมิ: ${modifiers.temp}`;
    modifierNote = modifierNote.trim();

    // ตรวจสอบรายการซ้ำเพื่อรวม
    const existingItemIndex = currentCart.findIndex(cartItem => {
        if (cartItem.id !== item.id) return false;
        
        if (isDrink) {
            const currentModifiersKey = JSON.stringify(cartItem.modifiers);
            const newModifiersKey = JSON.stringify(modifiers);
            
            return currentModifiersKey === newModifiersKey;
        }
        
        return true;
    });

    if (existingItemIndex > -1) {
        currentCart[existingItemIndex].qty += 1;
        if(currentCart[existingItemIndex].note === '' && modifierNote !== '') {
            currentCart[existingItemIndex].note = modifierNote;
        }
    } else {
        const uniqueId = item.id + JSON.stringify(modifiers) + Date.now(); 
        currentCart.push({ 
            uniqueId: uniqueId,
            id: item.id,
            name: item.name, 
            baseName: item.name,
            modifiers: modifiers,
            price: item.price, 
            qty: 1, 
            note: modifierNote
        });
    }

    renderCart();
}

function updateCartItemQuantity(uniqueId, change) {
    const itemIndex = currentCart.findIndex(item => item.uniqueId === uniqueId);

    if (itemIndex > -1) {
        currentCart[itemIndex].qty += change;

        if (currentCart[itemIndex].qty <= 0) {
            currentCart.splice(itemIndex, 1);
        }
    }
    updatePOSDisplay(); 
}

function renderCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    cartItemsDiv.innerHTML = '';
    let subtotal = 0;

    currentCart.forEach(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;

        const cartItemDiv = document.createElement('div');
        cartItemDiv.className = 'cart-item';
        cartItemDiv.dataset.id = item.uniqueId; 
        
        cartItemDiv.innerHTML = `
            <span class="item-name-cart">${item.name}</span>
            <div class="quantity-control">
                <button class="qty-btn" data-action="decrease" data-unique-id="${item.uniqueId}">-</button>
                <span class="item-qty">${item.qty}</span>
                <button class="qty-btn" data-action="increase" data-unique-id="${item.uniqueId}">+</button>
            </div>
            <span class="item-price-cart">฿${itemTotal.toFixed(2)}</span>
            <button class="remove-btn" data-unique-id="${item.uniqueId}"><i class="fas fa-times"></i></button>
            ${item.note ? `<p class="item-note">${item.note}</p>` : `<p class="item-note add-note-btn">เพิ่มหมายเหตุ</p>`}
        `;

        cartItemDiv.querySelector('[data-action="increase"]').addEventListener('click', () => updateCartItemQuantity(item.uniqueId, 1));
        cartItemDiv.querySelector('[data-action="decrease"]').addEventListener('click', () => updateCartItemQuantity(item.uniqueId, -1));
        cartItemDiv.querySelector('.remove-btn').addEventListener('click', () => updateCartItemQuantity(item.uniqueId, -item.qty)); 
        cartItemsDiv.appendChild(cartItemDiv);
    });

    let memberDiscountRate = currentMember ? currentMember.discountRate : 0;
    
    // 1. คำนวณส่วนลดสมาชิก (%)
    const memberDiscountAmount = subtotal * memberDiscountRate;
    let subtotalAfterMemberDiscount = subtotal - memberDiscountAmount;
    
    // 2. คำนวณส่วนลดโปรโมชั่นทั่วไป
    const promoDiscountAmount = subtotalAfterMemberDiscount * PROMO_DISCOUNT_RATE;
    let subtotalAfterPromoDiscount = subtotalAfterMemberDiscount - promoDiscountAmount;

    // 3. คำนวณส่วนลดจากแต้ม (10 แต้ม = 1 บาท)
    const pointsDiscountAmount = (pointsToUse / 10).toFixed(2);
    // ตรวจสอบไม่ให้ส่วนลดแต้มเกินยอดรวมหลังส่วนลดอื่น
    const finalPointsDiscount = Math.min(parseFloat(pointsDiscountAmount), subtotalAfterPromoDiscount);
    let subtotalAfterAllDiscount = subtotalAfterPromoDiscount - finalPointsDiscount;
    
    // 4. คำนวณ VAT
    const vatAmount = subtotalAfterAllDiscount * VAT_RATE;
    
    // 5. ยอดรวมสุทธิ
    const totalAmount = subtotalAfterAllDiscount + vatAmount;

    // --- Update Display ---
    document.getElementById('subtotal').textContent = `฿${subtotal.toFixed(2)}`;
    document.getElementById('member-discount').textContent = `-฿${memberDiscountAmount.toFixed(2)}`;
    document.getElementById('promo-discount').textContent = `-฿${promoDiscountAmount.toFixed(2)}`;
    
    // แสดงส่วนลดแต้ม
    document.getElementById('points-discount').textContent = `-฿${finalPointsDiscount.toFixed(2)}`; 
    document.getElementById('points-discount-line').style.display = finalPointsDiscount > 0 ? 'flex' : 'none';

    document.getElementById('vat').textContent = `฿${vatAmount.toFixed(2)}`;
    
    document.getElementById('total-amount').textContent = `฿${totalAmount.toFixed(2)}`;
    document.getElementById('pay-amount').textContent = `฿${totalAmount.toFixed(2)}`;
    
    document.querySelector('.pay-btn').disabled = currentCart.length === 0;
    document.querySelector('.member-discount-line').style.display = memberDiscountAmount > 0 ? 'flex' : 'none';
    
    // คำนวณแต้มใหม่ที่จะได้รับ (1 แต้ม / 50 บาท จากยอดหลังหักส่วนลดอื่นๆ ยกเว้นแต้ม)
    const newPointsEarned = currentMember ? Math.floor(subtotalAfterPromoDiscount / 50) : 0; 
    document.getElementById('new-points-earned').textContent = `${newPointsEarned} แต้ม`;

    return { 
        subtotal, 
        memberDiscountAmount, 
        promoDiscountAmount, 
        pointsDiscountAmount: finalPointsDiscount, // ส่งส่วนลดแต้มที่ใช้จริง
        vatAmount, 
        totalAmount,
        newPointsEarned
    };
}

function addNoteToItem(item) {
    const itemInCart = currentCart.find(i => i.uniqueId === item.uniqueId); 
    if (!itemInCart) return; 

    const newNote = prompt(`เพิ่มหมายเหตุสำหรับเมนู "${itemInCart.name}" (เช่น เผ็ดน้อย, ไม่ใส่ผักชี):`, itemInCart.note);
    if (newNote !== null) {
        itemInCart.note = newNote.trim();
        renderCart();
    }
}


// --- 6. ฟังก์ชันจัดการ Action Buttons ---
function setupActionButtons() {
    const printKotBtn = document.getElementById('print-kot-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    
    printKotBtn.addEventListener('click', () => {
        if (currentCart.length === 0) {
            alert('ตะกร้าว่างเปล่า!');
            return;
        }
        
        console.log(`--- KOT Order #${currentOrderNumber} ---`);
        currentCart.forEach(item => {
            console.log(`${item.qty}x ${item.name} ${item.note ? `(${item.note})` : ''}`);
        });
        console.log(`-----------------------------------`);
        
        alert(`บันทึก/พิมพ์ใบสั่งในครัว (KOT) สำหรับออเดอร์ #${currentOrderNumber} แล้ว`);
    });
    
    clearCartBtn.addEventListener('click', () => {
        if (confirm('คุณแน่ใจหรือไม่ที่จะเคลียร์ออเดอร์ปัจจุบันและเริ่มใหม่?')) {
            currentCart = [];
            currentMember = null; 
            pointsToUse = 0; 
            document.getElementById('points-use-input').value = '';
            document.getElementById('points-to-use-display').textContent = '0';
            currentOrderNumber = incrementOrderSequence(); 
            updatePOSDisplay();
            alert('เริ่มออเดอร์ใหม่แล้ว');
        }
    });
}


// --- 7. ฟังก์ชันจัดการ Payment Modal และการบันทึกแต้ม ---
function setupPaymentModal() {
    const modal = document.getElementById('payment-modal');
    const payBtn = document.querySelector('.pay-btn');
    const closeModal = document.querySelector('.close-btn');
    const modalTotal = document.getElementById('modal-total');
    const cashReceivedInput = document.getElementById('cash-received');
    const cashChangeSpan = document.getElementById('cash-change');
    const finalCheckoutBtn = document.getElementById('final-checkout-btn');
    const cashSection = document.getElementById('cash-section');
    const promptPaySection = document.getElementById('promptpay-section');
    const methodBtns = document.querySelectorAll('.payment-method-btn');

    document.querySelectorAll('.quick-cash-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            cashReceivedInput.value = btn.dataset.amount;
            calculateChange();
        });
    });

    payBtn.addEventListener('click', async () => {
        if (currentCart.length === 0) {
            alert('ยังไม่มีรายการที่ต้องชำระเงิน!');
            return;
        }

        document.querySelector('.user-info').innerHTML = `<i class="fas fa-clock"></i> ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
        
        modalTotal.textContent = document.getElementById('total-amount').textContent;
        modal.style.display = 'block';

        methodBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-method="cash"]').classList.add('active');
        cashSection.classList.remove('hidden');
        promptPaySection.classList.add('hidden');
        cashReceivedInput.value = '';
        cashChangeSpan.textContent = '฿0.00';
        finalCheckoutBtn.disabled = true;
        
        promptPaySection.classList.add('hidden'); 
    });

    closeModal.addEventListener('click', () => { modal.style.display = 'none'; });
    window.addEventListener('click', (event) => {
        if (event.target === modal) { modal.style.display = 'none'; }
    });

    methodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            methodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            cashSection.classList.add('hidden');
            promptPaySection.classList.add('hidden');
            finalCheckoutBtn.disabled = true;

            if (btn.dataset.method === 'cash') {
                cashSection.classList.remove('hidden');
                calculateChange();
            } else if (btn.dataset.method === 'promptpay') {
                promptPaySection.classList.remove('hidden');
            }
        });
    });

    function calculateChange() {
        const total = parseFloat(modalTotal.textContent.replace('฿', '').replace(',', ''));
        const received = parseFloat(cashReceivedInput.value) || 0;
        const change = received - total;

        cashChangeSpan.textContent = `฿${Math.max(0, change).toFixed(2)}`;
        
        finalCheckoutBtn.disabled = (received < total && document.querySelector('.payment-method-btn.active').dataset.method === 'cash');
    }

    cashReceivedInput.addEventListener('input', calculateChange);
    
    document.getElementById('confirm-transfer-btn').addEventListener('click', () => {
        alert('ยืนยันการรับเงินโอนแล้ว! (ในระบบจริงต้องมีการตรวจสอบ)');
        finalCheckoutBtn.disabled = false; 
    });

    finalCheckoutBtn.addEventListener('click', async () => {
        const { 
            totalAmount, 
            subtotal, 
            memberDiscountAmount, 
            promoDiscountAmount, 
            pointsDiscountAmount, // ดึงส่วนลดแต้มที่ใช้จริง
            vatAmount, 
            newPointsEarned // ดึงแต้มที่ได้รับ
        } = renderCart();
        const paymentMethod = document.querySelector('.payment-method-btn.active').dataset.method;
        
        // --- Record Transaction ---
        const transaction = {
            id: currentOrderNumber,
            timestamp: new Date().toISOString(),
            items: currentCart,
            subtotal: subtotal,
            memberDiscount: memberDiscountAmount,
            promoDiscount: promoDiscountAmount,
            pointsUsedDiscount: pointsDiscountAmount, // ส่วนลดจากแต้ม
            vat: vatAmount,
            total: totalAmount,
            paymentMethod: paymentMethod,
            member: currentMember ? currentMember.name : 'N/A',
            pointsUsed: pointsToUse, // บันทึกแต้มที่ใช้
            pointsEarned: newPointsEarned // บันทึกแต้มที่ได้รับ
        };
        saveTransaction(transaction);
        
        // อัปเดตแต้มของสมาชิก (ถ้ามี)
        if (currentMember) {
            let members = getMemberData();
            const memberIndex = members.findIndex(m => m.phone === currentMember.phone);
            if (memberIndex !== -1) {
                // คะแนนใหม่ = คะแนนเดิม - คะแนนที่ใช้ + คะแนนที่ได้รับ
                members[memberIndex].points = currentMember.points - pointsToUse + newPointsEarned;
                currentMember.points = members[memberIndex].points; // อัปเดต currentMember ด้วย
                saveMemberData(members); // บันทึกข้อมูลสมาชิกที่อัปเดตแล้วลง Local Storage
            }
        }
        
        // --- Decrease Stock ---
        decreaseStock(currentCart); 
        
        alert(`ปิดบิลสำเร็จ! ยอด: ฿${totalAmount.toFixed(2)} (ออเดอร์ #${currentOrderNumber} ชำระแล้ว)
        ${newPointsEarned > 0 ? `\nได้รับแต้มใหม่: ${newPointsEarned} แต้ม` : ''}`);
        
        currentCart = [];
        currentMember = null; 
        pointsToUse = 0; // รีเซ็ตแต้ม
        document.getElementById('points-to-use-display').textContent = '0';
        currentOrderNumber = incrementOrderSequence(); 
        
        modal.style.display = 'none';
        updatePOSDisplay();
    });
}

// --- 8. ฟังก์ชันจัดการ Modifier Modal และ Menu Editor ---
function setupModifierModalLogic() {
    const modal = document.getElementById('modifier-modal');
    const closeBtn = document.querySelector('.modifier-close-btn');
    const confirmBtn = document.getElementById('confirm-modifiers-btn');

    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    confirmBtn.addEventListener('click', () => {
        const selectedSugar = modal.querySelector('.modifier-option-btn.selected[data-type="sugar"]')?.textContent;
        const selectedTemp = modal.querySelector('.modifier-option-btn.selected[data-type="temp"]')?.textContent;

        if (!selectedSugar || !selectedTemp) {
            alert('กรุณาเลือกระดับความหวานและอุณหภูมิ');
            return;
        }

        const modifiers = {
            sugar: selectedSugar,
            temp: selectedTemp
        };

        addItemToCart(selectedItemForModifier, modifiers);
        modal.style.display = 'none';
    });
}

function setupMenuEditor() {
    const menuEditorModal = document.getElementById('menu-editor-modal');
    const settingsBtn = document.querySelector('[data-panel="settings"]');
    const closeBtn = document.querySelector('.menu-editor-close-btn');
    const menuForm = document.getElementById('menu-form');
    
    settingsBtn.addEventListener('click', () => {
        renderEditorMenuList();
        menuEditorModal.style.display = 'block';
    });
    closeBtn.addEventListener('click', () => { menuEditorModal.style.display = 'none'; });

    function renderEditorMenuList() {
        const menuListDisplay = document.getElementById('menu-list-display');
        const menuData = getMenuData();
        menuListDisplay.innerHTML = '';
        
        menuData.forEach(item => {
            const row = document.createElement('div');
            row.className = 'editor-item-row';
            row.innerHTML = `
                <div class="editor-item-info">
                    <span>${item.name}</span> (฿${item.price} | ${item.category} | ${item.isDrink ? 'เครื่องดื่ม' : 'อาหาร'})
                </div>
                <div class="editor-item-actions">
                    <button class="edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            menuListDisplay.appendChild(row);
        });

        menuListDisplay.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', editMenuItem));
        menuListDisplay.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteMenuItem));
    }

    function deleteMenuItem(event) {
        const itemId = parseInt(event.currentTarget.dataset.id);
        if (confirm(`คุณแน่ใจหรือไม่ที่จะลบเมนู ID: ${itemId}?`)) {
            let menuData = getMenuData();
            menuData = menuData.filter(item => item.id !== itemId);
            saveMenuData(menuData);
            renderEditorMenuList();
            renderMenu(); 
        }
    }
    
    function editMenuItem(event) {
        const itemId = parseInt(event.currentTarget.dataset.id);
        const menuData = getMenuData();
        const itemToEdit = menuData.find(item => item.id === itemId);

        if (itemToEdit) {
            document.getElementById('item-id-edit').value = itemToEdit.id;
            document.getElementById('item-name').value = itemToEdit.name;
            document.getElementById('item-price').value = itemToEdit.price;
            document.getElementById('item-category').value = itemToEdit.category;
            document.getElementById('item-isdrink').value = itemToEdit.isDrink ? 'true' : 'false';
            document.getElementById('item-image-url').value = itemToEdit.imageUrl;
        }
    }

    menuForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let menuData = getMenuData();
        const itemIdEdit = document.getElementById('item-id-edit').value;
        const name = document.getElementById('item-name').value;
        const price = parseFloat(document.getElementById('item-price').value);
        const category = document.getElementById('item-category').value;
        const isDrink = document.getElementById('item-isdrink').value === 'true';
        const imageUrl = document.getElementById('item-image-url').value;

        if (itemIdEdit) {
            const index = menuData.findIndex(item => item.id === parseInt(itemIdEdit));
            if (index !== -1) {
                menuData[index] = { id: parseInt(itemIdEdit), name, price, category, isDrink, imageUrl };
            }
        } else {
            const newId = Math.max(...menuData.map(item => item.id), 0) + 1;
            menuData.push({ id: newId, name, price, category, isDrink, imageUrl });
        }
        
        saveMenuData(menuData);
        menuForm.reset(); 
        document.getElementById('item-id-edit').value = ''; 
        renderEditorMenuList();
        renderMenu();
    });
}


// --- 9. Stock Management Modal Logic ---
function setupStockModal() {
    const modal = document.getElementById('stock-modal');
    const stockBtn = document.querySelector('[data-panel="stock"]');
    const closeBtn = document.querySelector('.stock-close-btn');
    const saveBtn = document.getElementById('save-stock-btn');
    const listDisplay = document.getElementById('stock-list-display');

    stockBtn.addEventListener('click', () => {
        renderStockList();
        modal.style.display = 'block';
    });
    closeBtn.addEventListener('click', () => { 
        modal.style.display = 'none';
        // เมื่อปิด Stock Modal ให้รีเฟรชเมนูเพื่อให้สถานะสินค้าหมดอัปเดตทันที
        filterMenu(document.querySelector('.category-btn.active')?.dataset.category || 'ทั้งหมด'); 
    });

    function renderStockList() {
        const stockData = getStock();
        listDisplay.innerHTML = '';

        const menuData = getMenuData();

        menuData.forEach(item => {
            // ดึงหรือสร้างข้อมูลสต็อกสำหรับรายการเมนูนั้น
            const stockItem = stockData.find(s => s.id === item.id) || { id: item.id, name: item.name, qty: 0 };

            const row = document.createElement('div');
            row.className = 'stock-item-row';
            row.innerHTML = `
                <span class="stock-item-name">${item.name}</span>
                <div class="stock-input-group">
                    <label>คงเหลือ:</label>
                    <input type="number" data-id="${item.id}" value="${stockItem.qty}" min="0" />
                </div>
            `;
            listDisplay.appendChild(row);
        });
    }

    saveBtn.addEventListener('click', () => {
        let newStockData = getStock();
        let changed = false;

        listDisplay.querySelectorAll('input').forEach(input => {
            const id = parseInt(input.dataset.id);
            const newQty = parseInt(input.value);
            let stockItem = newStockData.find(s => s.id === id);

            if (!stockItem) {
                 // ถ้าไม่มีในสต็อกเดิม ให้เพิ่มใหม่
                const menuItem = getMenuData().find(m => m.id === id);
                if (menuItem) {
                    stockItem = { id: id, name: menuItem.name, qty: 0 };
                    newStockData.push(stockItem);
                }
            }
            
            if (stockItem && stockItem.qty !== newQty) {
                stockItem.qty = newQty;
                changed = true;
            }
        });

        if (changed) {
            saveStock(newStockData);
            alert('บันทึกระดับสต็อกเรียบร้อยแล้ว!');
        } else {
            alert('ไม่มีการเปลี่ยนแปลงสต็อก');
        }
        modal.style.display = 'none';
        // เมื่อบันทึกสต็อก ให้รีเฟรชเมนูเพื่อให้สถานะสินค้าหมดอัปเดตทันที
        filterMenu(document.querySelector('.category-btn.active')?.dataset.category || 'ทั้งหมด');
    });
}


// --- 10. Reporting Modal Logic และ Re-Order ---
function setupReportModal() {
    const modal = document.getElementById('report-modal');
    const reportBtn = document.querySelector('[data-panel="report"]');
    const closeBtn = document.querySelector('.report-close-btn');
    const summaryDiv = document.getElementById('report-summary');
    const transactionListDiv = document.getElementById('transaction-list-display');
    const exportBtn = document.getElementById('export-report-btn');

    reportBtn.addEventListener('click', () => {
        renderReport();
        modal.style.display = 'block';
    });
    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    function renderReport() {
        const transactions = getTransactions();
        let totalSales = 0;
        let totalDiscount = 0;
        let totalTransactionCount = transactions.length;

        transactionListDiv.innerHTML = `
            <div class="transaction-row" style="font-weight: bold; background: #EEE; padding: 10px;">
                <span>บิลที่</span>
                <span>รวม (฿)</span>
                <span>ส่วนลด (฿)</span>
                <span>ช่องทางชำระ</span>
                <span>Action</span>
            </div>
        `;

        transactions.forEach(tx => {
            totalSales += tx.total;
            // ส่วนลดรวม = ส่วนลดสมาชิก + ส่วนลดโปรโมชั่น + ส่วนลดจากแต้ม
            const totalDisc = (tx.memberDiscount || 0) + (tx.promoDiscount || 0) + (tx.pointsUsedDiscount || 0);
            totalDiscount += totalDisc;
            
            const row = document.createElement('div');
            row.className = 'transaction-row';
            row.innerHTML = `
                <span class="transaction-id">#${tx.id}</span>
                <span>${tx.total.toFixed(2)}</span>
                <span>${totalDisc.toFixed(2)}</span>
                <span>${tx.paymentMethod === 'cash' ? 'เงินสด' : 'PromptPay'}</span>
                <span><button class="reorder-btn btn-sm" data-txid="${tx.id}"><i class="fas fa-redo"></i> Re-Order</button></span> 
            `;
            transactionListDiv.appendChild(row);
        });

        // เพิ่ม Event Listener ให้กับปุ่ม Re-Order
        document.querySelectorAll('.reorder-btn').forEach(btn => {
            btn.addEventListener('click', handleReOrder);
        });

        summaryDiv.innerHTML = `
            <div class="summary-card">
                <h4>ยอดขายรวมสุทธิ (Total Net Sales)</h4>
                <p>฿${totalSales.toFixed(2)}</p>
            </div>
            <div class="summary-card">
                <h4>จำนวนบิลที่ปิดแล้ว</h4>
                <p>${totalTransactionCount}</p>
            </div>
            <div class="summary-card">
                <h4>ส่วนลดรวม</h4>
                <p style="color: #FF5722;">-฿${totalDiscount.toFixed(2)}</p>
            </div>
            <div class="summary-card">
                <h4>VAT 7% รวม</h4>
                <p style="color: #4CAF50;">฿${(totalSales * (VAT_RATE/(1+VAT_RATE))).toFixed(2)}</p>
            </div>
        `;
    }
    
    // ฟังก์ชันจัดการ Re-Order
    function handleReOrder(event) {
        const txId = parseInt(event.currentTarget.dataset.txid);
        const transactions = getTransactions();
        const transaction = transactions.find(t => t.id === txId);
        
        if (transaction && confirm(`คุณต้องการรีออเดอร์ บิลที่ #${txId} (${transaction.items.length} รายการ) หรือไม่?`)) {
            
            // ต้องเคลียร์แต้มที่ใช้ในออเดอร์ปัจจุบันด้วย
            currentCart = []; 
            pointsToUse = 0; 
            document.getElementById('points-use-input').value = '';
            document.getElementById('points-to-use-display').textContent = '0';
            
            transaction.items.forEach(item => {
                // ต้องสร้างรายการใหม่ทั้งหมด เพื่อให้มี uniqueId ใหม่
                const uniqueId = item.id + JSON.stringify(item.modifiers || {}) + Date.now() + Math.random(); 
                
                // คัดลอกรายการเดิม พร้อมอัปเดต qty
                currentCart.push({
                    uniqueId: uniqueId,
                    id: item.id,
                    name: item.name, 
                    baseName: item.baseName || item.name,
                    modifiers: item.modifiers || {},
                    price: item.price, 
                    qty: item.qty, // ใช้จำนวนเดิม
                    note: item.note || ''
                });
            });
            
            // ปิด Modal และอัปเดต POS
            document.getElementById('report-modal').style.display = 'none';
            updatePOSDisplay();
            alert(`โหลดรายการจากบิล #${txId} เข้าตะกร้าเรียบร้อยแล้ว!`);
        }
    }

    exportBtn.addEventListener('click', () => {
        const transactions = getTransactions();
        if (transactions.length === 0) {
            alert('ไม่มีข้อมูลการทำรายการที่จะส่งออก!');
            return;
        }

        let csv = "Order ID,Timestamp,Total (THB),Payment Method,Member Discount,Promo Discount,Points Used,Points Earned\n";
        
        transactions.forEach(tx => {
            const memberDisc = (tx.memberDiscount || 0).toFixed(2);
            const promoDisc = (tx.promoDiscount || 0).toFixed(2);
            const pointsUsed = tx.pointsUsed || 0;
            const pointsEarned = tx.pointsEarned || 0;
            
            csv += `${tx.id},${tx.timestamp},${tx.total.toFixed(2)},${tx.paymentMethod},${memberDisc},${promoDisc},${pointsUsed},${pointsEarned}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) { 
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `OrderFlow_Report_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        alert('ส่งออกไฟล์รายงาน CSV แล้ว');
    });
}


// --- 11. การเรียกใช้เมื่อโหลดหน้าเว็บเสร็จ ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup All Components
    renderMenu();
    setupActionButtons();
    setupPaymentModal(); 
    setupModifierModalLogic(); 
    setupMenuEditor();
    setupMemberSystem(); 
    setupPointSystem(); // Setup ระบบแต้ม
    setupStockModal();  
    setupReportModal(); 
    
    // 2. Update Display
    updatePOSDisplay();
});