const fs = require('fs');
const https = require('https');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const files = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2',
    'ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1',
    'ssd_mobilenetv1_model-shard2'
];

function downloadFile(file) {
    const url = `${baseUrl}/${file}`;
    const dest = path.join(modelsDir, file);

    if (fs.existsSync(dest)) {
        console.log(`Skipping ${file} (already exists)`);
        return;
    }

    const fileStream = fs.createWriteStream(dest);
    https.get(url, (response) => {
        if (response.statusCode !== 200) {
            console.error(`Failed to download ${file}: Status ${response.statusCode}`);
            fileStream.close();
            fs.unlinkSync(dest); // Delete partial file
            return;
        }
        response.pipe(fileStream);
        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`Downloaded ${file}`);
        });
    }).on('error', (err) => {
        fs.unlinkSync(dest);
        console.error(`Error downloading ${file}: ${err.message}`);
    });
}

console.log('Downloading models...');
files.forEach(downloadFile);
