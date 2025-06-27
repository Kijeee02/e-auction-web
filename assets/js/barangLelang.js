const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const barangLelangPath = path.join(__dirname, '../data/barangLelang.json');

function readBarangLelang() {
    const data = fs.readFileSync(barangLelangPath, 'utf-8');
    return JSON.parse(data);
}

router.get('/', (req, res) => {
    const barangLelang = readBarangLelang();
    res.json(barangLelang);
});

module.exports = router;