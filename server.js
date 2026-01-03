// server.js

const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// ฐานข้อมูลจำลองในหน่วยความจำ (สำหรับเก็บออเดอร์)
let completedOrders = []; 
let orderCounter = 1001; 

// Middleware: ตั้งค่าให้ Express รับข้อมูล JSON จาก Request Body ได้
app.use(express.json());

// Static Files: ให้บริการไฟล์ HTML, CSS, JS จากโฟลเดอร์ 'public'
app.use(express.static(path.join(__dirname, 'public')));


// --- API ENDPOINTS ---

// 1. รับออเดอร์ใหม่จากหน้า POS (เมื่อพนักงานกด "ชำระเงิน" หรือ "บันทึก")
app.post('/api/orders', (req, res) => {
    const newOrder = {
        orderId: orderCounter++,
        table: req.body.table,
        items: req.body.items,
        total: req.body.total,
        status: req.body.status || 'PENDING', 
        timestamp: new Date().toISOString()
    };

    completedOrders.unshift(newOrder); 
    console.log(`[New Order] #${newOrder.orderId} from ${newOrder.table} - Status: ${newOrder.status}`);

    res.status(201).json({ 
        message: 'Order recorded.', 
        order: newOrder 
    });
});

// 2. Endpoint สำหรับอัปเดตสถานะการชำระเงิน (จาก PENDING เป็น PAID)
app.put('/api/orders/:orderId/status', (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const newStatus = req.body.status; 

    const order = completedOrders.find(o => o.orderId === orderId);

    if (order) {
        order.status = newStatus;
        console.log(`[Status Update] Order #${orderId} is now ${newStatus}`);
        res.json({ message: `Order ${orderId} status updated to ${newStatus}` });
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
});


// เริ่มต้น Server
app.listen(PORT, () => {
    console.log(`OrderFlow Pro Backend running on http://localhost:${PORT}`);
    console.log(`- POS Terminal: http://localhost:${PORT}/index.html`);
});