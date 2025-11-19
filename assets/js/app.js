// assets/js/app.js
// Logika Inti Aplikasi: CRUD Produk, Manajemen Kasir, dan Laporan Visual.
// Menggunakan localStorage sebagai pengganti database.

// ===================================
// INISIALISASI & UTILITY GLOBAL
// ===================================

// Fungsi untuk format mata uang Rupiah
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

// Variabel global untuk Keranjang (Cart)
let cart = []; 
let weeklySalesChartInstance;
let dailyProfitChartInstance;
let bestProjectChartInstance;
// VARIABEL GLOBAL UNTUK MENYIMPAN TRANSAKSI YANG SUDAH DIFILTER
let filteredTransactionsGlobal = [];

// Fungsi untuk inisialisasi data dummy (Produk & Transaksi)
function initializeDummyData() {
    // 1. Inisialisasi Data Produk: JANGAN BUAT DUMMY jika tidak ada.
    if (!localStorage.getItem('products')) {
        console.log('Produk: Membuat array kosong (Siap untuk input manual)...');
        // Hanya simpan array kosong, bukan data dummy.
        localStorage.setItem('products', JSON.stringify([])); 
    }

    // 2. Inisialisasi Data Transaksi: JANGAN BUAT DUMMY jika tidak ada.
    if (!localStorage.getItem('transactions')) {
        console.log('Transaksi: Membuat array kosong (Siap untuk input manual)...');
        // Hanya simpan array kosong, bukan data dummy.
        localStorage.setItem('transactions', JSON.stringify([]));
    }

    // 3. Inisialisasi Data Pelanggan: JANGAN BUAT DUMMY jika tidak ada.
    if (!localStorage.getItem('customers')) {
        console.log('Pelanggan: Membuat array kosong (Siap untuk input manual)...');
        // Hanya simpan array kosong, bukan data dummy.
        localStorage.setItem('customers', JSON.stringify([])); 
    }
} // Tutup function initializeDummyData

// ===================================
// FUNGSI UNTUK HALAMAN INDEX/DASHBOARD (index.html)
// ===================================

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
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        let d = new Date(today);
        d.setDate(today.getDate() - i);
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
// FUNGSI UNTUK HALAMAN CRUD BARANG (barang.html)
// ===================================

