// assets/js/app.js
// Logika Inti Aplikasi: CRUD Produk, Manajemen Kasir, dan Laporan Visual.
// Menggunakan localStorage sebagai pengganti database.

// ===================================
// INISIALISASI & UTILITY
// ===================================

// Fungsi untuk format mata uang Rupiah
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

// Fungsi untuk inisialisasi data dummy (Produk & Transaksi)
function initializeDummyData() {
    // 1. Data Produk Dummy
    if (!localStorage.getItem('products')) {
        console.log('Membuat data dummy produk...');
        const dummyProducts = [
            // Jasa (Solusi UPJ - Paling Menguntungkan)
            { id: 1, nama: 'Jasa Servis PC', tipe: 'jasa', modal: 50000, harga: 150000 },
            { id: 2, nama: 'Jasa Cetak 3D (per jam)', tipe: 'jasa', modal: 10000, harga: 35000 },
            { id: 3, nama: 'Project Website UKM', tipe: 'jasa', modal: 500000, harga: 2000000 },
            // Barang
            { id: 4, nama: 'Kopi Susu Gula Aren', tipe: 'barang', modal: 3000, harga: 8000 },
            { id: 5, nama: 'Donat Coklat', tipe: 'barang', modal: 1500, harga: 3000 },
            { id: 6, nama: 'Flashdisk 16GB', tipe: 'barang', modal: 45000, harga: 60000 }
        ];
        localStorage.setItem('products', JSON.stringify(dummyProducts));
    }

    // 2. Data Transaksi Dummy
    if (!localStorage.getItem('transactions')) {
        console.log('Membuat data dummy transaksi...');
        const transactions = [];
        const today = new Date();
        const products = JSON.parse(localStorage.getItem('products'));

        for (let i = 10; i > 0; i--) { // 10 hari ke belakang
            let date = new Date();
            date.setDate(today.getDate() - i);
            
            for (let j = 0; j < Math.floor(Math.random() * 3) + 1; j++) { // 1-3 transaksi per hari
                const item1 = products[Math.floor(Math.random() * products.length)];
                const item2 = products[Math.floor(Math.random() * products.length)];
                
                const item1Profit = (item1.harga - item1.modal);
                const item2Profit = (item2.harga - item2.modal);

                transactions.push({
                    id: `TRX-${date.getTime()}-${j}`,
                    tanggal: date.toISOString(),
                    metode: (i % 2 === 0) ? 'QRIS' : 'Cash',
                    items: [
                        { ...item1, qty: 1 },
                        { ...item2, qty: 1 }
                    ],
                    total: item1.harga + item2.harga,
                    totalProfit: item1Profit + item2Profit
                });
            }
        }
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    if (!localStorage.getItem('customers')) {
        console.log('Membuat data dummy pelanggan internal...');
        const dummyCustomers = [
            // SaldoPiutang adalah jumlah uang yang BELUM dibayar pelanggan (Utang mereka ke UPJ)
            { id: 101, nama: 'Siswa A - RPL', kontak: '0812xxx', saldoPiutang: 500000 },
            { id: 102, nama: 'Ibu B - Guru B. Indo', kontak: '0857xxx', saldoPiutang: 0 },
            { id: 103, nama: 'Bapak C - Staff TU', kontak: '0899xxx', saldoPiutang: 150000 }
        ];
        localStorage.setItem('customers', JSON.stringify(dummyCustomers));
    }
} // Tutup function initializeDummyData


// ===================================
// FUNGSI UNTUK HALAMAN DASHBOARD (index.html)
// ===================================
// FITUR 1: Chart Naik Turun Penjualan & Total Penjualan
let weeklySalesChartInstance;

function loadDashboardData() {
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    // Hitung Kartu Metrik
    let totalPenjualan = 0;
    let totalProfit = 0;
    transactions.forEach(trx => {
        totalPenjualan += trx.total;
        totalProfit += trx.totalProfit;
    });

    $('#total-penjualan').text(formatRupiah(totalPenjualan));
    $('#total-profit').text(formatRupiah(totalProfit));
    $('#total-transaksi').text(transactions.length);

    // Siapkan Data untuk Chart Penjualan Mingguan (7 Hari Terakhir)
    const salesData = { labels: [], values: [] };
    let dailySales = {};

    for (let i = 6; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        let key = d.toISOString().split('T')[0];
        salesData.labels.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        dailySales[key] = 0;
    }

    transactions.forEach(trx => {
        let key = trx.tanggal.split('T')[0];
        if (dailySales[key] !== undefined) {
            dailySales[key] += trx.total;
        }
    });

    salesData.values = Object.values(dailySales);

    // Gambar Chart menggunakan Chart.js
    const ctx = document.getElementById('weeklySalesChart');
    if (ctx) {
        if (weeklySalesChartInstance) weeklySalesChartInstance.destroy();

        weeklySalesChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: salesData.labels,
                datasets: [{
                    label: 'Penjualan',
                    data: salesData.values,
                    fill: true,
                    borderColor: 'rgb(78, 115, 223)',
                    backgroundColor: 'rgba(78, 115, 223, 0.1)',
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        ticks: { callback: value => formatRupiah(value) }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: { label: context => `Penjualan: ${formatRupiah(context.raw)}` }
                    }
                }
            }
        });
    }
}

