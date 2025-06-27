// Make these functions global (outside DOMContentLoaded)
let currentSlide = 0;
let images = [];

// Add these functions at global scope (outside DOMContentLoaded)
window.changeSlide = function(direction) {
    currentSlide = (currentSlide + direction + images.length) % images.length;
    updateSlider();
}

window.jumpToSlide = function(index) {
    currentSlide = index;
    updateSlider();
}

window.updateSlider = function() {
    const mainImage = document.querySelector('#main-image img');
    const slideCounter = document.getElementById('slide-counter');
    const thumbnails = document.querySelectorAll('.thumbnail-btn');

    if (mainImage) {
        mainImage.src = getImageUrl(images[currentSlide]);
    }
    
    if (slideCounter) {
        slideCounter.textContent = `${currentSlide + 1}/${images.length}`;
    }

    // Update thumbnail highlighting
    thumbnails.forEach((thumb, index) => {
        if (index === currentSlide) {
            thumb.classList.add('ring-2', 'ring-blue-500');
        } else {
            thumb.classList.remove('ring-2', 'ring-blue-500');
        }
    });
}

window.getImageUrl = function(imagePath) {
    return imagePath.startsWith('/') ? 
        `http://localhost:3000${imagePath}` : 
        `http://localhost:3000/${imagePath}`;
}

