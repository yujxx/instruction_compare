const CONFIG = {
    fileList: [
        "common-sense_31_5",
        "common-sense_31_8",
        "common-sense_31_14",
        "common-sense_32_0",
        "common-sense_32_6",
        "common-sense_32_10",
        "common-sense_33_3",
        "common-sense_33_4",
        "common-sense_33_11",
        "common-sense_34_2",
        "common-sense_34_12",
        "common-sense_34_19",
        "common-sense_35_9",
        "common-sense_35_12",
        "common-sense_35_14",
        "counterfactual_51_0",
        "counterfactual_51_3",
        "counterfactual_51_9",
        "counterfactual_52_4",
        "counterfactual_52_13",
        "counterfactual_52_15",
        "counterfactual_53_8",
        "counterfactual_53_10",
        "counterfactual_53_13",
        "counterfactual_54_5",
        "counterfactual_54_6",
        "counterfactual_54_7",
        "counterfactual_55_6",
        "counterfactual_55_8",
        "counterfactual_55_13",
        "generic_1_7",
        "generic_1_15",
        "generic_1_16",
        "generic_2_2",
        "generic_2_7",
        "generic_2_8",
        "generic_3_7",
        "generic_3_14",
        "generic_3_16",
        "generic_4_6",
        "generic_4_10",
        "generic_4_12",
        "generic_5_3",
        "generic_5_10",
        "generic_5_14",
        "knowledge_11_6",
        "knowledge_11_9",
        "knowledge_11_11",
        "knowledge_12_10",
        "knowledge_12_11",
        "knowledge_12_12",
        "knowledge_13_1",
        "knowledge_13_4",
        "knowledge_13_6",
        "knowledge_14_4",
        "knowledge_14_13",
        "knowledge_14_18",
        "knowledge_15_0",
        "knowledge_15_9",
        "knowledge_15_11",
        // ... 可以继续添加更多文件名
    ]
};
let audioFiles = [];
let audioFilesN = [];
let textFiles = [];
let currentIndex = 0;
let scores = [];
let selectedScore = null;

// 从配置初始化文件列表
function initializeFileList() {
    audioFiles = CONFIG.fileList.map(name => `audio/${name}.wav`);
    audioFilesN = CONFIG.fileList.map(name => `audio_n/${name}.wav`);
    textFiles = CONFIG.fileList.map(name => `text/${name}.txt`);
}

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
    initializeFileList(); // 初始化文件列表
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
        document.getElementById('progress-text').textContent = 
            `${currentIndex + 1}/${audioFiles.length} (${CONFIG.fileList[currentIndex]})`;

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
        `${CONFIG.fileList[index]}: ${score}`
    ).join('\n');
    document.getElementById('detailed-scores').textContent = detailedScores;
}

function sendResultsByEmail() {
    const emailAddress = 'yujiaxiao@link.cuhk.edu.hk'; // 你的邮箱地址
    const subject = 'Audio Comparison Test Results';
    
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const detailedScores = scores.map((score, index) => 
        `${CONFIG.fileList[index]}: ${score}`
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