// ===================================
// FUNGSI UNTUK HALAMAN CRUD (barang.html)
// ===================================
// FITUR 2: CRUD Barang/Jasa

// Muat data produk ke tabel
function loadProductTable() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const tableBody = $('#product-table-body');
    tableBody.empty();

    if (products.length === 0) {
        tableBody.append('<tr><td colspan="6" class="text-center">Belum ada data produk.</td></tr>');
        return;
    }

    products.forEach(product => {
        const row = `
            <tr>
                <td>${product.id}</td>
                <td>${product.nama}</td>
                <td><span class="badge bg-${product.tipe === 'jasa' ? 'success' : 'info'}">${product.tipe.toUpperCase()}</span></td>
                <td>${formatRupiah(product.modal)}</td>
                <td>${formatRupiah(product.harga)}</td>
                <td>
                    <button class="btn btn-warning btn-sm btn-edit" data-id="${product.id}">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn btn-danger btn-sm btn-delete" data-id="${product.id}">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>
        `;
        tableBody.append(row);
    });
}

// Fungsi untuk menangani submit form (Tambah atau Update)
function handleProductFormSubmit(event) {
    event.preventDefault();
    
    const productId = $('#product-id').val();
    const productName = $('#product-name').val();
    const productType = $('input[name="product-type"]:checked').val();
    const productModal = parseInt($('#product-modal').val());
    const productPrice = parseInt($('#product-price').val());

    if (productPrice < productModal) {
        alert('Harga Jual tidak boleh lebih kecil dari Harga Modal!');
        return;
    }

    let products = JSON.parse(localStorage.getItem('products')) || [];

    if (productId) {
        // Mode Update
        const index = products.findIndex(p => p.id == productId);
        if (index !== -1) {
            products[index] = { 
                id: parseInt(productId), 
                nama: productName, 
                tipe: productType, 
                modal: productModal, 
                harga: productPrice 
            };
        }
    } else {
        // Mode Tambah Baru
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push({
            id: newId,
            nama: productName,
            tipe: productType,
            modal: productModal,
            harga: productPrice
        });
    }

    localStorage.setItem('products', JSON.stringify(products));

    // Reset UI
    cancelProductEdit(); // Panggil fungsi pembatalan untuk reset form
    loadProductTable();
}

// Fungsi untuk mengisi form saat tombol "Edit" diklik
function handleEditProduct(event) {
    const id = $(event.currentTarget).data('id');
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const product = products.find(p => p.id == id);

    if (product) {
        $('#product-id').val(product.id);
        $('#product-name').val(product.nama);
        $(`input[name="product-type"][value="${product.tipe}"]`).prop('checked', true);
        $('#product-modal').val(product.modal);
        $('#product-price').val(product.harga);

        $('#form-title').text('Edit Barang/Jasa');
        $('#submit-button').text('Update Data');
        $('#cancel-edit-button').removeClass('d-none');
        window.scrollTo(0, 0);
    }
}

// Fungsi untuk membatalkan mode edit dan mereset form
function cancelProductEdit() {
    $('#product-form')[0].reset();
    $('#product-id').val('');
    $('#form-title').text('Tambah Barang/Jasa Baru');
    $('#submit-button').text('Simpan');
    $('#cancel-edit-button').addClass('d-none');
}

// Fungsi untuk menghapus produk
function handleDeleteProduct(event) {
    const id = $(event.currentTarget).data('id');
    
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
        let products = JSON.parse(localStorage.getItem('products')) || [];
        products = products.filter(p => p.id != id);
        
        localStorage.setItem('products', JSON.stringify(products));
        loadProductTable();
    }
}

