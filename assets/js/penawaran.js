document.addEventListener("DOMContentLoaded", function() {
    const itemId = new URLSearchParams(window.location.search).get('id');
    const bidFormContainer = document.getElementById("bid-form-container");
    const riwayatContainer = document.getElementById("penawaran-history");
    let initialPrice = 0;
    let currentHighestBid = 0;

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

    function getCurrentTimestamp() {
        return new Date().toISOString();
    }

    function formatDateTime(dateString) {
        try {
            if (!dateString) return 'Waktu tidak tersedia';
            
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                console.error('Invalid date string:', dateString);
                return 'Format waktu tidak valid';
            }

            // Format for Indonesia locale
            return date.toLocaleString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Error format waktu';
        }
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
                    e.target.value = formatNumber(value);

                    const minBid = calculateMinimumBid(currentHighestBid);
                    
                    if (value < minBid) {
                        bidInput.classList.add('border-red-500');
                        document.getElementById('min-bid').parentElement.classList.add('text-red-500');
                    } else {
                        bidInput.classList.remove('border-red-500');
                        document.getElementById('min-bid').parentElement.classList.remove('text-red-500');
                    }
                }
            });

            bidInput.addEventListener('focus', function(e) {
                e.target.select();
            });
        }

        // Update the bid submission part
        if (bidForm) {
            bidForm.addEventListener('submit', async function(event) {
                event.preventDefault();

                const username = document.getElementById('username').value;
                const bidAmount = unformatNumber(document.getElementById('bid').value);
                const minBid = calculateMinimumBid(currentHighestBid);

                if (bidAmount < minBid) {
                    alert(`Penawaran minimal harus ${formatRupiah(minBid)}`);
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
                        bidForm.reset();
                        await fetchPenawaranData(); // Refresh bid history
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Gagal mengajukan penawaran');
                }
            });
        }
    }

    async function fetchPenawaranData() {
        try {
            const response = await fetch(`http://localhost:3000/api/penawaran/${itemId}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            updatePenawaranTerakhir(data.penawaran_terakhir);
            displayRiwayatPenawaran(data.riwayat_penawaran);
        } catch (error) {
            console.error('Error fetching bid history:', error);
        }
    }

    function updatePenawaranTerakhir(penawaranTerakhir) {
        currentHighestBid = penawaranTerakhir || initialPrice;
        const minBidEl = document.getElementById("min-bid");
        if (minBidEl) {
            minBidEl.textContent = formatRupiah(calculateMinimumBid(currentHighestBid));
        }
    }

    function displayRiwayatPenawaran(riwayat) {
        if (!riwayatContainer) return;

        if (!riwayat || riwayat.length === 0) {
            riwayatContainer.innerHTML = `
                <h2 class="text-xl font-bold mb-4">Riwayat Penawaran</h2>
                <p class="text-gray-500">Belum ada penawaran</p>
            `;
            return;
        }

        const riwayatHTML = `
            <h2 class="text-xl font-bold mb-4">Riwayat Penawaran</h2>
            <div class="space-y-4">
                ${riwayat.map(bid => `
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div class="space-y-1">
                                <p class="font-medium text-lg">${bid.nama_user}</p>
                                <div class="flex items-center text-sm text-gray-500">
                                    <i class="far fa-clock mr-2"></i>
                                    <time datetime="${bid.waktu}">${formatDateTime(bid.waktu)}</time>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-bold text-lg">${formatRupiah(bid.penawaran)}</p>
                                <p class="text-sm text-gray-500">Penawaran #${bid.id}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        riwayatContainer.innerHTML = riwayatHTML;
    }

    async function initializePenawaranPage() {
        try {
            // Check if server is available first
            const serverCheck = await fetch('http://localhost:3000/api/health').catch(() => null);
            if (!serverCheck) {
                throw new Error('Server tidak dapat diakses. Pastikan server sudah berjalan.');
            }

            const response = await fetch(`http://localhost:3000/api/barang-lelang/${itemId}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (!data) {
                throw new Error('Data barang lelang tidak ditemukan');
            }
            
            initialPrice = data.harga_awal;
            currentHighestBid = data.harga_awal;

            // Add header with back link
            const headerHTML = `
                <div class="mb-6 flex items-center justify-between">
                    <h1 class="text-2xl font-bold">Ajukan Penawaran</h1>
                    <a href="detail.html?id=${itemId}" 
                       class="flex items-center text-blue-500 hover:text-blue-600 transition-colors">
                        <i class="fas fa-arrow-left mr-2"></i>
                        Kembali ke Detail Barang
                    </a>
                </div>
            `;

            const bidFormHTML = `
                ${headerHTML}
                <form id="bid-form" class="space-y-4">
                    <div>
                        <label for="username" class="block text-gray-700 font-medium mb-2">Nama</label>
                        <input type="text" id="username" name="username" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label for="bid" class="block text-gray-700 font-medium mb-2">Jumlah Penawaran (Rp)</label>
                        <input type="text" id="bid" name="bid" required
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="Contoh: 100.000">
                        <p class="text-sm text-gray-500 mt-1">Minimal penawaran: <span id="min-bid">${formatRupiah(calculateMinimumBid(data.harga_awal))}</span></p>
                    </div>
                    <button type="submit" 
                            class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300">
                        Ajukan Penawaran
                    </button>
                </form>
            `;

            bidFormContainer.innerHTML = bidFormHTML;
            setupBidForm();
            await fetchPenawaranData();
        } catch (error) {
            console.error('Error initializing penawaran page:', error);
            bidFormContainer.innerHTML = `
                <div class="bg-red-50 p-4 rounded-lg space-y-4">
                    <p class="text-red-500 font-medium">${error.message}</p>
                    <p class="text-gray-600 text-sm">Silakan coba:</p>
                    <ul class="list-disc list-inside text-sm text-gray-600 ml-4">
                        <li>Pastikan server berjalan di port 3000</li>
                        <li>Periksa koneksi internet Anda</li>
                        <li>Refresh halaman ini</li>
                    </ul>
                    <button onclick="window.location.reload()" 
                            class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
                        Refresh Halaman
                    </button>
                </div>
            `;
        }
    }

    initializePenawaranPage();
});