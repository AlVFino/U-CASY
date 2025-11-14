// assets/js/app.js
// Logika Inti Aplikasi: CRUD Produk, Manajemen Kasir, Laporan, dan Piutang.

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

// FIX BUG 4: Fungsi untuk inisialisasi data (Kosongkan data dummy)
function initializeDataStorage() {
    // 1. Data Produk
    if (!localStorage.getItem('products')) {
        localStorage.setItem('products', JSON.stringify([]));
    }

    // 2. Data Transaksi
    if (!localStorage.getItem('transactions')) {
        localStorage.setItem('transactions', JSON.stringify([]));
    }

    // 3. Data Pelanggan Internal (Piutang)
    if (!localStorage.getItem('customers')) {
        localStorage.setItem('customers', JSON.stringify([]));
    }
}

// ===================================
// FUNGSI UNTUK HALAMAN DASHBOARD (index.html)
// ===================================
let weeklySalesChartInstance;

function loadDashboardData() {
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    
    // Default value jika data kosong
    if (transactions.length === 0) {
        $('#total-penjualan').text(formatRupiah(0));
        $('#total-profit').text(formatRupiah(0));
        $('#total-transaksi').text(0);
        // Hancurkan chart jika ada, agar tidak menampilkan data kosong
        const ctx = document.getElementById('weeklySalesChart');
        if (ctx && weeklySalesChartInstance) weeklySalesChartInstance.destroy();
        return;
    }

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

// FIX BUG 1: Form submit logic (ensure clean saving/updating)
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
        // Mode Tambah Baru (ID generation is robust)
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
    loadProductTable(); // Muat ulang tabel
}

// ... (handleEditProduct, cancelProductEdit, handleDeleteProduct - no change)


// ===================================
// FUNGSI UNTUK HALAMAN KASIR (kasir.html)
// ===================================

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

// Muat daftar pelanggan ke select Piutang di Modal Kasir
function loadCustomersForPiutang() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const select = $('#piutang-customer-id');
    select.find('option:not(:first)').remove();

    if (customers.length === 0) {
        select.append(`<option value="" disabled>Tidak ada pelanggan Piutang</option>`);
    } else {
        customers.forEach(cust => {
            select.append(`<option value="${cust.id}">${cust.nama}</option>`);
        });
    }
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
                        <small class="text-muted">${formatRupiah(item.harga)} x 
                            <input type="number" class="form-control form-control-sm d-inline w-auto update-qty" 
                                data-id="${item.id}" value="${item.qty}" min="1">
                        </small>
                    </div>
                    <span class="text-muted">${formatRupiah(itemTotal)}</span>
                    <button class="btn btn-sm btn-outline-danger btn-remove-cart-item" data-id="${item.id}">
                        <i class="bi bi-x-lg"></i>
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

// Fungsi untuk menampilkan Modal Qty (Bug 2 Fix)
function showQtyModal(event) {
    const card = $(event.currentTarget);
    const productId = card.data('id');
    const productName = card.data('nama');
    
    $('#selectedProductId').val(productId);
    $('#modal-product-name').text(productName);
    $('#inputQty').val(1);
    $('#qtyModal').modal('show');
}

// Fungsi untuk konfirmasi penambahan ke keranjang (Bug 2 Fix)
function confirmAddToCart() {
    const productId = parseInt($('#selectedProductId').val());
    const qty = parseInt($('#inputQty').val());

    if (isNaN(qty) || qty < 1) {
        alert('Jumlah harus minimal 1.');
        return;
    }

    const products = JSON.parse(localStorage.getItem('products')) || [];
    const product = products.find(p => p.id === productId);

    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.qty += qty;
    } else {
        cart.push({
            id: productId,
            nama: product.nama,
            harga: product.harga,
            modal: product.modal,
            tipe: product.tipe,
            qty: qty
        });
    }

    $('#qtyModal').modal('hide');
    renderCart();
}