// ===================================
// FUNGSI UNTUK HALAMAN KASIR (kasir.html)
// ===================================
// FITUR 5: Halaman Kasir & Metode Pembayaran

let cart = []; // Variabel global untuk keranjang (cart)

// Muat daftar produk ke halaman kasir
function loadProductsForCashier() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const container = $('#product-list-container');
    container.empty();

    if (products.length === 0) {
        container.html('<p class="text-center">Belum ada produk. Silakan tambah di halaman Data Barang/Jasa.</p>');
        return;
    }

    products.forEach(product => {
        const card = `
            <div class="col-md-4 col-6 mb-3 product-item-card" 
                 data-id="${product.id}" 
                 data-nama="${product.nama}" 
                 data-harga="${product.harga}" 
                 data-modal="${product.modal}" 
                 data-tipe="${product.tipe}">
                
                <div class="card h-100 product-card shadow-sm border-${product.tipe === 'jasa' ? 'success' : 'info'}">
                    <div class="card-body text-center d-flex flex-column justify-content-center p-2">
                        <h5 class="card-title fs-6 mb-1">${product.nama}</h5>
                        <p class="card-text fw-bold text-primary mb-0">${formatRupiah(product.harga)}</p>
                    </div>
                </div>
            </div>
        `;
        container.append(card);
    });
}

// Fungsi filter produk di halaman kasir
function filterProducts() {
    const query = $('#search-product').val().toLowerCase();
    $('.product-item-card').each(function() {
        const nama = $(this).data('nama').toLowerCase();
        if (nama.includes(query)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}

// Fungsi untuk merender (menampilkan) isi keranjang
function renderCart() {
    const cartList = $('#cart-items-list');
    cartList.empty();
    
    let total = 0;

    if (cart.length === 0) {
        cartList.append('<li class="list-group-item text-center text-muted">Keranjang kosong</li>');
        $('#btn-show-payment').prop('disabled', true);
    } else {
        cart.forEach(item => {
            const itemTotal = item.harga * item.qty;
            total += itemTotal;
            const itemElement = `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="my-0">${item.nama}</h6>
                        <small class="text-muted">${formatRupiah(item.harga)} x ${item.qty}</small>
                    </div>
                    <span class="text-muted">${formatRupiah(itemTotal)}</span>
                    <button class="btn btn-sm btn-outline-danger btn-remove-cart-item" data-id="${item.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </li>
            `;
            cartList.append(itemElement);
        });
        $('#btn-show-payment').prop('disabled', false);
    }
    
    $('#cart-total').text(formatRupiah(total));
    $('#modal-total-payment').text(formatRupiah(total));
}

// Fungsi saat produk di-klik (tambah ke keranjang)
function handleAddToCart(event) {
    const card = $(event.currentTarget);
    const productId = card.data('id');
    const existingItem = cart.find(item => item.id == productId);

    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({
            id: productId,
            nama: card.data('nama'),
            harga: card.data('harga'),
            modal: card.data('modal'),
            tipe: card.data('tipe'),
            qty: 1
        });
    }
    renderCart();
}

// Fungsi untuk menghapus item dari keranjang
function handleRemoveFromCart(event) {
    const id = $(event.currentTarget).data('id');
    const itemIndex = cart.findIndex(item => item.id == id);

    if (itemIndex > -1) {
        if (cart[itemIndex].qty > 1) {
            cart[itemIndex].qty--;
        } else {
            cart.splice(itemIndex, 1);
        }
    }
    renderCart();
}

// Fungsi untuk mengosongkan keranjang
function clearCart() {
    if (confirm('Anda yakin ingin mengosongkan keranjang?')) {
        cart = [];
        renderCart();
    }
}

// Fungsi untuk menyelesaikan transaksi
function handleFinishTransaction() {
    if (cart.length === 0) {
        alert('Keranjang masih kosong!');
        return;
    }

    const paymentMethod = $('input[name="payment-method"]:checked').val();
    let total = 0;
    let totalProfit = 0;

    cart.forEach(item => {
        total += item.harga * item.qty;
        totalProfit += (item.harga - item.modal) * item.qty;
    });

    const newTransaction = {
        id: `TRX-${new Date().getTime()}`,
        tanggal: new Date().toISOString(),
        metode: paymentMethod,
        items: cart,
        total: total,
        totalProfit: totalProfit
    };

    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    transactions.push(newTransaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));

    cart = [];
    renderCart();
    $('#payment-modal').modal('hide');
    alert(`Transaksi ${newTransaction.id} berhasil disimpan!`);
}


// ===================================
// FUNGSI UNTUK HALAMAN LAPORAN (laporan.html)
// ===================================
// FITUR 4: Laporan Informatif (Profit/Loss & Projec Menguntungkan)

let dailyProfitChartInstance;
let bestProjectChartInstance;

function loadReportData() {
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    // Muat semua laporan
    loadTransactionTableReport(transactions);
    loadDailyProfitChart(transactions);
    loadBestProjectChart(transactions);
}

// Fungsi untuk memuat data ke tabel transaksi di halaman laporan
function loadTransactionTableReport(transactions) {
    const tableBody = $('#transaction-table-body');
    tableBody.empty();

    if (transactions.length === 0) {
        tableBody.append('<tr><td colspan="6" class="text-center">Belum ada data transaksi.</td></tr>');
        return;
    }

    transactions.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    transactions.forEach(trx => {
        const itemsSummary = trx.items.map(item => `${item.nama} (x${item.qty})`).join(', ');
        
        const row = `
            <tr>
                <td>${trx.id}</td>
                <td>${new Date(trx.tanggal).toLocaleString('id-ID')}</td>
                <td>${trx.metode}</td>
                <td>${formatRupiah(trx.total)}</td>
                <td>${formatRupiah(trx.totalProfit)}</td>
                <td><small>${itemsSummary}</small></td>
            </tr>
        `;
        tableBody.append(row);
    });
}

// Fungsi untuk chart profit harian (Visual Profit/Loss)
function loadDailyProfitChart(transactions) {
    const data = { labels: [], values: [] };
    let dailyProfits = {};

    // 30 hari terakhir
    for (let i = 29; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        let key = d.toISOString().split('T')[0];
        data.labels.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        dailyProfits[key] = 0;
    }

    transactions.forEach(trx => {
        let key = trx.tanggal.split('T')[0];
        if (dailyProfits[key] !== undefined) {
            dailyProfits[key] += trx.totalProfit;
        }
    });

    data.values = Object.values(dailyProfits);

    const ctx = document.getElementById('dailyProfitChart');
    if (ctx) {
        if (dailyProfitChartInstance) dailyProfitChartInstance.destroy();
        
        dailyProfitChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Profit Harian',
                    data: data.values,
                    backgroundColor: 'rgba(28, 200, 138, 0.8)',
                    borderColor: 'rgba(28, 200, 138, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { ticks: { callback: value => formatRupiah(value) } }
                },
                plugins: {
                    tooltip: { callbacks: { label: context => `Profit: ${formatRupiah(context.raw)}` } }
                }
            }
        });
    }
}

