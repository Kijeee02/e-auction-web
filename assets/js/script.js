const API_BASE_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", function () {
    const itemsContainer = document.getElementById("barang-lelang-container");

    // Fungsi untuk memuat data (simulasi dengan setTimeout)
    function loadData() {
        showLoading(); // Tampilkan loading indicator

        // Simulasi pemuatan data (misalnya dari server)
        setTimeout(() => {
            // Contoh data barang
            const items = [
                { id: 1, name: "Barang 1", description: "Deskripsi Barang 1" },
                { id: 2, name: "Barang 2", description: "Deskripsi Barang 2" },
                { id: 3, name: "Barang 3", description: "Deskripsi Barang 3" },
            ];

            // Tampilkan data di kontainer
            itemsContainer.innerHTML = "";
            items.forEach((item) => {
                const itemElement = document.createElement("div");
                itemElement.className = "p-4 bg-white rounded-lg shadow";
                itemElement.innerHTML = `
                    <h2 class="text-lg font-bold">${item.name}</h2>
                    <p class="text-sm text-gray-600">${item.description}</p>
                `;
                itemsContainer.appendChild(itemElement);
            });

            hideLoading(); // Sembunyikan loading indicator
        }, 2000); // Simulasi waktu pemuatan 2 detik
    }

    // Panggil fungsi loadData saat halaman dimuat
    loadData();
});

