const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../')));
app.use('/assets/images', express.static(path.join(__dirname, '../assets/images')));

const penawaranPath = path.join(__dirname, '../data/penawaran.json');
const barangLelangPath = path.join(__dirname, '../data/barangLelang.json');

function readBarangLelang() {
    const data = fs.readFileSync(barangLelangPath, 'utf-8');
    return JSON.parse(data);
}

function writeBarangLelang(data) {
    fs.writeFileSync(barangLelangPath, JSON.stringify(data, null, 2), 'utf-8');
}

function readPenawaran() {
    const data = fs.readFileSync(penawaranPath, 'utf-8');
    return JSON.parse(data);
}

function writePenawaran(data) {
    fs.writeFileSync(penawaranPath, JSON.stringify(data, null, 2), 'utf-8');
}

function generateImageUrl(item) {
    let searchTerm = encodeURIComponent(item.nama.toLowerCase().replace(/\s+/g, '-'));
    const imagePath = path.join(__dirname, '../images', `${searchTerm}.jpeg`);

    if (fs.existsSync(imagePath)) {
        return `/assets/images/${searchTerm}.jpeg`;
    } else {
        let categorySearchTerm = encodeURIComponent(item.kategori.toLowerCase().replace(/\s+/g, '-'));
        const categoryImagePath = path.join(__dirname, '../images', `${categorySearchTerm}.jpeg`);


        if (fs.existsSync(categoryImagePath)) {
            return `/assets/images/${categorySearchTerm}.jpeg`;
        } else {
            return `/assets/images/default.jpeg`;
        }
    }
}

// Add this route to check server health
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/barang-lelang', (req, res) => {
    const barangLelang = readBarangLelang();
    const barangWithImages = barangLelang.map(item => ({
        ...item,
        gambar: generateImageUrl(item)
    }));
    res.json(barangWithImages);
});

app.get('/api/barang-lelang/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const barangLelang = readBarangLelang();
        const item = barangLelang.find(item => item.id === id);
        
        if (!item) {
            return res.status(404).json({ 
                message: 'Barang lelang tidak ditemukan' 
            });
        }
        
        res.json(item);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            message: 'Terjadi kesalahan saat mengambil data barang' 
        });
    }
});

app.get('/api/penawaran/:barang_id', (req, res) => {
    const penawaran = readPenawaran();
    const barang_id = parseInt(req.params.barang_id);
    const item = penawaran.find(p => p.barang_id === barang_id);

    if (item) {
        res.json(item);
    } else {
        res.json({ penawaran_terakhir: 0, riwayat_penawaran: [] });
    }
});

app.post('/api/penawaran/:barang_id', (req, res) => {
    const { nama_user, penawaran } = req.body;
    const barang_id = parseInt(req.params.barang_id);

    let penawaranData = readPenawaran();
    const index = penawaranData.findIndex(p => p.barang_id === barang_id);

    if (index !== -1) {
        if (penawaran > penawaranData[index].penawaran_terakhir) {
            penawaranData[index].penawaran_terakhir = penawaran;
            penawaranData[index].riwayat_penawaran.push({ nama_user, penawaran });
            writePenawaran(penawaranData);
            res.json({ message: 'Penawaran berhasil diperbarui', penawaran_terakhir: penawaran });
        } else {
            res.status(400).json({ error: 'Penawaran harus lebih tinggi dari penawaran terakhir' });
        }
    } else {
        penawaranData.push({
            barang_id,
            penawaran_terakhir: penawaran,
            riwayat_penawaran: [{ nama_user, penawaran }]
        });
        writePenawaran(penawaranData);
        res.json({ message: 'Penawaran berhasil ditambahkan', penawaran_terakhir: penawaran });
    }
});

app.post('/api/penawaran/:id', (req, res) => {
    try {
        const { nama_user, penawaran } = req.body;
        const itemId = req.params.id;
        
        // Generate server timestamp
        const waktu = new Date().toISOString();

        const newBid = {
            id: Date.now(), // Unique ID using timestamp
            nama_user,
            penawaran: Number(penawaran),
            waktu // Store as ISO string
        };

        // Add to riwayatPenawaran array (assuming you have this in your data structure)
        if (!riwayatPenawaran[itemId]) {
            riwayatPenawaran[itemId] = [];
        }
        riwayatPenawaran[itemId].push(newBid);

        // Update penawaran_terakhir
        penawaranTerakhir[itemId] = penawaran;

        res.json({
            success: true,
            message: 'Penawaran berhasil',
            bid: newBid
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET endpoint to fetch bid history
app.get('/api/penawaran/:id', (req, res) => {
    const itemId = req.params.id;
    res.json({
        penawaran_terakhir: penawaranTerakhir[itemId] || 0,
        riwayat_penawaran: riwayatPenawaran[itemId] || []
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});