document.addEventListener("DOMContentLoaded", function() {
    const itemId = new URLSearchParams(window.location.search).get('id');
    const detailContainer = document.getElementById("detail-container");
    const riwayatContainer = document.getElementById("penawaran-history");
    const bidFormContainer = document.getElementById("bid-form-container");
    const informationUnitContainer = document.getElementById("information-unit-container");
    let initialPrice = 0;
    let currentHighestBid = 0;

    const STORAGE_KEY = {
        FAVORITES: 'lelangBarang_favorites',
        VIEWS: 'lelangBarang_views'
    };

    function formatRupiah(angka) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(angka);
    }
    function formatNumber(number) {
        return new Intl.NumberFormat('id-ID').format(number);
    }

    function unformatNumber(formattedNumber) {
        return parseInt(formattedNumber.replace(/\D/g, ''));
    }
    function calculateMinimumBid(currentPrice) {
        return Math.ceil(currentPrice * 1.02); // Increase by 2%
    }

    function getFavorites() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY.FAVORITES) || '[]');
    }

    function getViews() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY.VIEWS) || '{}');
    }

    function toggleFavorite(itemId) {
        const favorites = getFavorites();
        const index = favorites.indexOf(itemId);
        
        if (index === -1) {
            favorites.push(itemId);
        } else {
            favorites.splice(index, 1);
        }
        
        localStorage.setItem(STORAGE_KEY.FAVORITES, JSON.stringify(favorites));
        updateFavoriteButton();
    }

    function incrementViews(itemId) {
        const views = getViews();
        views[itemId] = (views[itemId] || 0) + 1;
        localStorage.setItem(STORAGE_KEY.VIEWS, JSON.stringify(views));
        updateViewCount();
    }

    function updateFavoriteButton() {
        const favorites = getFavorites();
        const favoriteButton = document.getElementById('favorite-button');
        if (favoriteButton) {
            const isFavorite = favorites.includes(itemId);
            favoriteButton.innerHTML = `
                <i class="fas ${isFavorite ? 'fa-heart text-red-500' : 'fa-heart text-gray-400'}"> </i>
                ${isFavorite ? 'Favorit' : 'Tambah ke Favorit'}
            `;
            favoriteButton.classList.toggle('bg-red-50', isFavorite);
        }
    }

    function updateViewCount() {
        const views = getViews();
        const viewCount = document.getElementById('view-count');
        if (viewCount) {
            viewCount.textContent = `${views[itemId] || 0} kali dilihat`;
        }
    }

    async function fetchItemDetail() {
        try {
            const response = await fetch(`http://localhost:3000/api/barang-lelang/${itemId}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            displayItemDetail(data);
            await fetchPenawaranData();
        } catch (error) {
            console.error('Error fetching item details:', error);
            detailContainer.innerHTML = `
                <div class="bg-red-50 p-4 rounded-lg">
                    <p class="text-red-500">Error loading item details: ${error.message}</p>
                </div>
            `;
        }
    }

    function displayItemDetail(data) {
        images = Array.isArray(data.gambar) ? data.gambar : [data.gambar];
        currentSlide = 0; // Reset current slide when loading new images

        const sliderHTML = `
            <div class="relative">
                <!-- Main Image -->
                <div id="main-image" class="relative">
                    <img src="${getImageUrl(images[0])}" 
                         alt="${data.nama}" 
                         class="w-full h-96 object-cover rounded-lg"
                         onerror="this.src='http://localhost:3000/assets/images/default.jpeg'">
                    
                    <!-- Navigation Arrows -->
                    ${images.length > 1 ? `
                        <button onclick="changeSlide(-1)" 
                                class="absolute left-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-r hover:bg-opacity-75 transition">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button onclick="changeSlide(1)" 
                                class="absolute right-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-l hover:bg-opacity-75 transition">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    ` : ''}
                    
                    <!-- Slide Counter -->
                    ${images.length > 1 ? `
                        <div class="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                            <span id="slide-counter">1/${images.length}</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Thumbnail Navigation -->
                ${images.length > 1 ? `
                    <div class="flex space-x-2 mt-4 overflow-x-auto pb-2">
                        ${images.map((img, index) => `
                            <button onclick="jumpToSlide(${index})" 
                                    class="thumbnail-btn flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition">
                                <img src="${getImageUrl(img)}" 
                                     alt="${data.nama} thumbnail ${index + 1}" 
                                     class="w-full h-full object-cover">
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        const detailContent = `
            <div class="flex flex-col md:flex-row gap-6">
                <!-- Image Section -->
                <div class="md:w-1/2">
                    ${sliderHTML}
                    <!-- Stats Bar -->
                    <div class="flex justify-left items-center mt-4 p-4 bg-white rounded-lg">
                        <button id="favorite-button" class="flex items-center space-x-2 hover:text-red-500 transition duration-200">
                            <i class="fas fa-heart text-gray-400"></i>
                            <span>Tambah ke Favorit</span>
                        </button>
                        <span class="mx-3 text-gray-300">|</span>
                        <div class="flex items-center space-x-2 text-gray-600">
                            <i class="fas fa-eye"></i>
                            <span id="view-count">0 kali dilihat</span>
                        </div>
                    </div>
                </div>

                <!-- Details Section -->
                <div class="md:w-1/2 space-y-6">
                    <!-- Basic Info -->
                    <div>
                        <h1 class="text-3xl font-bold mb-2">${data.nama}</h1>
                        <p class="text-gray-700 mb-4">Kategori: ${data.kategori}</p>
                        <p class="text-gray-700 mb-2">Harga Dasar Lelang</p>
                        <p class="text-gray-700 text-2xl font-bold mb-4">${formatRupiah(data.harga_awal)}</p>
                        <p class="text-gray-700 mb-4">Penawaran Terakhir</p>
                        <p id="penawaran-terakhir" class="text-gray-700 text-1xl font-bold mb-4">${formatRupiah}</p>
                        <p class="text-red-500 mb-6 font-bold">Sisa Waktu: <span id="sisa-waktu">Menghitung...</span></p>
                    </div>
                </div>
            </div>
        `;

        const informationUnit = `
            <!-- Unit Information -->
            <div class="bg-gray-50 p-4 rounded-lg">
                <h2 class="text-xl font-semibold mb-4">Informasi Unit</h2>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Jenis Barang</span>
                        <span class="font-medium">${data.jenis_barang || '-'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Bukti Kepemilikan</span>
                        <span class="font-medium">${data.bukti_kepemilikan || '-'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Tahun Pembuatan</span>
                        <span class="font-medium">${data.tahun_pembuatan || '-'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Kondisi</span>
                        <span class="font-medium">${data.kondisi || '-'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Lokasi</span>
                        <span class="font-medium">${data.lokasi || '-'}</span>
                    </div>
                    <div class="mt-4">
                        <h3 class="text-gray-600 mb-2">Uraian</h3>
                        <p class="text-sm text-gray-700">${data.uraian || 'Tidak ada uraian tersedia'}</p>
                    </div>
                </div>
            </div>

            <!-- Bid Button -->
            <a href="penawaran.html?id=${itemId}" 
               class="inline-block w-full bg-blue-500 text-white text-center py-3 px-4 rounded-md hover:bg-blue-600 transition duration-300">
                Ajukan Penawaran
            </a>
        `;

        // Update the innerHTML of the containers
        detailContainer.innerHTML = detailContent;
        informationUnitContainer.innerHTML = informationUnit;
        startSisaWaktuCountdown(data.waktu_akhir);

        // Add event listener for favorite button after content is loaded
        const favoriteButton = document.getElementById('favorite-button');
        if (favoriteButton) {
            favoriteButton.addEventListener('click', () => toggleFavorite(itemId));
        }

        // Update favorite button and view count
        updateFavoriteButton();
        incrementViews(itemId);
    }

    async function fetchPenawaranData() {
        try {
            const response = await fetch(`http://localhost:3000/api/penawaran/${itemId}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            updatePenawaranTerakhir(data.penawaran_terakhir);
        } catch (error) {
            console.error('Error fetching bid history:', error);
        }
    }

    function updatePenawaranTerakhir(penawaranTerakhir) {
        const penawaranTerakhirEl = document.getElementById("penawaran-terakhir");
        const minBidEl = document.getElementById("min-bid");
        
        // Update current highest bid
        currentHighestBid = penawaranTerakhir || initialPrice;
        
        if (penawaranTerakhirEl) {
            penawaranTerakhirEl.textContent = `${formatRupiah(currentHighestBid)}`;
        }
        
        if (minBidEl) {
            const minBid = calculateMinimumBid(currentHighestBid);
            minBidEl.textContent = formatRupiah(minBid);
        }
    }

    function startSisaWaktuCountdown(waktuAkhir) {
        const sisaWaktuEl = document.getElementById("sisa-waktu");
        const countdownInterval = setInterval(function() {
            const now = new Date();
            const akhir = new Date(waktuAkhir);
            const selisih = akhir - now;

            if (selisih <= 0) {
                clearInterval(countdownInterval);
                sisaWaktuEl.textContent = "Lelang berakhir";
                return;
            }

            const days = Math.floor(selisih / (1000 * 60 * 60 * 24));
            const hours = Math.floor((selisih % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((selisih % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((selisih % (1000 * 60)) / 1000);

            sisaWaktuEl.textContent = `${days} hari ${hours} jam ${minutes} menit ${seconds} detik`;
        }, 1000);
    }

    function setupBidForm() {
        const bidForm = document.getElementById('bid-form');
        const bidInput = document.getElementById('bid');

        if (bidInput) {
            bidInput.addEventListener('input', function(e) {
                // Remove non-numeric characters
                let value = e.target.value.replace(/\D/g, '');
                
                if (value !== '') {
                    value = parseInt(value);
                    
                    // Format number with thousand separator
                    e.target.value = formatNumber(value);

                    // Get minimum bid based on current highest bid or initial price
                    const minBid = calculateMinimumBid(currentHighestBid);

                    // Validate against minimum bid
                    if (value < minBid) {
                        bidInput.classList.add('border-red-500');
                        document.getElementById('min-bid').parentElement.classList.add('text-red-500');
                    } else {
                        bidInput.classList.remove('border-red-500');
                        document.getElementById('min-bid').parentElement.classList.remove('text-red-500');
                    }
                }
            });

            // Select all text when input is focused
            bidInput.addEventListener('focus', function(e) {
                e.target.select();
            });
        }

        if (bidForm) {
            bidForm.addEventListener('submit', async function(event) {
                event.preventDefault();

                const username = document.getElementById('username').value;
                const bidAmount = unformatNumber(document.getElementById('bid').value);
                const minBid = calculateMinimumBid(currentHighestBid);

                // Validate minimum bid
                if (bidAmount < minBid) {
                    alert(`Penawaran minimal harus ${formatRupiah(minBid)} (2% di atas ${currentHighestBid === initialPrice ? 'harga awal' : 'penawaran terakhir'})`);
                    return;
                }

                try {
                    const response = await fetch(`http://localhost:3000/api/penawaran/${itemId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            nama_user: username,
                            penawaran: bidAmount
                        })
                    });

                    const data = await response.json();
                    if (data.error) {
                        alert(data.error);
                    } else {
                        alert('Penawaran berhasil diajukan');
                        await fetchPenawaranData();
                        bidForm.reset(); // Reset form after successful submission
                    }
                } catch (error) {
                    console.error('Error submitting bid:', error);
                    alert('Gagal mengajukan penawaran');
                }
            });
        }
    }

    fetchItemDetail();
});