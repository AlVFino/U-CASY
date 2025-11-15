// assets/js/auth.js

// == CATATAN UNTUK LOGBOOK AI ==
// File ini mengelola semua logika otentikasi.
// 1. Menggunakan 'localStorage' untuk menyimpan data pengguna (simulasi database).
// 2. Menggunakan 'sessionStorage' untuk menyimpan status login. 'sessionStorage' akan
//    hapus otomatis saat browser ditutup, yang ideal untuk sesi login.
// 3. Melakukan 'checkAuth' di setiap halaman (kecuali login) untuk memproteksi
//    halaman agar tidak bisa diakses sebelum login.

// Fungsi untuk inisialisasi (membuat user dummy jika belum ada)
function initializeAuth() {
    // Cek apakah data 'users' sudah ada di localStorage
    if (!localStorage.getItem('users')) {
        // Jika belum ada, buat satu user dummy
        // PENTING: Di aplikasi nyata, password tidak boleh disimpan sebagai teks biasa.
        // Ini hanya untuk demo lomba client-side.
        let dummyUsers = [
            { username: 'petugas', password: '123' },
            { username: 'admin', password: 'admin' }
        ];
        // Simpan ke localStorage sebagai string JSON
        localStorage.setItem('users', JSON.stringify(dummyUsers));
        console.log('User dummy telah dibuat.');
    }
}

// Fungsi untuk mengecek status login
function checkAuth() {
    // Cek apakah ada data 'loggedInUser' di sessionStorage
    const isLoggedIn = sessionStorage.getItem('loggedInUser');
    
    // Dapatkan path halaman saat ini
    const currentPage = window.location.pathname.split('/').pop();

    if (!isLoggedIn && currentPage !== 'login.html') {
        // Jika user BELUM login DAN tidak sedang di halaman login
        // paksa redirect ke halaman login
        console.log('Akses ditolak. Silakan login.');
        window.location.href = 'login.html';
    } else if (isLoggedIn && currentPage === 'login.html') {
        // Jika user SUDAH login DAN sedang di halaman login
        // lempar ke dashboard
        window.location.href = 'index.html';
    }
}

// Fungsi untuk menangani proses login
function handleLogin(event) {
    // Hentikan aksi default form (reload halaman)
    event.preventDefault(); 
    
    // Ambil nilai dari input form
    const username = $('#username').val();
    const password = $('#password').val();

    // Ambil data users dari localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // Cari user yang cocok
    const foundUser = users.find(user => user.username === username && user.password === password);

    if (foundUser) {
        // Jika user ditemukan
        console.log('Login berhasil:', username);
        // Simpan status login ke sessionStorage
        sessionStorage.setItem('loggedInUser', username);
        // Redirect ke dashboard
        window.location.href = 'index.html';
    } else {
        // Jika user tidak ditemukan
        console.log('Login gagal.');
        // Tampilkan pesan error
        $('#login-alert').removeClass('d-none');
    }
}

// Fungsi untuk logout
function handleLogout() {
    console.log('Logout...');
    // Hapus status login dari sessionStorage
    sessionStorage.removeItem('loggedInUser');
    // Redirect ke halaman login
    window.location.href = 'login.html';
}

// == EKSEKUSI SCRIPT ==

// Panggil fungsi inisialisasi user dummy (hanya dieksekusi sekali saat pertama kali)
initializeAuth();

// Cek status otentikasi di setiap halaman
// Kita perlu tahu di halaman mana kita berada
const currentPage = window.location.pathname.split('/').pop();
if (currentPage !== 'login.html') {
    // Jika bukan halaman login, pasang proteksi
    checkAuth();
    // Tambahkan event listener untuk tombol logout (yang hanya ada di halaman selain login)
    $(document).ready(function() {
        $('#logout-button').on('click', handleLogout);
    });
} else {
    // Jika ini halaman login
    checkAuth(); // Cek jika user sudah login, dia akan diredirect
    // Tambahkan event listener untuk form login
    $(document).ready(function() {
        $('#login-form').on('submit', handleLogin);
    });
}