// Fungsi untuk chart Jasa/Project Paling Menguntungkan (SOLUSI KREATIF)
function loadBestProjectChart(transactions) {
    let projectProfits = {};

    transactions.forEach(trx => {
        trx.items.forEach(item => {
            // HANYA proses item yang tipenya 'jasa'
            if (item.tipe === 'jasa') {
                const profit = (item.harga - item.modal) * item.qty;
                
                if (projectProfits[item.nama]) {
                    projectProfits[item.nama] += profit;
                } else {
                    projectProfits[item.nama] = profit;
                }
            }
        });
    });

    const labels = Object.keys(projectProfits);
    const values = Object.values(projectProfits);

    const ctx = document.getElementById('bestProjectChart');
    if (ctx) {
        if (bestProjectChartInstance) bestProjectChartInstance.destroy();
        
        bestProjectChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Profit',
                    data: values,
                    backgroundColor: [
                        'rgba(78, 115, 223, 0.9)',
                        'rgba(28, 200, 138, 0.9)',
                        'rgba(54, 185, 204, 0.9)',
                        'rgba(246, 194, 62, 0.9)',
                        'rgba(231, 74, 59, 0.9)',
                    ],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: { callbacks: { label: context => `${context.label}: ${formatRupiah(context.raw)}` } }
                }
            }
        });
    }
}


// ===================================
// EKSEKUSI GLOBAL & PENYIAPAN EVENT
// ===================================

