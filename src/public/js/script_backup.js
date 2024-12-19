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

async function initAudio() {
    try {
        // 检查是否已经初始化
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 如果音频上下文被挂起，则恢复它
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
        // 创建容器div
        const soundItem = document.createElement('div');
        soundItem.className = 'sound-item';

        // 创建按钮
        const button = document.createElement('button');
        button.className = 'sound-button';
        button.style.backgroundColor = sound.color;
        button.setAttribute('data-sound', sound.name);  // 添加数据属性
        
        // 创建按钮内容
        button.innerHTML = `
            <span class="sound-icon">${sound.icon}</span>
            <span class="sound-name">${sound.name}</span>
            <input type="range" class="volume-slider" min="0" max="100" value="50">
        `;

        // 添加按钮点击事件
        button.addEventListener('click', (e) => {
            // 如果点击的是滑块，不触发音频播放
            if (e.target.className === 'volume-slider') {
                e.stopPropagation();
                return;
            }
            toggleSound(sound);
        });

        // 添加音量控制事件
        const volumeSlider = button.querySelector('.volume-slider');
        volumeSlider.addEventListener('input', (e) => {
            e.stopPropagation();  // 防止触发按钮点击事件
            if (gainNodes[sound.name]) {
                gainNodes[sound.name].gain.value = e.target.value / 100;
            }
        });

        // 将按钮添加到容器中
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
            // 停止播放时隐藏音量滑块
            audioSources[sound.name].stop();
            delete audioSources[sound.name];
            delete gainNodes[sound.name];
            button.classList.remove('active');
            // 如果没有其他声音在播放，移除所有按钮的 inactive 类
            if (Object.keys(audioSources).length === 0) {
                document.querySelectorAll('.sound-button').forEach(btn => {
                    btn.classList.remove('inactive');
                });
            }
            socket.emit('soundUpdate', { name: sound.name, playing: false });
        } else {
            try {
                // 加载并播放音频
                const response = await fetch(sound.file);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                // 创建音频源和增益节点
                const source = audioContext.createBufferSource();
                const gainNode = audioContext.createGain();
                
                // 设置音频参数
                source.buffer = audioBuffer;
                source.loop = true;
                
                // 连接节点
                source.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                // 更新按钮状态，显示音量滑块
                button.classList.add('active');
                button.classList.remove('inactive');
                
                // 设置初始音量并确保滑块可见
                const volumeSlider = button.querySelector('.volume-slider');
                gainNode.gain.value = volumeSlider.value / 100;
                
                // 开始播放
                source.start();
                
                // 保存引用
                audioSources[sound.name] = source;
                gainNodes[sound.name] = gainNode;
                
                // 将其他未播放的按钮设置为 inactive
                document.querySelectorAll('.sound-button').forEach(btn => {
                    if (!btn.classList.contains('active')) {
                        btn.classList.add('inactive');
                    }
                });
                
                // 添加结束事件处理
                source.onended = () => {
                    button.classList.remove('active');
                    delete audioSources[sound.name];
                    delete gainNodes[sound.name];
                };
                socket.emit('soundUpdate', { name: sound.name, playing: true });
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

    // 随机组合按钮功能
    const randomButton = document.getElementById('random-combination');
    randomButton.addEventListener('click', () => {
        // 停止所有当前播放的声音
        Object.keys(audioSources).forEach(soundName => {
            const button = document.querySelector(`button[data-sound="${soundName}"]`);
            if (button) {
                button.classList.remove('active');
            }
            audioSources[soundName].stop();
            delete audioSources[soundName];
            delete gainNodes[soundName];
        });

        // 随机选择3-5个声音
        const count = Math.floor(Math.random() * 3) + 3; // 生成3-5的随机数
        const shuffledSounds = [...sounds].sort(() => Math.random() - 0.5);
        const selectedSounds = shuffledSounds.slice(0, count);

        // 播放选中的声音
        selectedSounds.forEach(sound => {
            toggleSound(sound);
        });
    });

    // 设置保存组合下拉菜单的事件监听
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

    // 设置保存按钮的事件监听
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
        // 停止所有当前播放的声音
        Object.keys(audioSources).forEach(soundName => {
            const button = document.querySelector(`button[data-sound="${soundName}"]`);
            if (button) {
                button.classList.remove('active');
                audioSources[soundName].stop();
            }
        });
        audioSources = {};
        gainNodes = {};

        // 重置所有按钮状态
        document.querySelectorAll('.sound-button').forEach(btn => {
            btn.classList.remove('active', 'inactive');
        });

        // 播放保存的组合
        for (const soundConfig of combination) {
            const sound = sounds.find(s => s.name === soundConfig.name);
            if (sound) {
                await toggleSound(sound);
                // 设置保存的音量
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

        // 更新未被选中按钮的状态
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

// 当所有资源加载完成后
window.addEventListener('load', () => {
    // 获取需要操作的元素
    const loadingScreen = document.getElementById('loading-screen');
    const welcomeScreen = document.getElementById('welcome-screen');
    
    // 检查用户是否之前选择了"不再显示"欢迎界面
    const dontShowWelcome = localStorage.getItem('dontShowWelcome') === 'true';
    
    // 隐藏加��界面
    loadingScreen.style.display = 'none';
    
    // 如果用户没有选择"不再显示"，则显示欢迎界面
    if (!dontShowWelcome) {
        welcomeScreen.classList.remove('hidden');
    }
    
    // 处理"开始体验"按钮点击事件
    const startButton = document.getElementById('start-experience');
    startButton.addEventListener('click', () => {
        // 检查"不再显示"复选框
        const dontShowAgain = document.getElementById('dont-show-again').checked;
        if (dontShowAgain) {
            localStorage.setItem('dontShowWelcome', 'true');
        }
        
        // 隐藏欢迎界面
        welcomeScreen.classList.add('hidden');
    });
});