let audioFiles = Array.from({length: 60}, (_, i) => `audio/${i + 1}.wav`);
let audioFilesN = Array.from({length: 60}, (_, i) => `audio_n/${i + 1}.wav`);
let textFiles = Array.from({length: 60}, (_, i) => `text/${i + 1}.txt`);

let currentIndex = 0;
let scores = [];
let selectedScore = null;

class AudioLoader {
    constructor() {
        this.audioCache = new Map();
        this.loadingPromises = new Map();
    }

    async preloadAudio(url) {
        if (this.audioCache.has(url)) {
            return this.audioCache.get(url);
        }

        if (this.loadingPromises.has(url)) {
            return this.loadingPromises.get(url);
        }

        const loadingPromise = new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'auto';

            audio.addEventListener('canplaythrough', () => {
                this.audioCache.set(url, audio);
                this.loadingPromises.delete(url);
                resolve(audio);
            }, { once: true });

            audio.addEventListener('error', (e) => {
                this.loadingPromises.delete(url);
                reject(new Error(`Failed to load audio: ${url}`));
            }, { once: true });

            audio.src = url;
        });

        this.loadingPromises.set(url, loadingPromise);
        return loadingPromise;
    }

    async preloadNext(currentIndex) {
        const nextIndex = currentIndex + 1;
        if (nextIndex < audioFiles.length) {
            try {
                await Promise.all([
                    this.preloadAudio(audioFiles[nextIndex]),
                    this.preloadAudio(audioFilesN[nextIndex])
                ]);
            } catch (error) {
                console.warn('Failed to preload next audio:', error);
            }
        }
    }
}

const audioLoader = new AudioLoader();

async function startTest() {
    document.getElementById('guidance-page').classList.add('hidden');
    document.getElementById('test-page').classList.remove('hidden');
    
    try {
        await Promise.all([
            audioLoader.preloadAudio(audioFiles[0]),
            audioLoader.preloadAudio(audioFilesN[0])
        ]);
    } catch (error) {
        console.warn('Failed to preload first audio:', error);
    }
    
    loadItem();
}

async function loadItem() {
    if (currentIndex >= audioFiles.length) {
        showResults();
        return;
    }

    // Reset UI
    document.querySelectorAll('.score-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.getElementById('next-button').disabled = true;
    selectedScore = null;

    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.remove('hidden');

    try {
        // Update progress
        document.getElementById('progress-text').textContent = `${currentIndex + 1}/${audioFiles.length}`;

        // Load audio files
        const audioPlayer1 = document.getElementById('audio-player-1');
        const audioPlayer2 = document.getElementById('audio-player-2');
        
        try {
            const [audio1, audio2] = await Promise.all([
                audioLoader.preloadAudio(audioFiles[currentIndex]),
                audioLoader.preloadAudio(audioFilesN[currentIndex])
            ]);
            
            audioPlayer1.src = audio1.src;
            audioPlayer2.src = audio2.src;
            
            // Preload next audio files
            audioLoader.preloadNext(currentIndex);
        } catch (error) {
            throw new Error(`Failed to load audio: ${error.message}`);
        }

        // Load text
        const response = await fetch(textFiles[currentIndex]);
        const text = await response.text();
        document.getElementById('text-content').textContent = text;

    } catch (error) {
        console.error('Error loading item:', error);
        document.getElementById('text-content').innerHTML = `
            <div class="error-message">
                Error loading content. Please try again.
                <br>
                <button class="retry-button" onclick="loadItem()">Retry</button>
            </div>
        `;
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

function selectScore(score) {
    selectedScore = score;
    document.querySelectorAll('.score-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`.score-button[onclick="selectScore(${score})"]`).classList.add('selected');
    document.getElementById('next-button').disabled = false;
}

function nextItem() {
    scores[currentIndex] = selectedScore;
    currentIndex++;
    loadItem();
}

function showResults() {
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    document.getElementById('test-page').classList.add('hidden');
    document.getElementById('result-page').classList.remove('hidden');
    document.getElementById('average-score').textContent = average.toFixed(2);
    
    const detailedScores = scores.map((score, index) => 
        `File ${index + 1}: ${score}`
    ).join('\n');
    document.getElementById('detailed-scores').textContent = detailedScores;
}

function sendResultsByEmail() {
    const emailAddress = 'your.email@example.com'; // 替换为您的邮箱地址
    const subject = 'Audio Comparison Test Results';
    
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const detailedScores = scores.map((score, index) => 
        `File ${index + 1}: ${score}`
    ).join('\n');
    
    const body = `
Average Score: ${average.toFixed(2)}

Detailed Scores:
${detailedScores}

Test completed on: ${new Date().toLocaleString()}
    `.trim();
    
    const mailtoLink = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
}