document.addEventListener("DOMContentLoaded", function() {
    // DOM Elements
    const container = document.getElementById("barang-lelang-container");
    const categoryButtons = document.querySelectorAll('.category-btn');
    const searchBar = document.getElementById("search-bar");
    const scrollLeftBtn = document.getElementById('scrollLeft');
    const scrollRightBtn = document.getElementById('scrollRight');
    const categoryContainer = document.getElementById('categoryContainer');

    // State variables
    let allItems = [];
    let activeCategory = "";
    let searchQuery = "";
    let countdownIntervals = new Map();
    let bidIntervals = new Map();

// Category Icon
const categoryIcons = {
    'rumah': '<i class="ph ph-house-line text-gray-700 text-3xl mb-2"></i>',
    'motor': '<i class="ph ph-motorcycle text-gray-700 text-3xl mb-2"></i>',
    'mobil': '<i class="ph ph-car-profile text-gray-700 text-3xl mb-2"></i>',
    'elektronik': '<i class="bi bi-tv text-gray-700 text-3xl mb-2"></i>',
    'tanah': '<i class="bi bi-map text-gray-700 text-3xl mb-2"></i>',
    'ruko': '<i class="bi bi-shop text-gray-700 text-3xl mb-2"></i>',
    'hotel': '<i class="ph ph-building text-gray-700 text-3xl mb-2"></i>',
    'appartement': '<i class="ph ph-building-apartment text-gray-700 text-3xl mb-2"></i>'
};
    // Utility function to format currency
    function formatRupiah(angka) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(angka);
    }

    // Main function to fetch and display items
    async function fetchAndDisplayItems(kategori = "", searchQuery = "") {
        try {
            const response = await fetch(`${API_BASE_URL}/barang-lelang`);
            if (!response.ok) throw new Error('Network response was not ok');

            allItems = await response.json();
            filterAndDisplayItems(kategori, searchQuery);
        } catch (error) {
            console.error('Error fetching data:', error);
            showError('Gagal memuat data. Silakan coba lagi nanti.');
        }
    }

    // Filter and display items based on category and search query
    function filterAndDisplayItems(kategori = "", searchQuery = "") {
        activeCategory = kategori;

        let filteredData = allItems;

        if (activeCategory) {
            filteredData = filteredData.filter(item =>
                item.kategori.toLowerCase() === activeCategory.toLowerCase()
            );
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredData = filteredData.filter(item =>
                item.nama.toLowerCase().includes(query)
            );
        }

        displayItems(filteredData);
    }

    // Display items in the container
    async function displayItems(items) {
        // Clear previous intervals
        clearAllIntervals();

        // Clear container
        container.innerHTML = '';

        if (items.length === 0) {
            showNoItemsMessage();
            return;
        }

        // Create and append cards
        const cardPromises = items.map(async item => {
        const card = await createCardElement(item);
        container.appendChild(card);
        setupCardInteractions(card, item);
    });

    await Promise.all(cardPromises);

    }

// Tambahkan fungsi untuk memeriksa status bidding
async function checkBiddingStatus(itemId) {
    try {
        const response = await fetch(`http://localhost:3000/api/penawaran/${itemId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        return data.penawaran_terakhir > 0; // Return true jika ada penawaran
    } catch (error) {
        console.error('Error checking bidding status:', error);
        return false;
    }
}

    // Create card element

async function createCardElement(item) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col h-full';
    card.dataset.id = item.id;

    // Handle image path
     const imagePath = item.gambar.startsWith('/') ? 
        `http://localhost:3000${item.gambar}` : 
        `http://localhost:3000/${item.gambar}`;

    // Check if image exists
  try {
        // Verify image exists
        await fetch(imagePath);
    } catch (error) {
        console.error(`Failed to load image for ${item.nama}:`, error);
        // Use default image if the image fails to load
        imagePath = 'http://localhost:3000/assets/images/default.jpeg';
    }
    // Sanitize description
    const shortDescription = item.deskripsi.length > 100 ?
        `${item.deskripsi.substring(0, 100)}...` :
        item.deskripsi;

    // Dapatkan icon berdasarkan kategori
    const categoryLower = item.kategori.toLowerCase();
    const categoryIcon = categoryIcons[categoryLower] || categoryIcons['lainnya'];
   
    // Cek status lelang
    const waktuAkhir = new Date(item.waktu_akhir);
    const now = new Date();
    const isAuctionEnded = waktuAkhir - now <= 0;
    const hasBidding = await checkBiddingStatus(item.id);

    card.innerHTML = `
        <div class="relative">
            <img src="${imagePath}" 
                 alt="${item.nama}" 
                 class="w-full h-64 object-cover" 
                 loading="lazy"
                 onerror="this.src='http://localhost:3000/assets/images/default.jpeg'">
            <!-- Live Badge di kanan atas (hanya muncul jika ada bidding) -->
            ${hasBidding && !isAuctionEnded ? `
            <span class="live-badge hidden absolute top-2 right-2 bg-red-500 text-white font-bold text-xs px-2 py-1 rounded-full">
                LIVE
            </span>
            ` : ''}
             <!-- Open Bidding Badge di kanan bawah -->
            ${!isAuctionEnded ? `
                <span class="absolute bottom-2 right-2 bg-green-500 text-white font-bold text-xs px-2 py-1 rounded">
                    Open Bidding
                </span>
            ` : ''}
        </div>
        </div>
    
        <div class="p-4 flex flex-col flex-grow">
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center">
                    <span class="text-xl mr-2">${categoryIcon}</span>
                    <h3 class="text-lg font-semibold text-gray-800 line-clamp-2">${escapeHTML(item.nama)}</h3>
                </div>
            </div>
            
            <div class="mb-3">
                <p class="text-sm text-gray-600 mb-1">Harga Dasar Lelang:</p>
                <p class="text-lg font-bold text-blue-600">${formatRupiah(item.harga_awal)}</p>
            </div>
            
            <div class="mb-3">
                <p class="text-sm text-gray-600 mb-1">Penawaran Terakhir: </p>
                <p class="text-lg font-bold text-green-600 penawaran-terakhir" data-id="${item.id}">Mengambil data...</p>
            </div>
            
            <div class="mb-4">
                <p class="text-sm text-gray-600 mb-1">Sisa Waktu:</p>
                <p class="text-sm font-medium text-gray-800 sisa-waktu" data-waktu-akhir="${item.waktu_akhir}">Menghitung...</p>
            </div>
            
            <p class="text-gray-500 text-sm mb-4 flex-grow line-clamp-3">${escapeHTML(shortDescription)}</p>
            
            <div class="mt-auto">
                <a href="detail.html?id=${item.id}" class="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-300">
                    Lihat Detail
                </a>
            </div>
        </div>
    `;

    return card;
}


    // Set up countdown and bid updates for a card
    function setupCardInteractions(card, item) {
        const countdownElement = card.querySelector('.sisa-waktu');
        const bidElement = card.querySelector('.penawaran-terakhir');

        // Initialize countdown
        updateSisaWaktu(countdownElement);
        const countdownInterval = setInterval(() => updateSisaWaktu(countdownElement), 1000);
        countdownIntervals.set(item.id, countdownInterval);

        // Initialize bid updates
        updatePenawaranTerakhir(bidElement);
        const bidInterval = setInterval(() => updatePenawaranTerakhir(bidElement), 30000);
        bidIntervals.set(item.id, bidInterval);
    }

    // Update countdown timer
    function updateSisaWaktu(element) {
        if (!element) return;

        const waktuAkhir = new Date(element.dataset.waktuAkhir);
        const now = new Date();
        const selisih = waktuAkhir - now;
        const card = element.closest('.bg-white');
        const liveBadge = card ?.querySelector('.live-badge');

        if (selisih <= 0) {
            element.textContent = "Lelang berakhir";
            element.classList.add('text-red-600', 'font-semibold');
            element.classList.remove('text-gray-800'); 
            if (liveBadge) liveBadge.classList.add('hidden');
            return;
        }

        const days = Math.floor(selisih / (1000 * 60 * 60 * 24));
        const hours = Math.floor((selisih % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((selisih % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((selisih % (1000 * 60)) / 1000);

        element.textContent = `${days} Hari ${hours} Jam ${minutes} Menit ${seconds} Detik`;
        if (liveBadge) liveBadge.classList.remove('hidden');
    }

    // Update latest bid
    async function updatePenawaranTerakhir(element) {
        if (!element) return;

        const itemId = element.dataset.id;

        try {
            const response = await fetch(`http://localhost:3000/api/penawaran/${itemId}`);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            element.textContent = ` ${formatRupiah(data.penawaran_terakhir)}`;
        } catch (error) {
            console.error('Error fetching penawaran terakhir:', error);
            element.textContent = 'Penawaran Terakhir: Tidak tersedia';
        }
    }

    // Helper functions
    function showNoItemsMessage() {
        container.innerHTML = '<p class="text-center text-gray-500">Tidak ada barang untuk kategori ini.</p>';
    }

    function showError(message) {
        container.innerHTML = `<p class="text-center text-red-500">${message}</p>`;
    }

    function clearAllIntervals() {
        countdownIntervals.forEach(interval => clearInterval(interval));
        bidIntervals.forEach(interval => clearInterval(interval));
        countdownIntervals.clear();
        bidIntervals.clear();
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag]));
    }

    function showLoading() {
        const loadingIndicator = document.getElementById("loadingIndicator");
        if (loadingIndicator) {
            loadingIndicator.classList.add("active");
        }
    }

    function hideLoading() {
        const loadingIndicator = document.getElementById("loadingIndicator");
        if (loadingIndicator) {
            loadingIndicator.classList.remove("active");
        }
    }

    // Event listeners
    searchBar.addEventListener('input', debounce(function() {
        searchQuery = this.value.trim();
        filterAndDisplayItems(activeCategory, searchQuery);
    }, 300));

    categoryButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const category = e.currentTarget.getAttribute('data-category');
            filterAndDisplayItems(category, searchQuery);
        });
    });

    scrollLeftBtn ?.addEventListener('click', () => {
        categoryContainer.scrollBy({ left: -200, behavior: 'smooth' });
    });

    scrollRightBtn ?.addEventListener('click', () => {
        categoryContainer.scrollBy({ left: 200, behavior: 'smooth' });
    });

    // Debounce function for search
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this,
                args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Initial load
    fetchAndDisplayItems();
});

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            if (!email.includes("@")) {
                e.preventDefault();
                alert("Email tidak valid!");
            }

            if (password.length < 6) {
                e.preventDefault();
                alert("Password harus memiliki minimal 6 karakter!");
            }
        });
    }
});

async function fetchData() {
    showLoading();
    try {
        const response = await fetch("../api/mock-data.json");
        const data = await response.json();
        console.log(data); // Tampilkan data di console
        displayItems(data); // Tampilkan data di halaman
    } catch (error) {
        console.error("Gagal memuat data:", error);
    } finally {
        hideLoading();
    }
}

function displayItems(items) {
    const container = document.getElementById("barang-lelang-container");
    container.innerHTML = ""; // Kosongkan kontainer

    items.forEach((item) => {
        const itemElement = document.createElement("div");
        itemElement.className = "p-4 bg-white rounded-lg shadow";
        itemElement.innerHTML = `
            <h2 class="text-lg font-bold">${item.name}</h2>
            <p class="text-sm text-gray-600">${item.description}</p>
            <p class="text-sm text-gray-800 font-bold">Rp ${item.price}</p>
        `;
        container.appendChild(itemElement);
    });
}

document.addEventListener("DOMContentLoaded", fetchData);

document.getElementById("search-bar").addEventListener("input", function (e) {
    const query = e.target.value.toLowerCase();
    fetchData().then((items) => {
        const filteredItems = items.filter((item) =>
            item.name.toLowerCase().includes(query)
        );
        displayItems(filteredItems);
    });
});