// Fungsi untuk mengupdate kuantitas di keranjang secara langsung (optional, tapi baik)
function handleUpdateQty(event) {
    const id = $(event.currentTarget).data('id');
    const newQty = parseInt($(event.currentTarget).val());

    const item = cart.find(item => item.id == id);
    
    if (item) {
        if (newQty < 1 || isNaN(newQty)) {
            // Jika input kosong atau < 1, hapus
            cart = cart.filter(i => i.id !== id);
        } else {
            item.qty = newQty;
        }
    }
    renderCart();
}


// Fungsi untuk menyelesaikan transaksi (Fix Bug 3)
function handleFinishTransaction() {
    if (cart.length === 0) {
        alert('Keranjang masih kosong!');
        return;
    }

    const paymentMethod = $('input[name="payment-method"]:checked').val();
    let customerId = null;

    // --- LOGIKA PIUTANG ---
    if (paymentMethod === 'Piutang') {
        customerId = $('#piutang-customer-id').val();
        if (!customerId) {
            alert('Anda memilih Piutang, mohon pilih Pelanggan Internal!');
            return;
        }
        customerId = parseInt(customerId);
    }
    // --- AKHIR LOGIKA PIUTANG ---

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
        totalProfit: totalProfit,
        customerId: customerId || null 
    };

    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    transactions.push(newTransaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));

    // --- UPDATE SALDO PIUTANG PELANGGAN ---
    if (paymentMethod === 'Piutang' && customerId) {
        let customers = JSON.parse(localStorage.getItem('customers')) || [];
        const customerIndex = customers.findIndex(c => c.id === customerId);

        if (customerIndex !== -1) {
            customers[customerIndex].saldoPiutang += total;
            localStorage.setItem('customers', JSON.stringify(customers));
        }
    }
    // --- AKHIR UPDATE SALDO PIUTANG ---

    cart = [];
    renderCart();
    $('#payment-modal').modal('hide');
    // Clear method selection
    $('input[name="payment-method"]').prop('checked', false).trigger('change'); 
    alert(`Transaksi ${newTransaction.id} berhasil disimpan!`);
}


// ===================================
// FUNGSI UNTUK HALAMAN PELANGGAN (pelanggan.html)
// ===================================
// ... (loadCustomerData, handleCustomerFormSubmit, handleDebtPayment, updateDebtInfo, handleDeleteCustomer - NO CHANGE)


// ===================================
// EKSEKUSI GLOBAL & PENYIAPAN EVENT
// ===================================

$(document).ready(function() {
    // FIX BUG 4: Inisialisasi data storage
    initializeDataStorage();
    
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
        loadCustomersForPiutang(); // Muat data pelanggan ke modal piutang
        renderCart(); 

        $('#search-product').on('keyup', filterProducts);
        
        // FIX BUG 2: Ganti click untuk add, jadi click untuk show modal qty
        $('#product-list-container').on('click', '.product-item-card', showQtyModal);
        $('#confirm-add-to-cart').on('click', confirmAddToCart);
        
        // Listener untuk update qty dari dalam keranjang
        $('#cart-items-list').on('change', '.update-qty', handleUpdateQty);
        $('#cart-items-list').on('click', '.btn-remove-cart-item', handleRemoveFromCart);
        
        $('#btn-clear-cart').on('click', clearCart);
        
        $('#btn-show-payment').on('click', function() {
            $('#payment-modal').modal('show');
        });
        
        $('#btn-finish-transaction').on('click', handleFinishTransaction);
        
        // FIX BUG 3: Logika tampilan form piutang
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
        // Halaman Pelanggan Internal
        loadCustomerData(); 
        $('#customer-form').on('submit', handleCustomerFormSubmit);
        $('#customer-table-body').on('click', '.btn-delete-cust', handleDeleteCustomer);
        
        // Logika Pelunasan
        $('#pay-customer-id').on('change', updateDebtInfo);
        $('#btn-pay-debt').on('click', handleDebtPayment);
    }
});