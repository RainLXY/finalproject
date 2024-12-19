Server is running on http://localhost:3000
MongooseServerSelectionError: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
    at _handleConnectionErrors (/Users/lixiaoyu/Desktop/sound-palette/node_modules/mongoose/lib/connection.js:1110:11)
    at NativeConnection.openUri (/Users/lixiaoyu/Desktop/sound-palette/node_modules/mongoose/lib/connection.js:1041:11) {
  reason: TopologyDescription {
    type: 'Unknown',
    servers: Map(1) { 'localhost:27017' => [ServerDescription] },
    stale: false,
    compatible: true,
    heartbeatFrequencyMS: 10000,
    localThresholdMS: 15,
    setName: null,
    maxElectionId: null,
    maxSetVersion: null,
    commonWireVersion: 0,
    logicalSessionTimeoutMinutes: null
  },
  code: undefined
}

let activeAudios = {};

const sounds = [
    { name: 'Rain', icon: '💧', color: '#96616B', file: 'sounds/rain.mp3', type: 'audio/mp3' },
    { name: 'Thunder', icon: '⚡', color: '#75485E', file: 'sounds/thunder.mp3' },
    { name: 'Waves', icon: '🌊', color: '#84A59D', file: 'sounds/waves.mp3' },
    { name: 'Forest', icon: '🌳', color: '#89A894', file: 'sounds/forest.mp3' },
    { name: 'Fire', icon: '🔥', color: '#C17767', file: 'sounds/fire.mp3' },
    { name: 'Birds', icon: '🐦', color: '#A7B8A8', file: 'sounds/birds.mp3' },
    { name: 'City', icon: '🏙️', color: '#8E8E8E', file: 'sounds/city.mp3' },
    { name: 'Wind', icon: '💨', color: '#B4A6AB', file: 'sounds/wind.mp3' },
    { name: 'Stream', icon: '🏞️', color: '#7B9EA8', file: 'sounds/stream.mp3' },
    { name: 'White Noise', icon: '📻', color: '#60452A', file: 'sounds/whitenoise.mp3' },
    { name: 'Cafe', icon: '☕', color: '#5d4037', file: 'sounds/cafe.mp3' },
    { name: 'Beach', icon: '🏖️', color: '#CD9136', file: 'sounds/beach.mp3' },
    { name: 'Bell', icon: '🔔', color: '#5C7995', file: 'sounds/bell.mp3' },
    { name: 'Keyboard', icon: '⌨️', color: '#E6BCBC', file: 'sounds/keyboard.mp3' },
    { name: 'Bubbles', icon: '🫧', color: '#88867B', file: 'sounds/bubbles.mp3' },
    { name: 'Horse', icon: '🐎', color: '#D49DAA', file: 'sounds/horse.mp3' },
    { name: 'Shower', icon: '🚿', color: '#00695c', file: 'sounds/shower.mp3' },
    { name: 'Book', icon: '📚', color: '#a1887f', file: 'sounds/book.mp3' },
];

let audioContext;
let gainNodes = {};
let audioSources = {};

async function initAudio() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
        }
        return true;
    } catch (error) {
        console.error('Failed to initialize audio context:', error);
        return false;
    }
}

function createSoundButtons() {
    const grid = document.querySelector('.sound-grid');
    sounds.forEach(sound => {
        const soundItem = document.createElement('div');
        soundItem.className = 'sound-item';

        const button = document.createElement('button');
        button.className = 'sound-button';
        button.style.backgroundColor = sound.color;
        button.setAttribute('data-sound', sound.name);

        button.innerHTML = `
            <span class="sound-icon">${sound.icon}</span>
            <span class="sound-name">${sound.name}</span>
            <input type="range" class="volume-slider" min="0" max="100" value="50">
        `;

        button.addEventListener('click', (e) => {
            if (e.target.className === 'volume-slider') {
                e.stopPropagation();
                return;
            }
            toggleSound(sound);
        });

        const volumeSlider = button.querySelector('.volume-slider');
        volumeSlider.addEventListener('input', (e) => {
            e.stopPropagation();
            if (gainNodes[sound.name]) {
                gainNodes[sound.name].gain.value = e.target.value / 100;
            }
        });

        soundItem.appendChild(button);
        grid.appendChild(soundItem);
    });
}