// Muat data produk ke tabel
function loadProductTable() {
    const allProducts = JSON.parse(localStorage.getItem('products')) || [];
    
    // Ambil nilai filter dari input/select
    const filterName = $('#filter-name').val().toLowerCase();
    const filterType = $('#filter-type').val(); // 'barang', 'jasa', atau '' (Semua)

    // Filter data
    const filteredProducts = allProducts.filter(product => {
        // Filter berdasarkan Nama
        const nameMatch = product.nama.toLowerCase().includes(filterName);

        // Filter berdasarkan Tipe
        const typeMatch = filterType === "" || product.tipe === filterType;

        return nameMatch && typeMatch;
    });

    const tableBody = $('#product-table-body');
    tableBody.empty();

    if (filteredProducts.length === 0) {
        // Ganti colspan dari 6 menjadi 7 (karena ada tambahan kolom Stok)
        tableBody.append('<tr><td colspan="7" class="text-center">Tidak ada produk yang cocok dengan kriteria pencarian.</td></tr>');
        return;
    }

    filteredProducts.forEach(product => {
        // Tentukan tampilan badge stok
        let stockDisplay = '';
        if (product.tipe === 'barang') {
            const stockBadge = product.stok <= 5 ? 'bg-danger' : 'bg-secondary';
            stockDisplay = `<span class="badge ${stockBadge}">${product.stok}</span>`;
        } else {
            stockDisplay = `-`; // Untuk Jasa
        }
        
        const row = `
            <tr>
                <td class="text-center">${product.id}</td>
                <td>${product.nama}</td>
                <td class="text-center"><span class="badge bg-${product.tipe === 'jasa' ? 'success' : 'info'}">${product.tipe.toUpperCase()}</span></td>
                <td class="text-center">${product.tipe === 'barang' ? stockDisplay : 'N/A'}</td> <td>${formatRupiah(product.modal)}</td>
                <td>${formatRupiah(product.harga)}</td>
                <td class="text-center">
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
    
    // Ambil nilai dari input
    const productId = $('#product-id').val();
    const productName = $('#product-name').val().trim();
    const productType = $('input[name="product-type"]:checked').val();
    const modalValue = $('#product-modal').val();
    const priceValue = $('#product-price').val();
    
    // START PERBAIKAN: Ambil nilai Stok dari input
    const stockValue = $('#product-stock').gitval(); 
    // END PERBAIKAN: Ambil nilai Stok dari input

    // Validasi Input Kosong (ditambah stok jika tipe barang)
    if (!productName || !modalValue || !priceValue || (productType === 'barang' && stockValue === '')) {
        alert('Mohon lengkapi semua data!');
        return;
    }

    // Konversi ke integer
    const productModal = parseInt(modalValue);
    const productPrice = parseInt(priceValue);
    // START PERBAIKAN: Konversi Stok
    const productStock = productType === 'barang' ? parseInt(stockValue) : 0;
    // END PERBAIKAN: Konversi Stok
    
    // Validasi NaN
    if (isNaN(productModal) || isNaN(productPrice) || isNaN(productStock)) {
        alert('Harga Modal, Harga Jual, dan Stok harus berupa angka yang valid!');
        return;
    }

    // Validasi Bisnis: Harga Jual & Stok
    if (productPrice < productModal) {
        alert('Harga Jual tidak boleh lebih kecil dari Harga Modal!');
        return;
    }
    if (productType === 'barang' && productStock < 0) {
        alert('Stok barang tidak boleh negatif!');
        return;
    }

    let products = JSON.parse(localStorage.getItem('products')) || [];

    const newProductData = {
        nama: productName,
        tipe: productType,
        modal: productModal,
        harga: productPrice,
        stok: productStock // Simpan nilai stok yang diambil dari input
    };

    if (productId) {
        // Mode Update
        const index = products.findIndex(p => p.id == productId);
        if (index !== -1) {
            products[index] = { 
                id: parseInt(productId), 
                ...newProductData 
            };
        }
    } else {
        // Mode Tambah Baru
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push({
            id: newId,
            ...newProductData
        });
    }

    localStorage.setItem('products', JSON.stringify(products));

    // Reset UI
    cancelProductEdit(); 
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
        
        // START PERBAIKAN: Muat nilai Stok ke input
        $('#product-stock').val(product.stok || 0); 
        // END PERBAIKAN: Muat nilai Stok ke input

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

// --- FUNGSI BARU UNTUK MEMBUAT ID BARU ---
function getNewCustomerId() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    return customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1;
}

// Muat daftar produk ke halaman kasir (MODIFIKASI: Tambah Stok)
function loadProductsForCashier() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const container = $('#product-list-container');
    container.empty();

    if (products.length === 0) {
        container.html('<p class="text-center">Belum ada produk. Silakan tambah di halaman Data Barang/Jasa.</p>');
        return;
    }

    products.forEach(product => {
        // Tampilkan Stok hanya untuk tipe barang
        const stockInfo = product.tipe === 'barang' ? 
            `<p class="card-text text-secondary mb-0">Stok: ${product.stok}</p>` : 
            `<p class="card-text text-secondary mb-0">Jasa</p>`;

        const card = `
            <div class="col-md-4 col-6 mb-3 product-item-card" 
                data-id="${product.id}" 
                data-nama="${product.nama}" 
                data-harga="${product.harga}" 
                data-modal="${product.modal}" 
                data-tipe="${product.tipe}"
                data-stok="${product.stok || 0}"
                data-catatan=""> 
                <div class="card h-100 product-card shadow-sm border-${product.tipe === 'jasa' ? 'info' : 'success'}">
                    <div class="card-body text-center d-flex flex-column justify-content-center p-2">
                        <h5 class="card-title fs-6 mb-1">${product.nama}</h5>
                        <p class="card-text fw-bold text-primary mb-0">${formatRupiah(product.harga)}</p>
                        ${stockInfo}
                    </div>
                </div>
            </div>
        `;
        container.append(card);
    });
}

// Muat daftar pelanggan ke select Piutang di Modal Kasir
function loadCustomersForPiutang() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const select = $('#piutang-customer-id');
    select.find('option:not(:first)').remove();

    if (customers.length === 0) {
        select.append(`<option value="" disabled>Tidak ada pelanggan Piutang</option>`);
    } else {
        customers.forEach(cust => {
            select.append(`<option value="${cust.id}">${cust.nama} ${cust.saldoPiutang > 0 ? `(Hutang: ${formatRupiah(cust.saldoPiutang)})` : ''}</option>`);
        });
    }
}

// Fungsi filter produk di halaman kasir (Sama)
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

// Fungsi untuk merender (menampilkan) isi keranjang (MODIFIKASI: Tambah Simpan Cart ke LS)
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
            
            // Tampilkan catatan jika ada
            const noteDisplay = item.catatan ? `<small class="text-warning d-block">Catatan: ${item.catatan}</small>` : '';

            const itemElement = `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="my-0">${item.nama}</h6>
                        <small class="text-muted">${formatRupiah(item.harga)} x ${item.qty}</small>
                        ${noteDisplay} </div>
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

    // Simpan Keranjang Sementara ke Local Storage
    localStorage.setItem('tempCart', JSON.stringify(cart));
}

// Fungsi saat produk di-klik (HANYA MENGISI MODAL QTY) (MODIFIKASI: Tambah Stok Info)
function handleAddToCart(event) {
    const card = $(event.currentTarget);
    const productId = card.data('id');
    const productName = card.data('nama');
    const productStock = card.data('stok'); // Ambil Stok
    const productType = card.data('tipe');
    
    // Cari apakah item sudah ada di keranjang
    const existingItem = cart.find(item => item.id == productId);

    $('#selectedProductId').val(productId);
    $('#modal-product-name').text(productName);
    
    // Tampilkan informasi stok di dalam modal QTY
    const stockMsg = productType === 'barang' ? `(Stok Tersedia: ${productStock})` : '(Jasa)';
    $('#qtyModalLabel').html(`<i class="bi bi-input-cursor me-2"></i> Tentukan Jumlah Beli <small class="text-warning">${stockMsg}</small>`);

    // Isi Qty dengan nilai 1 jika belum ada, atau Qty saat ini jika sudah ada
    $('#inputQty').val(existingItem ? existingItem.qty : 1).data('max-qty', productStock); 
    
    // Isi Catatan
    $('#inputNote').val(existingItem && existingItem.catatan ? existingItem.catatan : '');
    
    // Batasi input qty jika tipe barang
    $('#inputQty').attr('max', productType === 'barang' ? productStock : '');
    
    $('#qtyModal').modal('show');
}

// Fungsi untuk menghapus item dari keranjang (Sama)
function handleRemoveFromCart(event) {
    const id = $(event.currentTarget).data('id');
    const itemIndex = cart.findIndex(item => item.id == id);

    if (itemIndex > -1) {
        // Hapus langsung semua item, tidak perlu dikurangi 1
        cart.splice(itemIndex, 1);
    }
    renderCart();
}

// Fungsi untuk memproses Qty dan Catatan dari modal ke keranjang (MODIFIKASI: Validasi Stok)
function confirmAddToCart() {
    const productId = parseInt($('#selectedProductId').val());
    const qty = parseInt($('#inputQty').val());
    const note = $('#inputNote').val().trim();
    
    const allProducts = JSON.parse(localStorage.getItem('products')) || [];
    const product = allProducts.find(p => p.id === productId);

    if (isNaN(qty) || qty < 1) {
        alert("Jumlah harus minimal 1.");
        return;
    }

    if (!product) {
        alert("Produk tidak ditemukan.");
        $('#qtyModal').modal('hide');
        return;
    }

    // VALIDASI STOK BARU
    if (product.tipe === 'barang' && qty > product.stok) {
        alert(`Stok ${product.nama} tidak cukup! Stok tersedia: ${product.stok}, Diminta: ${qty}`);
        return; // Batalkan penambahan ke keranjang
    }

    const itemIndex = cart.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
        cart[itemIndex].qty = qty;
        cart[itemIndex].catatan = note;
    } else {
        cart.push({
            id: product.id,
            nama: product.nama,
            harga: product.harga,
            modal: product.modal,
            tipe: product.tipe,
            qty: qty,
            catatan: note
        });
    }

    if (qty === 0) {
        cart = cart.filter(item => item.id !== productId);
    }

    renderCart();
    $('#qtyModal').modal('hide');
}

// Fungsi untuk mengosongkan keranjang (Sama)
function clearCart() {
    if (confirm('Anda yakin ingin mengosongkan keranjang?')) {
        cart = [];
        renderCart();
        localStorage.removeItem('tempCart');
    }
}

// ===================================
// FUNGSI UNTUK MENCETAK STRUK
// ===================================
function printReceiptHTML(transaction) {
    let customerInfo = '';
    
    // Informasi Pelanggan untuk Piutang
    if (transaction.metode === 'Piutang') {
        const customers = JSON.parse(localStorage.getItem('customers')) || [];
        const customer = customers.find(c => c.id === transaction.customerId);
        
        customerInfo = `
            <div class="info-row">
                <span class="label">Pelanggan:</span>
                <span class="value">${customer ? customer.nama : 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="label">Jatuh Tempo:</span>
                <span class="value">${transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString('id-ID') : 'N/A'}</span>
            </div>
        `;
    }

    // Bangun konten HTML Struk
    let itemsHTML = transaction.items.map(item => {
        const itemTotal = item.harga * item.qty;
        const noteDisplay = item.catatan ? `<div class="note-display">Catatan: ${item.catatan}</div>` : '';
        return `
            <div class="item-line">
                <div class="item-name">${item.nama}</div>
                <div class="item-details">
                    <span class="qty">${item.qty}x</span>
                    <span class="price">${formatRupiah(item.harga)}</span>
                    <span class="total-price">${formatRupiah(itemTotal)}</span>
                </div>
                ${noteDisplay}
            </div>
        `;
    }).join('');

    let paymentDetailsHTML = '';
    if (transaction.metode === 'Cash') {
        paymentDetailsHTML = `
            <div class="separator-dashed"></div>
            <div class="total-row">
                <span class="label">BAYAR:</span>
                <span class="value paid">${formatRupiah(transaction.paid)}</span>
            </div>
            <div class="total-row change">
                <span class="label">KEMBALIAN:</span>
                <span class="value change-value">${formatRupiah(transaction.change)}</span>
            </div>
        `;
    }

    const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Struk Transaksi</title>
            <style>
                body { font-family: 'Consolas', monospace; font-size: 11px; margin: 0; padding: 10px; width: 300px; }
                .receipt { width: 100%; max-width: 300px; margin: 0 auto; }
                .center { text-align: center; }
                .header, .footer { margin-bottom: 10px; }
                .separator { border-top: 1px solid #000; margin: 5px 0; }
                .separator-dashed { border-top: 1px dashed #000; margin: 5px 0; }
                .item-line { display: flex; flex-wrap: wrap; margin-bottom: 3px; }
                .item-name { width: 100%; font-weight: bold; }
                .item-details { width: 100%; display: flex; justify-content: space-between; padding-left: 10px;}
                .qty { width: 15%; }
                .price { width: 45%; text-align: left; }
                .total-price { width: 40%; text-align: right; font-weight: bold; }
                .total-row { display: flex; justify-content: space-between; font-size: 12px; margin-top: 5px; }
                .total-row .label { font-weight: bold; }
                .total-row .value { font-weight: bold; }
                .change .value { color: #d9534f; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                .note-display { font-size: 10px; color: #555; padding-left: 10px; }

                /* Media query untuk cetak */
                @media print {
                    body { font-size: 10px; width: 300px; margin: 0; }
                    .total-row.change .value { color: #000; } /* Hilangkan warna merah saat cetak */
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="center header">
                    <h3 style="margin: 0;">U-CASY</h3>
                    <p style="margin: 0; font-size: 10px;">UPJ Cashier System</p>
                </div>
                <div class="separator"></div>
                
                <div class="info-row">
                    <span class="label">TRX ID:</span>
                    <span class="value">${transaction.id}</span>
                </div>
                <div class="info-row">
                    <span class="label">Waktu:</span>
                    <span class="value">${new Date(transaction.tanggal).toLocaleString('id-ID')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Metode:</span>
                    <span class="value">${transaction.metode}</span>
                </div>
                ${customerInfo}
                
                <div class="separator-dashed"></div>
                ${itemsHTML}
                
                <div class="separator-dashed"></div>
                <div class="total-row" style="font-size: 16px;">
                    <span class="label">GRAND TOTAL:</span>
                    <span class="value total">${formatRupiah(transaction.total)}</span>
                </div>
                
                ${paymentDetailsHTML}
                
                <div class="separator"></div>
                <div class="center footer">
                    <p style="margin: 0;">Terima kasih atas kunjungan Anda!</p>
                </div>
            </div>
        </body>
        </html>
    `;

    // Cara yang lebih reliable untuk memicu cetak: membuka jendela baru
    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    // Jika Anda ingin menutup jendela setelah print:
    // printWindow.onafterprint = function() { printWindow.close(); }; 
}


// Fungsi untuk menyelesaikan transaksi (MODIFIKASI: Implementasi Cash & Piutang)
function handleFinishTransaction() {
    if (cart.length === 0) {
        alert("Keranjang kosong!");
        return;
    }

    const paymentMethod = $('input[name="payment-method"]:checked').val();
    let customerId = null;
    let customerName = 'Umum/Cash';
    let paidAmount = 0;
    let changeAmount = 0;
    let dueDate = null;
    let total = 0;
    let totalProfit = 0;
    let products = JSON.parse(localStorage.getItem('products')) || [];

    // Hitung Total dan Profit (Harus dihitung ulang di sini untuk memastikan)
    let isStockAdequate = true;
    const itemsToUpdate = [];
    cart.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        if (product) {
            total += cartItem.harga * cartItem.qty;
            totalProfit += (cartItem.harga - cartItem.modal) * cartItem.qty;
            
            if (product.tipe === 'barang') {
                if (product.stok < cartItem.qty) {
                    isStockAdequate = false;
                    alert(`Stok ${product.nama} tidak cukup! Stok tersedia: ${product.stok}, Diminta: ${cartItem.qty}`);
                }
                itemsToUpdate.push({ id: product.id, qty: cartItem.qty });
            }
        }
    });

    if (!isStockAdequate) {
        return; // Batalkan transaksi jika stok tidak cukup
    }
    
    // --- LOGIKA PEMBAYARAN TUNAI ---
    if (paymentMethod === 'Cash') {
        paidAmount = parseInt($('#input-cash-paid').val()) || 0;
        changeAmount = paidAmount - total;
        
        if (paidAmount < total) {
            alert(`Jumlah bayar kurang! Total tagihan: ${formatRupiah(total)}. Uang dibayarkan: ${formatRupiah(paidAmount)}.`);
            return;
        }
        
    // --- LOGIKA PIUTANG ---
    } else if (paymentMethod === 'Piutang') {
        customerId = $('#piutang-customer-id').val();
        dueDate = $('#piutang-due-date').val();
        
        if (!customerId || !dueDate) {
            alert('Anda memilih Hutang, mohon pilih Pelanggan dan tentukan Tanggal Jatuh Tempo!');
            return;
        }
        
        customerId = parseInt(customerId);
        const customers = JSON.parse(localStorage.getItem('customers')) || [];
        const selectedCustomer = customers.find(c => c.id === customerId);
        customerName = selectedCustomer ? selectedCustomer.nama : 'Pelanggan Piutang Tidak Ditemukan';
    }

    // 2. Kurangi Stok
    itemsToUpdate.forEach(item => {
        const productIndex = products.findIndex(p => p.id === item.id);
        if (productIndex !== -1) {
             products[productIndex].stok -= item.qty;
        }
    });

    // ===================================
    // ✍️ BUAT TRANSAKSI BARU ✍️
    // ===================================
    
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    
    const newTransaction = {
        id: `TRX-${new Date().getTime()}`,
        tanggal: new Date().toISOString(),
        metode: paymentMethod,
        items: cart.map(item => ({ 
            id: item.id,
            nama: item.nama,
            harga: item.harga,
            modal: item.modal,
            qty: item.qty,
            catatan: item.catatan || '' 
        })),
        total: total,
        totalProfit: totalProfit,
        customerId: customerId || null,
        // Detail Pembayaran Tambahan
        paid: paymentMethod === 'Cash' ? paidAmount : 0,
        change: paymentMethod === 'Cash' ? changeAmount : 0,
        dueDate: paymentMethod === 'Piutang' ? dueDate : null,
        customerName: customerName // Tambahkan nama customer untuk Piutang
    };

    transactions.push(newTransaction);
    
    // Simpan semua data yang berubah
    localStorage.setItem('products', JSON.stringify(products)); // Update Stok Produk
    localStorage.setItem('transactions', JSON.stringify(transactions)); // Simpan Transaksi Baru

    // --- UPDATE SALDO PIUTANG PELANGGAN ---
    if (paymentMethod === 'Piutang' && customerId) {
        let customers = JSON.parse(localStorage.getItem('customers')) || [];
        const customerIndex = customers.findIndex(c => c.id === customerId);

        if (customerIndex !== -1) {
            customers[customerIndex].saldoPiutang = (customers[customerIndex].saldoPiutang || 0) + total;
            localStorage.setItem('customers', JSON.stringify(customers));
        }
    }
    // --- AKHIR UPDATE SALDO PIUTANG ---

    // Cetak Struk (PANGGIL FUNGSI BARU)
    printReceiptHTML(newTransaction);

    // Reset UI dan notifikasi
    cart = [];
    localStorage.removeItem('tempCart');
    $('#payment-modal').modal('hide');
    
    alert(`Transaksi ${newTransaction.id} berhasil disimpan! Halaman akan dimuat ulang untuk me-refresh data dan stok.`);
    
    // ⚡ REFRESH HALAMAN ⚡
    window.location.reload(); 
}

// Fungsi untuk menyimpan pelanggan baru (untuk Piutang) (Sama)
function handleSaveNewCustomer() {
    const name = $('#new-customer-name').val().trim();
    const phone = $('#new-customer-phone').val().trim();

    if (!name || !phone) {
        alert('Nama dan Nomor Telepon pelanggan baru wajib diisi.');
        return;
    }

    let customers = JSON.parse(localStorage.getItem('customers')) || [];
    const newId = getNewCustomerId();

    const newCustomer = {
        id: newId,
        nama: name,
        telp: phone,
        saldoPiutang: 0
    };
    
    customers.push(newCustomer);
    localStorage.setItem('customers', JSON.stringify(customers));
    
    alert(`Pelanggan ${name} berhasil disimpan!`);
    
    // Muat ulang daftar pelanggan dan pilih pelanggan yang baru dibuat
    loadCustomersForPiutang();
    $('#piutang-customer-id').val(newId);
    
    // Reset input
    $('#new-customer-name').val('');
    $('#new-customer-phone').val('');
}

// ===================================
// EVENT LISTENERS TAMBAHAN
// ===================================
$(document).ready(function() {
    // ... Event listeners yang sudah ada ...

    // Tampilkan modal pembayaran (Perbarui modal title dengan total)
    $('#btn-show-payment').on('click', function() {
        const totalValue = parseFloat($('#cart-total').text().replace(/[^0-9,-]+/g, "").replace(',', '.')); // Ambil nilai total numerik
        
        // Atur tampilan Cash Payment Form
        $('#cash-total-display').text($('#cart-total').text());
        $('#input-cash-paid').val(totalValue).attr('min', totalValue); // Set minimal dan default ke total
        $('#cash-change-display').text(formatRupiah(0));
        
        // Pastikan form yang benar ditampilkan default: Cash
        $('#cash-payment-form').show();
        $('#piutang-customer-select').addClass('d-none');
        $('#pay-cash').prop('checked', true); // Pastikan Cash terpilih

        $('#payment-modal').modal('show');
    });

    // Tampilkan/Sembunyikan form pembayaran berdasarkan metode
    $('input[name="payment-method"]').on('change', function() {
        if ($(this).val() === 'Piutang') {
            $('#piutang-customer-select').removeClass('d-none');
            $('#cash-payment-form').hide();
        } else {
            $('#piutang-customer-select').addClass('d-none');
            $('#cash-payment-form').show();
            $('#piutang-customer-id').val('');
        }
    });

    // Hitung Kembalian saat input Jumlah Bayar diubah
    $('#input-cash-paid').on('input', function() {
        const totalRupiah = $('#cart-total').text().replace(/[^0-9,-]+/g, "");
        const total = parseFloat(totalRupiah.replace(',', '.'));
        const paid = parseInt($(this).val()) || 0;
        const change = paid - total;
        
        $('#cash-change-display').text(formatRupiah(change));
        
        // Ubah warna kembalian
        if (change >= 0) {
            $('#cash-change-display').removeClass('text-danger').addClass('text-success');
        } else {
            $('#cash-change-display').removeClass('text-success').addClass('text-danger');
        }
    });
    
    // ... Event listeners lainnya ...

    // Event listener untuk membatasi input QTY berdasarkan stok
    $('#inputQty').on('input', function() {
        const qty = parseInt($(this).val());
        const maxQty = parseInt($(this).data('max-qty'));
        const productId = parseInt($('#selectedProductId').val());
        const product = JSON.parse(localStorage.getItem('products')).find(p => p.id === productId);

        if (product && product.tipe === 'barang') {
            if (qty > maxQty) {
                $(this).val(maxQty);
                alert(`Jumlah maksimal pembelian adalah stok yang tersedia (${maxQty})!`);
            }
        }
    });

    // Event listener untuk tombol Plus dan Minus di modal QTY (MODIFIKASI: Validasi Stok)
    $('#btn-plus-qty').on('click', function() {
        const qtyInput = $('#inputQty');
        const currentQty = parseInt(qtyInput.val());
        const maxQty = parseInt(qtyInput.data('max-qty'));
        
        const productId = parseInt($('#selectedProductId').val());
        const product = JSON.parse(localStorage.getItem('products')).find(p => p.id === productId);

        if (product && product.tipe === 'barang') {
             if (currentQty < maxQty) {
                qtyInput.val(currentQty + 1);
            } else {
                 alert(`Stok sudah maksimal (${maxQty})!`);
            }
        } else {
            qtyInput.val(currentQty + 1);
        }
    });
    // ... event listener $('#btn-minus-qty') sama seperti sebelumnya ...
});

// ===================================
// FUNGSI UNTUK HALAMAN LAPORAN (laporan.html)
// ===================================

function loadReportData() {
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    // Muat semua laporan
    loadTransactionTableReport(transactions);
    loadDailyProfitChart(transactions);
    loadBestProjectChart(transactions);
}

// Fungsi untuk memuat data ke tabel transaksi di halaman laporan
function loadTransactionTableReport(allTransactions) {
    const tableBody = $('#transaction-table-body');
    tableBody.empty();

    // 1. Ambil Nilai Filter
    const startDateFilter = $('#filter-start-date').val();
    const endDateFilter = $('#filter-end-date').val();
    const metodeFilter = $('#filter-metode').val();
    const statusBayarFilter = $('#filter-status-bayar').val();
    
    // 2. Filter Data
    let filteredTransactions = allTransactions
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
        .filter(trx => {
            const trxDate = trx.tanggal.split('T')[0];
            // Cek status lunas dari properti isPaidOff
            const trxStatus = trx.metode === 'Piutang' ? (trx.isPaidOff ? 'Lunas' : 'Belum Lunas') : 'Lunas';
            
            // Filter Tanggal
            if (startDateFilter && trxDate < startDateFilter) return false;
            if (endDateFilter && trxDate > endDateFilter) return false;

            // Filter Metode Pembayaran
            if (metodeFilter && trx.metode !== metodeFilter) return false;

            // Filter Status Pembayaran
            if (statusBayarFilter) {
                if (statusBayarFilter === 'Lunas' && trxStatus !== 'Lunas') return false;
                if (statusBayarFilter === 'Belum Lunas' && trxStatus !== 'Belum Lunas') return false;
            }
            return true;
        });

    filteredTransactionsGlobal = filteredTransactions; 

    if (filteredTransactions.length === 0) {
        tableBody.append('<tr><td colspan="7" class="text-center">Tidak ada transaksi yang cocok dengan kriteria filter.</td></tr>');
        return;
    }

    // 3. Render Tabel
    filteredTransactions.forEach((trx, index) => {
        const itemsSummary = trx.items.map(item => {
            const note = item.catatan ? ` (${item.catatan})` : '';
            return `${item.nama} (x${item.qty})${note}`;
        }).join(', ');
        
        let totalDisplay;
        let customerInfo = '';
        
        if (trx.metode === 'Piutang') {
            customerInfo = `<br><span class="text-danger small">Piutang Pelanggan ID ${trx.customerId}</span>`;
            
            if (trx.isPaidOff) {
                // Status LUNAS (Hanya Tampilan, tidak bisa diklik)
                totalDisplay = `<span style="text-decoration: line-through;" class="text-muted">${formatRupiah(trx.total)}</span> <span class="badge bg-success ms-2">LUNAS</span>`;
            } else {
                // Status BELUM LUNAS (Hanya Tampilan, tidak ada tombol)
                totalDisplay = `${formatRupiah(trx.total)} <span class="badge bg-danger ms-2">BELUM LUNAS</span>`;
            }
        } else {
            // Cash/Transfer (Otomatis Lunas)
            totalDisplay = formatRupiah(trx.total);
        }
        
        const row = `
            <tr>
                <td>${index + 1}.</td>
                <td>${trx.id}</td>
                <td>${new Date(trx.tanggal).toLocaleString('id-ID')}</td>
                <td>${trx.metode}${customerInfo}</td>
                <td>${totalDisplay}</td> 
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

// Fungsi untuk chart Semua Produk Paling Menguntungkan (Donut Chart)
function loadBestProjectChart(transactions) {
    let productProfits = {};

    transactions.forEach(trx => {
        trx.items.forEach(item => {
            // Hitung profit untuk semua tipe (barang dan jasa)
            const profit = (item.harga - item.modal) * item.qty;
            
            if (productProfits[item.nama]) {
                productProfits[item.nama].profit += profit;
                productProfits[item.nama].tipe = item.tipe;
            } else {
                productProfits[item.nama] = { profit: profit, tipe: item.tipe };
            }
        });
    });

    // Konversi ke array, sort, dan ambil 10 produk teratas (agar chart tidak terlalu ramai)
    let sortedProducts = Object.keys(productProfits).map(key => ({
        name: key,
        profit: productProfits[key].profit,
        tipe: productProfits[key].tipe
    })).sort((a, b) => b.profit - a.profit);
    
    // Batasi hingga 10 item teratas
    const topProducts = sortedProducts.slice(0, 10);
    
    // Gabungkan sisanya menjadi "Lain-lain"
    const remainingProfit = sortedProducts.slice(10).reduce((sum, p) => sum + p.profit, 0);

    let labels = topProducts.map(p => `${p.name} (${p.tipe === 'jasa' ? 'Jasa' : 'Barang'})`);
    let values = topProducts.map(p => p.profit);
    
    if (remainingProfit > 0) {
        labels.push('Lain-lain');
        values.push(remainingProfit);
    }
    
    // Skema warna (dapat disesuaikan)
    const backgroundColors = [
        'rgba(28, 200, 138, 0.9)', // Hijau (Jasa/Profit Tinggi)
        'rgba(78, 115, 223, 0.9)', // Biru
        'rgba(54, 185, 204, 0.9)', // Cyan
        'rgba(246, 194, 62, 0.9)', // Kuning
        'rgba(231, 74, 59, 0.9)',  // Merah
        'rgba(141, 145, 156, 0.9)',// Abu-abu
        'rgba(102, 126, 234, 0.9)', 
        'rgba(255, 99, 132, 0.9)', 
        'rgba(75, 192, 192, 0.9)',
        'rgba(153, 102, 255, 0.9)',
        'rgba(201, 203, 207, 0.9)', // Untuk Lain-lain
    ];

    const ctx = document.getElementById('bestProjectChart');
    if (ctx) {
        if (bestProjectChartInstance) bestProjectChartInstance.destroy();
        
        bestProjectChartInstance = new Chart(ctx, {
            type: 'doughnut', // Diubah kembali ke Donut
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Profit',
                    data: values,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom', // Pindahkan legend ke kanan
                    },
                    tooltip: { 
                        callbacks: { 
                            label: context => {
                                let total = context.dataset.data.reduce((a, b) => a + b, 0);
                                let currentValue = context.raw;
                                let percentage = Math.round((currentValue / total) * 100);
                                return `${context.label}: ${formatRupiah(currentValue)} (${percentage}%)`;
                            }
                        } 
                    }
                }
            }
        });
    }
}

// Fungsi untuk memformat data ke Excel
function exportToExcel() {
    if (filteredTransactionsGlobal.length === 0) {
        alert("Tidak ada data transaksi untuk diexport.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header CSV
    const header = [
        "No.", "ID Transaksi", "Tanggal", "Metode Bayar", "Status Piutang", 
        "Total Penjualan", "Total Profit", "Detail Item"
    ];
    csvContent += header.join(";") + "\r\n";

    // Data CSV
    filteredTransactionsGlobal.forEach((trx, index) => {
        const itemsSummary = trx.items.map(item => {
            const note = item.catatan ? ` (${item.catatan.replace(/"/g, '""')})` : '';
            return `${item.nama} (x${item.qty})${note}`;
        }).join(' | ');

        const statusPiutang = trx.metode === 'Piutang' ? (trx.isPaidOff ? 'Lunas' : 'Belum Lunas') : 'Lunas';
        
        const row = [
            index + 1,
            trx.id,
            new Date(trx.tanggal).toLocaleString('id-ID'),
            trx.metode,
            statusPiutang,
            trx.total, // Angka tanpa format Rupiah
            trx.totalProfit, // Angka tanpa format Rupiah
            `"${itemsSummary.replace(/"/g, '""')}"` // Bungkus detail item dengan quotes
        ];
        csvContent += row.join(";") + "\r\n";
    });

    // Membuat link download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Transaksi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
}


// ===================================
// FUNGSI UNTUK HALAMAN PELANGGAN (pelanggan.html)
// ===================================

function loadCustomerData() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    // 1. Ambil data transaksi untuk mencari jatuh tempo
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    
    const tableBody = $('#customer-table-body');
    const selectPelanggan = $('#pay-customer-id');
    
    tableBody.empty();
    selectPelanggan.find('option:not(:first)').remove();

    if (customers.length === 0) {
        // PERHATIKAN: colspan diubah menjadi 5 karena ada kolom baru
        tableBody.append('<tr><td colspan="5" class="text-center">Belum ada data pelanggan internal.</td></tr>');
        return;
    }

    customers.forEach(cust => {
        // ========================================================
        // 2. LOGIKA MENCARI TANGGAL JATUH TEMPO TERAKHIR
        // ========================================================
        let lastDueDate = 'N/A';
        let isOverdue = false;
        
        // Filter transaksi Piutang yang terkait dengan pelanggan ini DAN belum lunas
        const customerDebts = transactions.filter(trx => 
            trx.customerId == cust.id && 
            trx.metode === 'Piutang' && 
            !trx.isPaidOff
        );
        
        // Cari transaksi piutang TERBARU (berdasarkan tanggal transaksi, agar yang diutang terakhir muncul)
        if (customerDebts.length > 0) {
            customerDebts.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)); // Urutkan terbaru ke terlama
            const latestDebtTrx = customerDebts[0];
            
            if (latestDebtTrx.dueDate) {
                const dueDate = new Date(latestDebtTrx.dueDate);
                lastDueDate = dueDate.toLocaleDateString('id-ID');

                // Cek apakah sudah jatuh tempo
                const today = new Date();
                // Set waktu menjadi 00:00:00 untuk perbandingan tanggal yang akurat
                today.setHours(0, 0, 0, 0); 
                dueDate.setHours(0, 0, 0, 0); 
                
                if (dueDate < today) {
                    isOverdue = true;
                }
            }
        }
        
        // Tentukan kelas CSS untuk jatuh tempo
        const dueDateClass = isOverdue && cust.saldoPiutang > 0 ? 'text-danger fw-bold' : 'text-secondary';
        const dueDateDisplay = `<td class="${dueDateClass}">${lastDueDate}</td>`;
        // ========================================================

        // Tambahkan ke tabel
        const row = `
            <tr>
                <td>${cust.nama}</td>
                <td>${cust.kontak}</td>
                <td class="fw-bold text-${cust.saldoPiutang > 0 ? 'danger' : 'success'}">${formatRupiah(cust.saldoPiutang)}</td>
                ${dueDateDisplay} <td>
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
        saldoPiutang: 0
    });

    localStorage.setItem('customers', JSON.stringify(customers));
    $('#customer-form')[0].reset();
    alert('Pelanggan berhasil ditambahkan!');
    loadCustomerData();
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
    // 🔥 MEMANGGIL DATA TRANSAKSI, BUKAN KERANJANG
    let transactions = JSON.parse(localStorage.getItem('transactions')) || []; 
    
    const customerIndex = customers.findIndex(c => c.id == customerId);

    if (customerIndex !== -1) {
        const currentDebt = customers[customerIndex].saldoPiutang;

        if (paymentAmount > currentDebt) {
            alert(`Pembayaran melebihi saldo piutang saat ini (${formatRupiah(currentDebt)}). Masukkan jumlah yang benar.`);
            return;
        }

        customers[customerIndex].saldoPiutang -= paymentAmount;
        const remainingDebt = customers[customerIndex].saldoPiutang;
        
        // Simpan data pelanggan yang sudah diperbarui
        localStorage.setItem('customers', JSON.stringify(customers));

        // ===========================================
        // 🔥 LOGIKA PERBAIKAN UTAMA: TANDAI TRANSAKSI SEBAGAI LUNAS
        // ===========================================
        if (remainingDebt <= 0) { // Gunakan <= 0 untuk jaga-jaga jika ada pembulatan kecil
            
            // Tandai SEMUA transaksi Piutang yang terkait dengan pelanggan ini dan BELUM LUNAS
            transactions.forEach(trx => {
                if (trx.customerId == customerId && trx.metode === 'Piutang' && !trx.isPaidOff) {
                    trx.isPaidOff = true; 
                }
            });
            
            // Simpan data transaksi yang sudah ditandai
            localStorage.setItem('transactions', JSON.stringify(transactions)); 
        }
        // ===========================================
        
        alert(`Pembayaran ${formatRupiah(paymentAmount)} berhasil dicatat. Sisa utang: ${formatRupiah(remainingDebt)}`);
        
        $('#payment-amount').val('');
        loadCustomerData();

        // Reset dropdown & info utang
        $('#pay-customer-id').val('');
        updateDebtInfo();
        
        // 🔥 Penting: Agar laporan Dashboard/Laporan ikut ter-update
        if (typeof loadReportData === 'function') {
             loadReportData(); 
        }
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
        // Halaman Dashboard
        loadDashboardData();
    } 
    else if (currentPage === 'barang.html') {
        // Halaman CRUD Barang
        loadProductTable();
        $('#product-form').on('submit', handleProductFormSubmit);
        $('#cancel-edit-button').on('click', cancelProductEdit);
        $('#product-table-body').on('click', '.btn-edit', handleEditProduct);
        $('#product-table-body').on('click', '.btn-delete', handleDeleteProduct);
    } 
    else if (currentPage === 'kasir.html') {
        // Halaman Kasir
        loadProductsForCashier();
        loadCustomersForPiutang(); // Muat data pelanggan untuk opsi Piutang
        renderCart(); 

        $('#search-product').on('keyup', filterProducts);
        $('#product-list-container').on('click', '.product-item-card', handleAddToCart);
        $('#cart-items-list').on('click', '.btn-remove-cart-item', handleRemoveFromCart);
        $('#btn-clear-cart').on('click', clearCart);
        
        $('#btn-show-payment').on('click', function() {
            $('#payment-modal').modal('show');
        });
        
        $('#btn-finish-transaction').on('click', handleFinishTransaction);
        
        // Logika tampilan form Piutang saat metode pembayaran dipilih
        $('input[name="payment-method"]').on('change', function() {
            if ($(this).val() === 'Piutang') {
                $('#piutang-customer-select').removeClass('d-none');
            } else {
                $('#piutang-customer-select').addClass('d-none');
                $('#piutang-customer-id').val('');
            }
        });
    }
    else if (currentPage === 'laporan.html') {
        // Halaman Laporan
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