$(document).ready(function() {
    // Inisialisasi data dummy
    initializeDummyData();
    
    // Tentukan halaman saat ini
    const currentPage = window.location.pathname.split('/').pop();
    
    // Logika pengaktifan menu navbar (UX)
    if (currentPage) {
        $('.navbar-nav .nav-link').each(function() {
            if ($(this).attr('href') === currentPage) {
                $(this).addClass('active fw-bold');
            }
        });
    } else {
        $('.navbar-nav .nav-link[href="index.html"]').addClass('active fw-bold');
    }


    // --- PENGATURAN LOGIKA PER HALAMAN ---

    if (currentPage === 'index.html' || currentPage === '') {
        // Halaman Dashboard (FITUR 1)
        loadDashboardData();
    } 
    else if (currentPage === 'barang.html') {
        // Halaman CRUD Barang (FITUR 2)
        loadProductTable();
        $('#product-form').on('submit', handleProductFormSubmit);
        $('#cancel-edit-button').on('click', cancelProductEdit);
        $('#product-table-body').on('click', '.btn-edit', handleEditProduct);
        $('#product-table-body').on('click', '.btn-delete', handleDeleteProduct);
    } 
    else if (currentPage === 'kasir.html') {
        // Halaman Kasir (FITUR 5)
        loadProductsForCashier();
        renderCart(); // Render cart saat halaman dimuat (mungkin ada sisa session)

        $('#search-product').on('keyup', filterProducts);
        $('#product-list-container').on('click', '.product-item-card', handleAddToCart);
        $('#cart-items-list').on('click', '.btn-remove-cart-item', handleRemoveFromCart);
        $('#btn-clear-cart').on('click', clearCart);
        
        $('#btn-show-payment').on('click', function() {
            $('#payment-modal').modal('show');
        });
        
        $('#btn-finish-transaction').on('click', handleFinishTransaction);
    }
    else if (currentPage === 'laporan.html') {
        // Halaman Laporan (FITUR 4)
        loadReportData();
    }
    else if (currentPage === 'pelanggan.html') {
    // Halaman Pelanggan Internal (Piutang)
    loadCustomerData(); 
    $('#customer-form').on('submit', handleCustomerFormSubmit);
    $('#customer-table-body').on('click', '.btn-delete-cust', handleDeleteCustomer);
    
    // Logika Pelunasan
    $('#pay-customer-id').on('change', updateDebtInfo);
    $('#btn-pay-debt').on('click', handleDebtPayment);

}
});

// assets/js/app.js

// ===================================
// FUNGSI BARU UNTUK HALAMAN PELANGGAN (pelanggan.html)
// ===================================

function loadCustomerData() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const tableBody = $('#customer-table-body');
    const selectPelanggan = $('#pay-customer-id');
    
    tableBody.empty();
    selectPelanggan.find('option:not(:first)').remove(); // Kosongkan kecuali opsi "Pilih Pelanggan"

    if (customers.length === 0) {
        tableBody.append('<tr><td colspan="4" class="text-center">Belum ada data pelanggan internal.</td></tr>');
        return;
    }

    customers.forEach(cust => {
        // Tambahkan ke tabel
        const row = `
            <tr>
                <td>${cust.nama}</td>
                <td>${cust.kontak}</td>
                <td class="fw-bold text-${cust.saldoPiutang > 0 ? 'danger' : 'success'}">${formatRupiah(cust.saldoPiutang)}</td>
                <td>
                    <button class="btn btn-danger btn-sm btn-delete-cust" data-id="${cust.id}">
                        <i class="bi bi-trash-fill"></i> Hapus
                    </button>
                </td>
            </tr>
        `;
        tableBody.append(row);

        // Tambahkan ke dropdown pembayaran
        selectPelanggan.append(`<option value="${cust.id}" data-debt="${cust.saldoPiutang}">${cust.nama} (${formatRupiah(cust.saldoPiutang)})</option>`);
    });
}

// Fungsi untuk menangani Tambah Pelanggan
function handleCustomerFormSubmit(event) {
    event.preventDefault();
    const customerName = $('#customer-name').val();
    const customerContact = $('#customer-contact').val();

    let customers = JSON.parse(localStorage.getItem('customers')) || [];
    const newId = customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 101;
    
    customers.push({
        id: newId,
        nama: customerName,
        kontak: customerContact,
        saldoPiutang: 0 // Piutang awal selalu 0
    });

    localStorage.setItem('customers', JSON.stringify(customers));
    $('#customer-form')[0].reset();
    alert('Pelanggan berhasil ditambahkan!');
    loadCustomerData(); // Muat ulang data
}