async function toggleSound(sound) {
    try {
        const initialized = await initAudio();
        if (!initialized) return;

        const button = document.querySelector(`button[data-sound="${sound.name}"]`);

        if (audioSources[sound.name]) {
            audioSources[sound.name].stop();
            delete audioSources[sound.name];
            delete gainNodes[sound.name];
            button.classList.remove('active');
            if (Object.keys(audioSources).length === 0) {
                document.querySelectorAll('.sound-button').forEach(btn => {
                    btn.classList.remove('inactive');
                });
            }
        } else {
            try {
                const response = await fetch(sound.file);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const source = audioContext.createBufferSource();
                const gainNode = audioContext.createGain();

                source.buffer = audioBuffer;
                source.loop = true;

                source.connect(gainNode);
                gainNode.connect(audioContext.destination);

                button.classList.add('active');
                button.classList.remove('inactive');

                const volumeSlider = button.querySelector('.volume-slider');
                gainNode.gain.value = volumeSlider.value / 100;

                source.start();

                audioSources[sound.name] = source;
                gainNodes[sound.name] = gainNode;

                document.querySelectorAll('.sound-button').forEach(btn => {
                    if (!btn.classList.contains('active')) {
                        btn.classList.add('inactive');
                    }
                });

                source.onended = () => {
                    button.classList.remove('active');
                    delete audioSources[sound.name];
                    delete gainNodes[sound.name];
                };
            } catch (error) {
                console.error('Error loading sound:', error);
                alert('Failed to load sound file. Please check your internet connection and try again.');
            }
        }
    } catch (error) {
        console.error('Error in toggleSound:', error);
    }
}

function setupControlPanel() {
    const volumeSlider = document.getElementById('master-volume');
    volumeSlider.addEventListener('input', (e) => {
        Object.values(gainNodes).forEach(node => {
            node.gain.setValueAtTime(e.target.value / 100, audioContext.currentTime);
        });
    });

    const playPauseButton = document.getElementById('play-pause-all');
    playPauseButton.addEventListener('click', () => {
        if (audioContext.state === 'running') {
            audioContext.suspend();
            playPauseButton.textContent = 'Play all';
        } else {
            audioContext.resume();
            playPauseButton.textContent = 'Pause all';
        }
    });

    const randomButton = document.getElementById('random-combination');
    randomButton.addEventListener('click', () => {
        Object.keys(audioSources).forEach(soundName => {
            const button = document.querySelector(`button[data-sound="${soundName}"]`);
            if (button) {
                button.classList.remove('active');
            }
            audioSources[soundName].stop();
            delete audioSources[soundName];
            delete gainNodes[soundName];
        });

        const count = Math.floor(Math.random() * 3) + 3;
        const shuffledSounds = [...sounds].sort(() => Math.random() - 0.5);
        const selectedSounds = shuffledSounds.slice(0, count);

        selectedSounds.forEach(sound => {
            toggleSound(sound);
        });
    });

    const savedCombinationsDropdown = document.getElementById('saved-combinations');
    savedCombinationsDropdown.addEventListener('change', (e) => {
        const selectedValue = e.target.value;

        if (selectedValue === 'DELETE_MODE') {
            const combinationToDelete = prompt('Enter the name of the combination to delete:');
            if (combinationToDelete) {
                const savedCombinations = JSON.parse(localStorage.getItem('savedCombinations') || '{}');
                if (savedCombinations[combinationToDelete]) {
                    if (confirm(`Are you sure you want to delete "${combinationToDelete}"?`)) {
                        deleteCombination(combinationToDelete);
                    }
                } else {
                    alert('Combination name not found');
                }
            }
            e.target.value = '';
        } else if (selectedValue) {
            loadCombination(selectedValue);
        }
    });

    const saveButton = document.getElementById('save-combination');
    saveButton.addEventListener('click', saveCombination);
}

function saveCombination() {
    const name = prompt('Name your current combination:');
    if (name) {
        const currentCombination = Object.keys(audioSources).map(soundName => {
            const button = document.querySelector(`button[data-sound="${soundName}"]`);
            const volumeSlider = button.querySelector('.volume-slider');
            return {
                name: soundName,
                volume: volumeSlider.value
            };
        });

        const savedCombinations = JSON.parse(localStorage.getItem('savedCombinations') || '{}');
        savedCombinations[name] = currentCombination;
        localStorage.setItem('savedCombinations', JSON.stringify(savedCombinations));
        updateSavedCombinationsDropdown();
    }
}

function updateSavedCombinationsDropdown() {
    const dropdown = document.getElementById('saved-combinations');
    const savedCombinations = JSON.parse(localStorage.getItem('savedCombinations') || '{}');

    dropdown.innerHTML = '<option value="">Select saved combinations</option>';

    Object.keys(savedCombinations).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        dropdown.appendChild(option);
    });

    if (Object.keys(savedCombinations).length > 0) {
        const deleteOption = document.createElement('option');
        deleteOption.value = 'DELETE_MODE';
        deleteOption.textContent = 'Delete saved combination...';
        deleteOption.style.color = 'red';
        dropdown.appendChild(deleteOption);
    }
}

async function loadCombination(name) {
    const savedCombinations = JSON.parse(localStorage.getItem('savedCombinations') || '{}');
    const combination = savedCombinations[name];

    if (combination) {
        Object.keys(audioSources).forEach(soundName => {
            const button = document.querySelector(`button[data-sound="${soundName}"]`);
            if (button) {
                button.classList.remove('active');
                audioSources[soundName].stop();
            }
        });
        audioSources = {};
        gainNodes = {};

        document.querySelectorAll('.sound-button').forEach(btn => {
            btn.classList.remove('active', 'inactive');
        });

        for (const soundConfig of combination) {
            const sound = sounds.find(s => s.name === soundConfig.name);
            if (sound) {
                await toggleSound(sound);
                const button = document.querySelector(`button[data-sound="${sound.name}"]`);
                if (button) {
                    const volumeSlider = button.querySelector('.volume-slider');
                    if (volumeSlider && gainNodes[sound.name]) {
                        volumeSlider.value = soundConfig.volume;
                        gainNodes[sound.name].gain.value = soundConfig.volume / 100;
                    }
                }
            }
        }

        document.querySelectorAll('.sound-button').forEach(btn => {
            if (!btn.classList.contains('active')) {
                btn.classList.add('inactive');
            }
        });
    }
}

function deleteCombination(name) {
    const savedCombinations = JSON.parse(localStorage.getItem('savedCombinations') || '{}');
    delete savedCombinations[name];
    localStorage.setItem('savedCombinations', JSON.stringify(savedCombinations));
    updateSavedCombinationsDropdown();
}

function setupWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcome-screen');
    const startButton = document.getElementById('start-experience');
    const dontShowAgain = document.getElementById('dont-show-again');

    if (localStorage.getItem('dontShowWelcome') === 'true') {
        welcomeScreen.classList.add('hidden');
    } else {
        startButton.addEventListener('click', () => {
            welcomeScreen.classList.add('hidden');
            if (dontShowAgain.checked) {
                localStorage.setItem('dontShowWelcome', 'true');
            }
        });
    }
}

function setupLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const progress = loadingScreen.querySelector('.progress');
    let loaded = 0;

    function updateProgress() {
        loaded++;
        const percentage = (loaded / sounds.length) * 100;
        progress.style.width = `${percentage}%`;
        if (loaded === sounds.length) {
            loadingScreen.classList.add('hidden');
        }
    }

    sounds.forEach(sound => {
        const audio = new Audio(sound.file);
        audio.addEventListener('canplaythrough', updateProgress, { once: true });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', async () => {
        await initAudio();
    }, { once: true });

    setupLoadingScreen();
    setupWelcomeScreen();
    createSoundButtons();
    setupControlPanel();
    updateSavedCombinationsDropdown();
});

window.addEventListener('load', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const welcomeScreen = document.getElementById('welcome-screen');

    const dontShowWelcome = localStorage.getItem('dontShowWelcome') === 'true';

    loadingScreen.style.display = 'none';

    if (!dontShowWelcome) {
        welcomeScreen.classList.remove('hidden');
    }

    const startButton = document.getElementById('start-experience');
    startButton.addEventListener('click', () => {
        const dontShowAgain = document.getElementById('dont-show-again').checked;
        if (dontShowAgain) {
            localStorage.setItem('dontShowWelcome', 'true');
        }

        welcomeScreen.classList.add('hidden');
    });
});

// Socket 连接初始化
const socket = io();

// 房间加入/创建功能
function joinRoom(roomName) {
    socket.emit('joinRoom', roomName);
}

function createRoom(roomName) {
    socket.emit('createRoom', roomName);
}

// 声音同步功能
socket.on('soundUpdate', (soundData) => {
    // 更新声音状态
    const soundName = soundData.name;
    const sound = sounds.find(s => s.name === soundName);
    if (sound) {
        if (soundData.playing) {
            toggleSound(sound);
        } else {
            const button = document.querySelector(`button[data-sound="${soundName}"]`);
            if (button) {
                button.classList.remove('active');
                audioSources[soundName].stop();
                delete audioSources[soundName];
                delete gainNodes[soundName];
            }
        }
    }
});

// 用户界面更新
socket.on('updateUI', (data) => {
    // 更新用户界面
    const buttons = document.querySelectorAll('.sound-button');
    buttons.forEach(button => {
        const soundName = button.getAttribute('data-sound');
        if (data[soundName]) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
});