// Fungsi untuk menangani Pembayaran Piutang (Pelunasan)
function handleDebtPayment() {
    const customerId = $('#pay-customer-id').val();
    const paymentAmount = parseInt($('#payment-amount').val());
    
    if (!customerId || isNaN(paymentAmount) || paymentAmount <= 0) {
        alert('Mohon pilih pelanggan dan masukkan jumlah pembayaran yang valid.');
        return;
    }

    let customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.id == customerId);

    if (customerIndex !== -1) {
        const currentDebt = customers[customerIndex].saldoPiutang;

        if (paymentAmount > currentDebt) {
            alert(`Pembayaran melebihi saldo piutang saat ini (${formatRupiah(currentDebt)}). Masukkan jumlah yang benar.`);
            return;
        }

        // Kurangi saldo piutang
        customers[customerIndex].saldoPiutang -= paymentAmount;
        
        localStorage.setItem('customers', JSON.stringify(customers));
        alert(`Pembayaran ${formatRupiah(paymentAmount)} berhasil dicatat. Sisa utang: ${formatRupiah(customers[customerIndex].saldoPiutang)}`);
        
        $('#payment-amount').val('');
        loadCustomerData(); // Muat ulang data
    }
}

// Handler perubahan pelanggan di form pembayaran
function updateDebtInfo() {
    const selectedOption = $('#pay-customer-id option:selected');
    const debt = parseInt(selectedOption.data('debt')) || 0;
    
    $('#current-debt-info').text(`Saldo Piutang: ${formatRupiah(debt)}`);
    $('#btn-pay-debt').prop('disabled', debt === 0);
}

// Fungsi untuk menghapus pelanggan
function handleDeleteCustomer(event) {
    const id = $(event.currentTarget).data('id');
    let customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customer = customers.find(c => c.id == id);

    if (customer.saldoPiutang > 0) {
        alert('Tidak bisa menghapus! Pelanggan ini masih memiliki utang. Mohon selesaikan pelunasan terlebih dahulu.');
        return;
    }

    if (confirm(`Yakin ingin menghapus pelanggan ${customer.nama}?`)) {
        customers = customers.filter(c => c.id != id);
        localStorage.setItem('customers', JSON.stringify(customers));
        loadCustomerData();
    }
}

// assets/js/app.js (Dekat loadProductsForCashier)

function loadCustomersForPiutang() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const select = $('#piutang-customer-id');
    select.find('option:not(:first)').remove(); // Kosongkan kecuali opsi default

    customers.forEach(cust => {
        select.append(`<option value="${cust.id}">${cust.nama}</option>`);
    });
}

// assets/js/app.js (di dalam function handleFinishTransaction)

function handleFinishTransaction() {
    // ... (kode pengecekan cart.length yang sudah ada)

    const paymentMethod = $('input[name="payment-method"]:checked').val();
    let customerId = null; // Tambahkan variabel untuk ID pelanggan

    // --- LOGIKA PIUTANG BARU ---
    if (paymentMethod === 'Piutang') {
        customerId = $('#piutang-customer-id').val();
        if (!customerId) {
            alert('Anda memilih Piutang, mohon pilih Pelanggan Internal!');
            return;
        }
    }
    // --- AKHIR LOGIKA PIUTANG BARU ---

    let total = 0;
    let totalProfit = 0;
    // ... (kode penghitungan total dan totalProfit yang sudah ada)

    const newTransaction = {
        // ... (id, tanggal, metode, items, total, totalProfit yang sudah ada)
        // Tambahkan ID Pelanggan ke Transaksi
        customerId: customerId || null 
    };

    // ... (kode penyimpanan transaksi ke localStorage yang sudah ada)

    // --- UPDATE SALDO PIUTANG PELANGGAN ---
    if (paymentMethod === 'Piutang' && customerId) {
        let customers = JSON.parse(localStorage.getItem('customers')) || [];
        const customerIndex = customers.findIndex(c => c.id == customerId);

        if (customerIndex !== -1) {
            // Tambahkan nilai total ke saldoPiutang pelanggan
            customers[customerIndex].saldoPiutang += total;
            localStorage.setItem('customers', JSON.stringify(customers));
        }
    }
    // --- AKHIR UPDATE SALDO PIUTANG ---

    // Reset, alert, dan hide modal... (lanjutkan kode yang sudah ada)
}

