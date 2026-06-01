/**
 * QR Code Generator
 * lihi.io
 */

(function() {
    'use strict';

    // ==================== State Management ====================
    const DEFAULT_LOGO_PATH = './images/lihi-logo-Icon-1080px.png';
    
    const state = {
        currentStep: 1,
        qrType: 'url',
        url: '',
        wifi: {
            ssid: '',
            password: '',
            encryption: 'WPA'
        },
        phone: {
            countryCode: '+886',
            number: ''
        },
        email: {
            address: '',
            subject: '',
            body: ''
        },
        sms: {
            countryCode: '+886',
            phone: '',
            body: ''
        },
        logo: null,
        logoFileName: '',
        isDefaultLogo: true, // 標記是否使用預設 logo
        background: null,
        bgFileName: '',
        detectedCountryCode: '+886', // 儲存 IP 偵測到的國家碼
        lastShortenedUrl: '', // 上次成功產生短網址的原始 URL
        lastShortUrl: '', // 上次產生的短網址
        // Create Short URL Modal State
        availableDomains: [], // 可用的網域列表
        createdShortUrlResult: null, // 建立的短網址結果
        // User UTM Settings
        forceLower: false, // UTM 參數是否強制小寫
        utmSources: [], // 用戶的 UTM source 選項
        utmMediums: [] // 用戶的 UTM medium 選項
    };

    // ==================== API Configuration ====================
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname.endsWith('.test')
    ? 'https://app.lihi.test'
    : 'https://app.lihi.io';
    const JWT_STORAGE_KEY = 'lihi_jwt_token';
    
    // 國家碼對照表 (country_code -> calling_code)
    const countryCallingCodes = {
        'TW': '+886',
        'CN': '+86',
        'HK': '+852',
        'MO': '+853',
        'JP': '+81',
        'KR': '+82',
        'SG': '+65',
        'MY': '+60',
        'TH': '+66',
        'PH': '+63',
        'VN': '+84',
        'ID': '+62',
        'IN': '+91',
        'US': '+1',
        'CA': '+1',
        'GB': '+44',
        'DE': '+49',
        'FR': '+33',
        'AU': '+61',
        'NZ': '+64'
    };

    // Type display names
    const typeNames = {
        url: '網址',
        wifi: 'WiFi',
        phone: '電話',
        email: '信箱',
        sms: '簡訊'
    };

    let elements = null;
    let previewQR = null;
    let downloadQR = null;

    // ==================== DOM Elements ====================
    function initElements() {
        elements = {
            // Steps
            step1: document.getElementById('step1'),
            step2: document.getElementById('step2'),
            
            // QR Type
            qrTypeTabs: document.querySelectorAll('.qr-type-tab'),
            currentType: document.getElementById('currentType'),
            currentTypePreview: document.getElementById('currentTypePreview'),
            
            // Tab Contents
            tabUrl: document.getElementById('tabUrl'),
            tabWifi: document.getElementById('tabWifi'),
            tabPhone: document.getElementById('tabPhone'),
            tabEmail: document.getElementById('tabEmail'),
            tabSms: document.getElementById('tabSms'),
            
            // URL Tab
            urlInput: document.getElementById('urlInput'),
            
            // WiFi Tab
            wifiSsidInput: document.getElementById('wifiSsidInput'),
            wifiPasswordInput: document.getElementById('wifiPasswordInput'),
            wifiPasswordField: document.getElementById('wifiPasswordField'),
            wifiPasswordRequired: document.getElementById('wifiPasswordRequired'),
            toggleWifiPassword: document.getElementById('toggleWifiPassword'),
            wifiEncryption: document.getElementById('wifiEncryption'),
            
            // Phone Tab
            phoneCountryCode: document.getElementById('phoneCountryCode'),
            phoneInput: document.getElementById('phoneInput'),
            
            // Email Tab
            emailInput: document.getElementById('emailInput'),
            emailSubject: document.getElementById('emailSubject'),
            emailBody: document.getElementById('emailBody'),
            
            // SMS Tab
            smsCountryCode: document.getElementById('smsCountryCode'),
            smsPhoneInput: document.getElementById('smsPhoneInput'),
            smsBodyInput: document.getElementById('smsBodyInput'),
            
            // Step 1 Buttons
            nextStepBtn: document.getElementById('nextStepBtn'),
            clearBtn: document.getElementById('clearBtn'),
            
            // Step 2
            bgUpload: document.getElementById('bgUpload'),
            bgFileName: document.getElementById('bgFileName'),
            clearBgBtn: document.getElementById('clearBgBtn'),
            logoUpload: document.getElementById('logoUpload'),
            logoFileName: document.getElementById('logoFileName'),
            clearLogoBtn: document.getElementById('clearLogoBtn'),
            logoPreviewArea: document.getElementById('logoPreviewArea'),
            logoPreviewImg: document.getElementById('logoPreviewImg'),
            qrPreviewContainer: document.getElementById('qrPreviewContainer'),
            qrCodePreview: document.getElementById('qrCodePreview'),
            previewArea: document.getElementById('previewArea'),
            prevStepBtn: document.getElementById('prevStepBtn'),
            generateBtn: document.getElementById('generateBtn'),
            
            // Modal
            downloadModal: document.getElementById('downloadModal'),
            modalBackdrop: document.getElementById('modalBackdrop'),
            modalQrPreview: document.getElementById('modalQrPreview'),
            downloadPngBtn: document.getElementById('downloadPngBtn'),
            downloadSvgBtn: document.getElementById('downloadSvgBtn'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            closeModalBtnInApp: document.getElementById('closeModalBtnInApp'),
            
            // Download modal hints
            downloadHintNormal: document.getElementById('downloadHintNormal'),
            downloadHintInApp: document.getElementById('downloadHintInApp'),
            downloadButtonsNormal: document.getElementById('downloadButtonsNormal'),
            downloadButtonsInApp: document.getElementById('downloadButtonsInApp'),
            
            // Toast
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toastMessage'),
            
            // Error Box
            errorBox: document.getElementById('errorBox'),
            errorMessage: document.getElementById('errorMessage'),
            
            // Short URL Button
            createShortUrlBtn: document.getElementById('createShortUrlBtn'),
            
            // Register Prompt
            registerPrompt: document.getElementById('registerPrompt'),
            
            // Quick Login Modal
            quickLoginModal: document.getElementById('quickLoginModal'),
            quickLoginBackdrop: document.getElementById('quickLoginBackdrop'),
            quickLoginForm: document.getElementById('quickLoginForm'),
            loginEmail: document.getElementById('loginEmail'),
            loginPassword: document.getElementById('loginPassword'),
            loginError: document.getElementById('loginError'),
            loginErrorMessage: document.getElementById('loginErrorMessage'),
            quickLoginSubmitBtn: document.getElementById('quickLoginSubmitBtn'),
            loginSpinner: document.getElementById('loginSpinner'),
            goToRegisterBtn: document.getElementById('goToRegisterBtn'),
            closeQuickLoginBtn: document.getElementById('closeQuickLoginBtn'),
            
            // Token Expired Modal
            goToDashboardModal: document.getElementById('goToDashboardModal'),
            goToDashboardBackdrop: document.getElementById('goToDashboardBackdrop'),
            closeGoToDashboardBtn: document.getElementById('closeGoToDashboardBtn'),
            
            // Logo Remove Hint
            logoRemoveHint: document.getElementById('logoRemoveHint'),
            
            // Logo Upload Label
            logoUploadLabel: document.getElementById('logoUploadLabel'),
            
            // Background Upload Label
            bgUploadLabel: document.getElementById('bgUploadLabel'),
            
            // Create Short URL Modal
            createShortUrlModal: document.getElementById('createShortUrlModal'),
            createShortUrlBackdrop: document.getElementById('createShortUrlBackdrop'),
            closeCreateShortUrlBtn: document.getElementById('closeCreateShortUrlBtn'),
            createShortUrlForm: document.getElementById('createShortUrlForm'),
            shortUrlDomain: document.getElementById('shortUrlDomain'),
            shortUrlAlias: document.getElementById('shortUrlAlias'),
            aliasInputContainer: document.getElementById('aliasInputContainer'),
            shortUrlTag: document.getElementById('shortUrlTag'),
            shortUrlInputsList: document.getElementById('shortUrlInputsList'),
            toggleUtmBuilderBtn: document.getElementById('toggleUtmBuilderBtn'),
            addSplitUrlBtn: document.getElementById('addSplitUrlBtn'),
            utmBuilderModal: document.getElementById('utmBuilderModal'),
            utmBuilderBackdrop: document.getElementById('utmBuilderBackdrop'),
            closeUtmBuilderBtn: document.getElementById('closeUtmBuilderBtn'),
            utmTargetUrl: document.getElementById('utmTargetUrl'),
            utmSourceSelect: document.getElementById('utmSourceSelect'),
            utmSourceOther: document.getElementById('utmSourceOther'),
            utmMediumSelect: document.getElementById('utmMediumSelect'),
            utmMediumOther: document.getElementById('utmMediumOther'),
            utmCampaign: document.getElementById('utmCampaign'),
            utmContent: document.getElementById('utmContent'),
            utmTerm: document.getElementById('utmTerm'),
            applyUtmBtn: document.getElementById('applyUtmBtn'),
            createShortUrlError: document.getElementById('createShortUrlError'),
            createShortUrlErrorMessage: document.getElementById('createShortUrlErrorMessage'),
            submitCreateShortUrlBtn: document.getElementById('submitCreateShortUrlBtn'),
            createShortUrlSpinner: document.getElementById('createShortUrlSpinner'),

            // SSID Warning Modal
            ssidWarningModal: document.getElementById('ssidWarningModal'),
            ssidWarningContinueBtn: document.getElementById('ssidWarningContinueBtn'),
            ssidWarningBackBtn: document.getElementById('ssidWarningBackBtn'),
        };
    }

    // ==================== QR Code Data Generation ====================
    function getQRCodeData() {
        switch (state.qrType) {
            case 'url':
                return state.url || '';
            case 'wifi':
                return buildWifiString();
            case 'phone':
                return buildPhoneString();
            case 'email':
                return buildEmailString();
            case 'sms':
                return buildSmsString();
            default:
                return state.url || '';
        }
    }

    function buildWifiString() {
        const ssid = state.wifi.ssid;
        const password = state.wifi.password;
        const encryption = state.wifi.encryption;
        
        const escapedSsid = escapeWifiString(ssid);
        const escapedPassword = escapeWifiString(password);
        
        if (encryption === 'nopass') {
            return `WIFI:T:nopass;S:${escapedSsid};;`;
        }
        return `WIFI:T:${encryption};S:${escapedSsid};P:${escapedPassword};;`;
    }

    function buildPhoneString() {
        const countryCode = state.phone.countryCode;
        const phone = state.phone.number.replace(/[\s\-]/g, '').replace(/^0+/, ''); // 移除空格、破折號和開頭的 0
        return `tel:${countryCode}${phone}`;
    }

    function buildEmailString() {
        const email = state.email.address;
        const subject = state.email.subject;
        const body = state.email.body;
        
        let mailto = `mailto:${email}`;
        const params = [];
        
        if (subject) {
            params.push(`subject=${encodeURIComponent(subject)}`);
        }
        if (body) {
            params.push(`body=${encodeURIComponent(body)}`);
        }
        
        if (params.length > 0) {
            mailto += '?' + params.join('&');
        }
        
        return mailto;
    }

    function buildSmsString() {
        const countryCode = state.sms.countryCode;
        const phone = state.sms.phone.replace(/[\s\-]/g, '').replace(/^0+/, ''); // 移除空格、破折號和開頭的 0
        const body = state.sms.body;
        const fullPhone = `${countryCode}${phone}`;
        
        if (body) {
            return `SMSTO:${fullPhone}:${body}`;
        }
        return `SMSTO:${fullPhone}`;
    }

    function escapeWifiString(str) {
        return str.replace(/\\/g, '\\\\')
                  .replace(/;/g, '\\;')
                  .replace(/,/g, '\\,')
                  .replace(/"/g, '\\"')
                  .replace(/:/g, '\\:');
    }
    
    // 檢測是否為移動裝置
    function isMobileDevice() {
        const isNarrowScreen = window.innerWidth <= 768;
        const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        return isNarrowScreen || hasTouchSupport;
    }
    

    // ==================== Image Processing Helpers ====================
    // 為 logo 加上白色背景
    function addWhiteBackgroundToLogo(logoDataUrl, padding = 10) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = Math.max(img.width, img.height) + padding * 2;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                
                // 繪製白色圓角矩形背景
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                const radius = 12;
                ctx.roundRect(0, 0, size, size, radius);
                ctx.fill();
                
                // 將 logo 置中繪製
                const x = (size - img.width) / 2;
                const y = (size - img.height) / 2;
                ctx.drawImage(img, x, y);
                
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(logoDataUrl); // 失敗時返回原圖
            img.src = logoDataUrl;
        });
    }

    // ==================== QR Code Generation ====================
    const QR_DISPLAY_SIZE = 160; // CSS display size (match example images)
    const QR_RENDER_SIZE = 320;  // Render at 2x for HiDPI screens

    async function createQRCode(container, displaySize = QR_DISPLAY_SIZE, renderSize = null) {
        // 預設渲染尺寸為顯示尺寸的 2 倍（支援 Retina 螢幕）
        const actualRenderSize = renderSize || displaySize * 2;
        const qrData = getQRCodeData();
        
        const options = {
            text: qrData,
            size: actualRenderSize,
            margin: 10,
            correctLevel: 3, // H level - 最高容錯 (0=L, 1=M, 2=Q, 3=H)
            colorDark: '#000000',
            colorLight: '#ffffff',
            whiteMargin: true,
            autoColor: false,
            components: {
                data: {
                    scale: 0.5
                },
                timing: {
                    scale: 1,
                    protectors: false
                },
            }
        };

        // Add logo if exists
        if (state.logo) {
            // 如果有背景圖，先幫 logo 加上白色背景
            if (state.background) {
                options.logoImage = await addWhiteBackgroundToLogo(state.logo, 16);
            } else {
                options.logoImage = state.logo;
            }
            options.logoScale = 0.2; // 縮小 logo 提升掃描率
            options.logoMargin = 4;
            options.logoCornerRadius = 8;
        }

        // Add background if exists
        if (state.background) {
            options.backgroundImage = state.background;
        }

        try {
            // Handle different export styles of awesome-qr
            const AwesomeQRClass = window.AwesomeQR?.AwesomeQR || window.AwesomeQR || window.awesomeQR?.AwesomeQR;
            if (!AwesomeQRClass) {
                throw new Error('AwesomeQR library not loaded');
            }
            const qr = new AwesomeQRClass(options);
            const dataUrl = await qr.draw();
            
            // Clear container and add image
            container.innerHTML = '';
            const img = document.createElement('img');
            img.src = dataUrl;
            // 用 CSS 控制顯示尺寸，實際圖片是高解析度
            img.style.width = displaySize + 'px';
            img.style.height = displaySize + 'px';
            img.style.borderRadius = '12px';
            container.appendChild(img);
            
            return { dataUrl, options, renderSize: actualRenderSize };
        } catch (error) {
            console.error('QR Code generation error:', error);
            return null;
        }
    }

    async function updatePreviewQR() {
        if (!elements.qrCodePreview) return;
        
        // Clear and rebuild
        elements.qrCodePreview.innerHTML = '';
        
        // awesome-qr handles background internally, so we just need to call createQRCode
        previewQR = await createQRCode(elements.qrCodePreview);
    }

    // ==================== Step Navigation ====================
    function goToStep(stepNumber) {
        state.currentStep = stepNumber;
        
        if (stepNumber === 1) {
            elements.step1.classList.remove('hidden');
            elements.step2.classList.add('hidden');
        } else if (stepNumber === 2) {
            elements.step1.classList.add('hidden');
            elements.step2.classList.remove('hidden');
            // Generate preview QR code
            updatePreviewQR();
        }
    }

    function handleNextStep() {
        if (!validateCurrentType()) {
            return;
        }
        // 若 WiFi SSID 含非英數字/底線/dash 字元，先彈出相容性警告
        if (state.qrType === 'wifi' && state.wifi.ssid.trim() && !/^[a-zA-Z0-9_-]+$/.test(state.wifi.ssid.trim())) {
            showSsidWarningModal();
            return;
        }
        goToStep(2);
    }

    function handlePrevStep() {
        goToStep(1);
    }

    function validateCurrentType() {
        // 直接從 DOM 讀值，避免貼上後立刻按下一步時 state 尚未同步的 race condition
        state.wifi.ssid = elements.wifiSsidInput.value;
        state.wifi.password = elements.wifiPasswordInput.value;

        const errorInputs = [];
        const customMessages = {};

        switch (state.qrType) {
            case 'url':
                if (!state.url.trim()) {
                    errorInputs.push(elements.urlInput);
                }
                break;
            case 'wifi':
                if (!state.wifi.ssid.trim()) {
                    errorInputs.push(elements.wifiSsidInput);
                }
                // 只有非無密碼的加密方式才需要檢查密碼
                if (state.wifi.encryption !== 'nopass' && !state.wifi.password.trim()) {
                    errorInputs.push(elements.wifiPasswordInput);
                }
                break;
            case 'phone':
                if (!state.phone.number.trim()) {
                    errorInputs.push(elements.phoneInput);
                }
                break;
            case 'email':
                if (!state.email.address.trim()) {
                    errorInputs.push(elements.emailInput);
                }
                if (!state.email.subject.trim()) {
                    errorInputs.push(elements.emailSubject);
                }
                if (!state.email.body.trim()) {
                    errorInputs.push(elements.emailBody);
                }
                break;
            case 'sms':
                if (!state.sms.phone.trim()) {
                    errorInputs.push(elements.smsPhoneInput);
                }
                if (!state.sms.body.trim()) {
                    errorInputs.push(elements.smsBodyInput);
                }
                break;
        }
        
        if (errorInputs.length > 0) {
            showInputErrors(errorInputs, customMessages);
            return false;
        }

        return true;
    }

    // ==================== Tab Switching ====================
    function handleTabSwitch(e) {
        const tab = e.currentTarget;
        const type = tab.dataset.type;
        
        switchToTab(type, true); // true = update hash
    }
    
    function switchToTab(type, updateHash = false) {
        // 驗證 type 是否有效
        const validTypes = ['url', 'wifi', 'phone', 'email', 'sms'];
        if (!validTypes.includes(type)) {
            return;
        }
        
        // 清除錯誤提示
        clearAllInputErrors();
        
        state.qrType = type;
        elements.currentType.textContent = typeNames[type];
        elements.currentTypePreview.textContent = typeNames[type];
        
        // 更新 tab 樣式
        elements.qrTypeTabs.forEach(t => {
            t.classList.remove('active', 'text-lihi-blue', 'border-lihi-blue');
            t.classList.add('text-gray-500', 'border-transparent');
        });
        
        // 找到對應的 tab 並設為 active
        const activeTab = document.querySelector(`.qr-type-tab[data-type="${type}"]`);
        if (activeTab) {
            activeTab.classList.add('active', 'text-lihi-blue', 'border-lihi-blue');
            activeTab.classList.remove('text-gray-500', 'border-transparent');
        }
        
        // 隱藏所有 tab 內容
        const allTabs = [elements.tabUrl, elements.tabWifi, elements.tabPhone, elements.tabEmail, elements.tabSms];
        allTabs.forEach(t => t.classList.add('hidden'));
        
        // 顯示對應的 tab 內容
        switch (type) {
            case 'url':
                elements.tabUrl.classList.remove('hidden');
                break;
            case 'wifi':
                elements.tabWifi.classList.remove('hidden');
                break;
            case 'phone':
                elements.tabPhone.classList.remove('hidden');
                break;
            case 'email':
                elements.tabEmail.classList.remove('hidden');
                break;
            case 'sms':
                elements.tabSms.classList.remove('hidden');
                break;
        }
        
        // 更新 URL hash (不觸發 hashchange 事件的頁面滾動)
        if (updateHash) {
            history.replaceState(null, '', `#${type}`);
        }
    }
    
    function handleHashChange() {
        const hash = window.location.hash.slice(1); // 移除 # 符號
        if (hash) {
            switchToTab(hash, false); // false = 不再更新 hash
        }
    }

    // ==================== Input Handlers ====================
    function handleUrlInput() {
        state.url = elements.urlInput.value;
        updateShortUrlButtonState();
    }
    
    function handleUrlInputBlur() {
        let url = elements.urlInput.value.trim();
        
        // Auto-add https:// if no protocol is specified
        if (url && !url.match(/^https?:\/\//i)) {
            url = 'https://' + url;
            elements.urlInput.value = url;
            state.url = url;
            updateShortUrlButtonState();
        }
    }
    
    // ==================== Short URL Button State ====================
    function updateShortUrlButtonState() {
        if (!elements.createShortUrlBtn) return;
        
        // If current URL is the same as the last generated short URL, disable the button
        if (state.lastShortUrl && state.url === state.lastShortUrl) {
            setShortUrlButtonEnabled(false, '已產生短網址');
        } else {
            setShortUrlButtonEnabled(true, '產生短網址');
        }
    }
    
    function setShortUrlButtonEnabled(enabled, text) {
        if (!elements.createShortUrlBtn) return;
        
        elements.createShortUrlBtn.disabled = !enabled;
        elements.createShortUrlBtn.textContent = text;
        
        if (enabled) {
            elements.createShortUrlBtn.classList.remove('bg-gray-300', 'cursor-not-allowed', 'hover:bg-gray-300');
            elements.createShortUrlBtn.classList.add('bg-lihi-blue', 'hover:bg-lihi-blue/90');
        } else {
            elements.createShortUrlBtn.classList.remove('bg-lihi-blue', 'hover:bg-lihi-blue/90');
            elements.createShortUrlBtn.classList.add('bg-gray-300', 'cursor-not-allowed', 'hover:bg-gray-300');
        }
    }

    function handleWifiSsidInput() {
        state.wifi.ssid = elements.wifiSsidInput.value;
    }

    function handleWifiPasswordInput() {
        state.wifi.password = elements.wifiPasswordInput.value;
    }

    function handleWifiEncryptionChange() {
        state.wifi.encryption = elements.wifiEncryption.value;
        
        // 根據加密方式來控制密碼欄位的狀態
        if (state.wifi.encryption === 'nopass') {
            // 無密碼時，禁用密碼欄位並清空密碼
            elements.wifiPasswordRequired.classList.add('hidden');
            elements.wifiPasswordInput.value = '';
            elements.wifiPasswordInput.disabled = true;
            elements.wifiPasswordInput.classList.add('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
            elements.wifiPasswordInput.placeholder = '無需密碼';
            elements.toggleWifiPassword.disabled = true;
            elements.toggleWifiPassword.classList.add('opacity-50', 'cursor-not-allowed');
            state.wifi.password = '';
        } else {
            // 其他加密方式時，啟用密碼欄位
            elements.wifiPasswordRequired.classList.remove('hidden');
            elements.wifiPasswordInput.disabled = false;
            elements.wifiPasswordInput.classList.remove('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
            elements.wifiPasswordInput.placeholder = '輸入 WiFi 密碼';
            elements.toggleWifiPassword.disabled = false;
            elements.toggleWifiPassword.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    function handleToggleWifiPassword() {
        const input = elements.wifiPasswordInput;
        const eyeOpen = elements.toggleWifiPassword.querySelector('.eye-open');
        const eyeClosed = elements.toggleWifiPassword.querySelector('.eye-closed');
        
        if (input.type === 'password') {
            input.type = 'text';
            eyeOpen.classList.add('hidden');
            eyeClosed.classList.remove('hidden');
        } else {
            input.type = 'password';
            eyeOpen.classList.remove('hidden');
            eyeClosed.classList.add('hidden');
        }
    }

    function handlePhoneCountryCodeChange() {
        state.phone.countryCode = elements.phoneCountryCode.value;
    }

    function handlePhoneInput() {
        state.phone.number = elements.phoneInput.value;
    }

    function handleEmailInput() {
        state.email.address = elements.emailInput.value;
    }

    function handleEmailSubjectInput() {
        state.email.subject = elements.emailSubject.value;
    }

    function handleEmailBodyInput() {
        state.email.body = elements.emailBody.value;
    }

    function handleSmsCountryCodeChange() {
        state.sms.countryCode = elements.smsCountryCode.value;
    }

    function handleSmsPhoneInput() {
        state.sms.phone = elements.smsPhoneInput.value;
    }

    function handleSmsBodyInput() {
        state.sms.body = elements.smsBodyInput.value;
    }

    // ==================== File Uploads ====================
    function handleBgUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                state.background = event.target.result;
                state.bgFileName = file.name;
                if (elements.bgFileName) {
                    elements.bgFileName.textContent = file.name;
                }
                if (elements.clearBgBtn) {
                    elements.clearBgBtn.classList.remove('hidden');
                }
                
                updatePreviewQR();
                
                showToast('背景圖片已套用');
            };
            reader.readAsDataURL(file);
        }
    }

    function handleClearBg() {
        state.background = null;
        state.bgFileName = '';
        if (elements.bgFileName) {
            elements.bgFileName.textContent = '未選擇任何檔案';
        }
        if (elements.bgUpload) {
            elements.bgUpload.value = '';
        }
        if (elements.clearBgBtn) {
            elements.clearBgBtn.classList.add('hidden');
        }
        
        updatePreviewQR();
        
        showToast('背景圖片已清除');
    }

    function handleLogoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const token = getStoredToken();
        if (!token) {
            e.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            state.logo = event.target.result;
            state.logoFileName = file.name;
            state.isDefaultLogo = false;
            elements.logoFileName.textContent = file.name;
            elements.clearLogoBtn.classList.remove('hidden');
            
            if (elements.logoPreviewArea && elements.logoPreviewImg) {
                elements.logoPreviewImg.src = event.target.result;
                elements.logoPreviewArea.classList.remove('hidden');
            }
            
            updatePreviewQR();
            showToast('Logo 已套用');
        };
        reader.readAsDataURL(file);
    }

    function handleClearLogo() {
        const token = getStoredToken();
        
        if (!token) {
            showToast('如果要變更或移除 lihi logo，請註冊');
            return;
        }
        
        // 有 token，允許清除 logo
        state.logo = null;
        state.logoFileName = '';
        state.isDefaultLogo = false;
        elements.logoFileName.textContent = '未選擇任何檔案';
        elements.logoUpload.value = '';
        elements.clearLogoBtn.classList.add('hidden');
        
        // Hide logo preview
        if (elements.logoPreviewArea && elements.logoPreviewImg) {
            elements.logoPreviewImg.src = '';
            elements.logoPreviewArea.classList.add('hidden');
        }
        
        // 更新提示文字（已登入時可以移除 logo）
        updateLogoRemoveHint();
        
        updatePreviewQR();
        
        showToast('Logo 已清除');
    }
    
    // 更新 logo 相關 UI 狀態（提示文字、上傳按鈕、清除按鈕）
    function updateLogoRemoveHint() {
        const hintElement = elements?.logoRemoveHint || document.getElementById('logoRemoveHint');
        // 用「有沒有 token」判斷，不管過期（過期時操作會嘗試刷新）
        const hasToken = !!localStorage.getItem(JWT_STORAGE_KEY);
        
        // 更新提示文字
        if (hintElement) {
            if (hasToken) {
                // 有登入過，隱藏提示
                hintElement.classList.add('hidden');
            } else {
                // 從未登入，顯示需要註冊才能移除的提示
                hintElement.classList.remove('hidden');
                hintElement.innerHTML = '如果要變更或移除 lihi logo，<a href="https://app.lihi.io/admin/register" class="text-lihi-blue hover:underline">請註冊</a>';
            }
        }
        
        // 更新上傳 Logo 按鈕狀態
        updateLogoUploadState(hasToken);
    }
    
    // 更新 Logo 上傳和清除按鈕的啟用/禁用狀態
    function updateLogoUploadState(enabled) {
        const logoUploadLabel = elements.logoUploadLabel || elements.logoUpload?.parentElement;
        
        if (elements.logoUpload) {
            elements.logoUpload.disabled = !enabled;
        }
        
        if (logoUploadLabel) {
            if (enabled) {
                logoUploadLabel.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
                logoUploadLabel.classList.add('cursor-pointer');
            } else {
                logoUploadLabel.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
                logoUploadLabel.classList.remove('cursor-pointer');
            }
        }
        
        if (elements.clearLogoBtn) {
            if (enabled) {
                elements.clearLogoBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                elements.clearLogoBtn.disabled = false;
                elements.clearLogoBtn.title = '清除 Logo';
            } else {
                elements.clearLogoBtn.classList.add('opacity-50', 'cursor-not-allowed');
                elements.clearLogoBtn.disabled = false; // 保持可點擊，以便顯示提示
                elements.clearLogoBtn.title = '需要登入後台才能清除 Logo';
            }
        }
    }
    
    // ==================== Clear Form ====================
    async function handleClear() {
        const defaultCountryCode = state.detectedCountryCode || '+886';
        
        state.url = '';
        state.wifi = { ssid: '', password: '', encryption: 'WPA' };
        state.phone = { countryCode: defaultCountryCode, number: '' };
        state.email = { address: '', subject: '', body: '' };
        state.sms = { countryCode: defaultCountryCode, phone: '', body: '' };
        state.lastShortenedUrl = '';
        state.lastShortUrl = '';
        
        elements.urlInput.value = '';
        elements.wifiSsidInput.value = '';
        elements.wifiPasswordInput.value = '';
        elements.wifiEncryption.value = 'WPA';
        elements.phoneCountryCode.value = defaultCountryCode;
        elements.phoneInput.value = '';
        elements.emailInput.value = '';
        elements.emailSubject.value = '';
        elements.emailBody.value = '';
        elements.smsCountryCode.value = defaultCountryCode;
        elements.smsPhoneInput.value = '';
        elements.smsBodyInput.value = '';
        
        // 重置短網址按鈕狀態
        updateShortUrlButtonState();
        
        // 重新載入預設 logo
        await loadDefaultLogo();
        
        showToast('已清空所有欄位');
    }

    // ==================== Generate & Download ====================
    async function handleGenerate() {
        const modalSize = 240;
        const isMobile = isMobileDevice();
        
        elements.modalQrPreview.innerHTML = '';
        
        // 行動裝置：顯示長按提示（存到相簿用）
        // 桌面：只顯示下載按鈕
        if (isMobile) {
            elements.downloadHintInApp.classList.remove('hidden');
        } else {
            elements.downloadHintInApp.classList.add('hidden');
        }
        
        // 永遠顯示下載按鈕
        elements.downloadHintNormal.classList.remove('hidden');
        elements.downloadButtonsNormal.classList.remove('hidden');
        elements.downloadButtonsInApp.classList.add('hidden');
        
        // 使用高解析度 img 讓行動裝置可以長按保存
        const highResSize = 600;
        const downloadContainer = document.createElement('div');
        const result = await createQRCode(downloadContainer, highResSize, highResSize);
        
        if (result && result.dataUrl) {
            const img = document.createElement('img');
            img.src = result.dataUrl;
            img.style.cssText = `
                width: ${modalSize}px;
                height: ${modalSize}px;
                border-radius: 12px;
                -webkit-touch-callout: default;
                -webkit-user-select: auto;
                user-select: auto;
            `;
            img.alt = 'QR Code';
            elements.modalQrPreview.appendChild(img);
        }
        
        downloadQR = result;
        
        // Show modal
        elements.downloadModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    async function handleDownloadPng() {
        try {
            showToast('正在生成 PNG...');
            
            const size = 1000; // 高解析度下載
            
            // Generate high-res QR code (displaySize 和 renderSize 相同，不需 CSS 縮放)
            const downloadContainer = document.createElement('div');
            const result = await createQRCode(downloadContainer, size, size);
            
            if (result && result.dataUrl) {
                // Download the data URL as PNG
                const a = document.createElement('a');
                a.href = result.dataUrl;
                a.download = 'qrcode.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                showToast('PNG 下載完成');
            } else {
                showToast('下載失敗，請重試');
            }
        } catch (error) {
            console.error('Download error:', error);
            showToast('下載失敗，請重試');
        }
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    async function handleDownloadSvg() {
        try {
            showToast('正在生成 SVG...');
            
            const size = 1000; // 高解析度下載
            
            // Generate high-res QR code (displaySize 和 renderSize 相同，不需 CSS 縮放)
            const downloadContainer = document.createElement('div');
            const result = await createQRCode(downloadContainer, size, size);
            
            if (result && result.dataUrl) {
                // Convert PNG data URL to SVG with embedded image
                const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <image xlink:href="${result.dataUrl}" x="0" y="0" width="${size}" height="${size}"/>
</svg>`;
                
                // Download SVG
                const blob = new Blob([svg], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'qrcode.svg';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showToast('SVG 下載完成');
            } else {
                showToast('下載失敗，請重試');
            }
        } catch (error) {
            console.error('Download error:', error);
            showToast('下載失敗，請重試');
        }
    }

    // ==================== Modal ====================
    function closeModal() {
        elements.downloadModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // ==================== Toast ====================
    function showToast(message) {
        elements.toastMessage.textContent = message;
        elements.toast.classList.add('show');
        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 2500);
    }
    
    // ==================== Error Handling ====================
    const errorMessages = {
        urlInput: '請輸入網址',
        wifiSsidInput: '請輸入 WiFi 名稱',
        wifiPasswordInput: '請輸入 WiFi 密碼',
        phoneInput: '請輸入電話號碼',
        emailInput: '請輸入收件人信箱',
        emailSubject: '請輸入郵件主旨',
        emailBody: '請輸入郵件內容',
        smsPhoneInput: '請輸入電話號碼',
        smsBodyInput: '請輸入簡訊內容'
    };
    
    function showInputErrors(inputElements, customMessages = {}) {
        // Remove error from all inputs first
        clearAllInputErrors();

        if (!inputElements || inputElements.length === 0) return;

        // Build error messages
        const messages = inputElements.map(input => {
            const inputId = input.id;
            const message = customMessages[inputId] || errorMessages[inputId] || '請填寫此欄位';
            // Add error class to the input
            input.classList.add('input-error');
            return '• ' + message;
        });
        
        // Show error box with all messages
        elements.errorMessage.innerHTML = messages.join('<br>');
        elements.errorBox.classList.remove('hidden');
        
        // Focus the first error input
        inputElements[0].focus();
    }
    
    function clearAllInputErrors() {
        const allInputs = document.querySelectorAll('input, textarea, select');
        allInputs.forEach(input => {
            input.classList.remove('input-error');
        });
        
        // Hide error box
        if (elements.errorBox) {
            elements.errorBox.classList.add('hidden');
        }
    }

    // ==================== JWT Token Management ====================
    function isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // exp 是秒級的 Unix timestamp，預留 60 秒緩衝避免邊界情況
            return payload.exp * 1000 < Date.now() - 60000;
        } catch (e) {
            // 解析失敗視為過期
            return true;
        }
    }

    function getStoredToken() {
        return localStorage.getItem(JWT_STORAGE_KEY);
    }

    /**
     * 取得有效 token（統一處理各種狀態）
     * 
     * Token 狀態流程：
     * - 沒有 token → 直接跳轉後台，返回 null
     * - 有效 token → 直接返回 token
     * - 過期 token + 有效 session → 刷新成功，顯示「已自動登入」，返回新 token
     * - 過期 token + 刷新失敗 → 顯示驗證過期 modal，返回 null
     */
    async function getValidToken() {
        const rawToken = localStorage.getItem(JWT_STORAGE_KEY);
        
        // 沒有 token → 直接跳轉後台
        if (!rawToken) {
            window.location.href = 'https://app.lihi.io/admin/dashboard';
            return null;
        }
        
        // Token 有效 → 直接返回
        if (!isTokenExpired(rawToken)) {
            return rawToken;
        }
        
        // Token 過期，嘗試透過 session 刷新
        clearToken();
        const newToken = await handleSessionAuth();
        
        if (newToken) {
            // 刷新成功（handleSessionAuth 已顯示「已自動登入」toast）
            return newToken;
        }
        
        // 刷新失敗 → 顯示驗證過期 modal
        showTokenExpiredModal();
        return null;
    }

    function storeToken(token) {
        localStorage.setItem(JWT_STORAGE_KEY, token);
    }

    function clearToken() {
        localStorage.removeItem(JWT_STORAGE_KEY);
    }

    // ==================== Quick Login Modal ====================
    let quickLoginResolver = null;

    function showQuickLoginModal() {
        return new Promise((resolve) => {
            quickLoginResolver = resolve;
            
            // 清空表單
            elements.loginEmail.value = '';
            elements.loginPassword.value = '';
            elements.loginError.classList.add('hidden');
            
            // 顯示 Modal
            elements.quickLoginModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // Focus email input
            setTimeout(() => elements.loginEmail.focus(), 100);
        });
    }

    function closeQuickLoginModal(result = { success: false, action: 'cancel' }) {
        elements.quickLoginModal.classList.add('hidden');
        document.body.style.overflow = '';
        
        if (quickLoginResolver) {
            quickLoginResolver(result);
            quickLoginResolver = null;
        }
    }

    function showLoginError(message) {
        elements.loginErrorMessage.textContent = message;
        elements.loginError.classList.remove('hidden');
    }

    // ==================== Token Expired Modal ====================
    function showTokenExpiredModal() {
        elements.goToDashboardModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeGoToDashboardModal() {
        elements.goToDashboardModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // ==================== Create Short URL Modal ====================
    function showCreateShortUrlModal() {
        // Reset form
        resetCreateShortUrlForm();
        
        // Show modal
        elements.createShortUrlModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Pre-fill URL from main input if available
        const mainUrlInput = elements.urlInput.value.trim();
        if (mainUrlInput) {
            const firstInput = elements.shortUrlInputsList.querySelector('.short-url-input');
            if (firstInput) {
                firstInput.value = mainUrlInput;
                updateUtmTargetOptions();
            }
        }
        
        // Fetch available domains
        fetchAvailableDomains();
        
        // Fetch UTM options (sources and mediums)
        fetchUtmOptions();
    }
    
    function closeCreateShortUrlModal() {
        elements.createShortUrlModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    function resetCreateShortUrlForm() {
        // Show form
        elements.createShortUrlForm.classList.remove('hidden');
        
        // Reset form fields
        elements.shortUrlTag.value = '';
        elements.shortUrlAlias.value = '';
        elements.aliasInputContainer.classList.add('hidden'); // Hide alias input by default
        elements.shortUrlInputsList.innerHTML = `
            <div class="short-url-input-row flex items-center gap-2">
                <input 
                    type="text" 
                    class="short-url-input flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lihi-blue/20 focus:border-lihi-blue outline-none transition-all"
                    placeholder="https://example.com"
                >
            </div>
        `;
        
        // Reset UTM builder
        elements.utmBuilderModal.classList.add('hidden');
        elements.utmSourceSelect.value = '';
        elements.utmSourceOther.value = '';
        elements.utmSourceOther.classList.add('hidden');
        elements.utmMediumSelect.value = '';
        elements.utmMediumOther.value = '';
        elements.utmMediumOther.classList.add('hidden');
        elements.utmCampaign.value = '';
        elements.utmContent.value = '';
        elements.utmTerm.value = '';
        
        // Reset error
        elements.createShortUrlError.classList.add('hidden');
        
        // Bind input events
        bindShortUrlInputEvents();
    }
    
    function bindShortUrlInputEvents() {
        const inputs = elements.shortUrlInputsList.querySelectorAll('.short-url-input');
        inputs.forEach(input => {
            input.removeEventListener('input', updateUtmTargetOptions);
            input.addEventListener('input', updateUtmTargetOptions);
            input.removeEventListener('blur', autoAddHttpsToInput);
            input.addEventListener('blur', autoAddHttpsToInput);
        });
    }
    
    async function fetchAvailableDomains() {
        const token = await getValidToken();
        if (!token) return;
        
        try {
            const response = await fetch(API_BASE + '/api/site', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });
            
            const data = await response.json();
            
            if (data.domains && Array.isArray(data.domains)) {
                state.availableDomains = data.domains;
                updateDomainSelect();
            }
            
            // 獲取 force_lower 設定
            if (data.force_lower !== undefined) {
                state.forceLower = data.force_lower;
            }
        } catch (error) {
            console.error('Failed to fetch domains:', error);
        }
    }
    
    async function fetchUtmOptions() {
        const token = await getValidToken();
        if (!token) return;
        
        try {
            const response = await fetch(API_BASE + '/api/utmOption', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });
            
            const data = await response.json();
            
            // 儲存 UTM sources 和 mediums
            if (data.utm_sources && Array.isArray(data.utm_sources)) {
                state.utmSources = data.utm_sources;
                updateUtmSourceOptions();
            }
            
            if (data.utm_mediums && Array.isArray(data.utm_mediums)) {
                state.utmMediums = data.utm_mediums;
                updateUtmMediumOptions();
            }
        } catch (error) {
            console.error('Failed to fetch UTM options:', error);
        }
    }
    
    function updateUtmSourceOptions() {
        if (!elements.utmSourceSelect || state.utmSources.length === 0) return;
        
        // 保存當前選中的值
        const currentValue = elements.utmSourceSelect.value;
        
        // 獲取現有的所有選項值（排除 "other"）
        const existingValues = new Set();
        const options = Array.from(elements.utmSourceSelect.options);
        options.forEach(option => {
            if (option.value && option.value !== 'other') {
                existingValues.add(option.value);
            }
        });
        
        // 找到 "other" 選項的位置，在它之前插入用戶自定義選項
        const otherOption = options.find(opt => opt.value === 'other');
        
        // 添加用戶自定義的 source 選項（只添加不存在的）
        state.utmSources.forEach(source => {
            if (!existingValues.has(source.value)) {
                const option = document.createElement('option');
                option.value = source.value;
                option.textContent = source.value;
                
                // 在 "other" 之前插入
                if (otherOption) {
                    elements.utmSourceSelect.insertBefore(option, otherOption);
                } else {
                    elements.utmSourceSelect.appendChild(option);
                }
            }
        });
        
        // 恢復之前的選中值
        if (currentValue) {
            elements.utmSourceSelect.value = currentValue;
        }
    }
    
    function updateUtmMediumOptions() {
        if (!elements.utmMediumSelect || state.utmMediums.length === 0) return;
        
        // 保存當前選中的值
        const currentValue = elements.utmMediumSelect.value;
        
        // 獲取現有的所有選項值（排除 "other"）
        const existingValues = new Set();
        const options = Array.from(elements.utmMediumSelect.options);
        options.forEach(option => {
            if (option.value && option.value !== 'other') {
                existingValues.add(option.value);
            }
        });
        
        // 找到 "other" 選項的位置，在它之前插入用戶自定義選項
        const otherOption = options.find(opt => opt.value === 'other');
        
        // 添加用戶自定義的 medium 選項（只添加不存在的）
        state.utmMediums.forEach(medium => {
            if (!existingValues.has(medium.value)) {
                const option = document.createElement('option');
                option.value = medium.value;
                option.textContent = medium.value;
                
                // 在 "other" 之前插入
                if (otherOption) {
                    elements.utmMediumSelect.insertBefore(option, otherOption);
                } else {
                    elements.utmMediumSelect.appendChild(option);
                }
            }
        });
        
        // 恢復之前的選中值
        if (currentValue) {
            elements.utmMediumSelect.value = currentValue;
        }
    }
    
    function updateDomainSelect() {
        elements.shortUrlDomain.innerHTML = '';
        
        if (state.availableDomains.length === 0) {
            elements.shortUrlDomain.innerHTML = '<option value="lihi.cc">lihi.cc</option>';
            updateAliasInputVisibility();
            return;
        }
        
        state.availableDomains.forEach(domain => {
            const option = document.createElement('option');
            option.value = domain.id || domain.name;
            option.textContent = domain.name;
            elements.shortUrlDomain.appendChild(option);
        });
        
        // Update alias input visibility based on first selected domain
        updateAliasInputVisibility();
    }
    
    // Check if domain value is numeric (custom domain)
    function isCustomDomain(domainValue) {
        return !isNaN(domainValue) && !isNaN(parseFloat(domainValue));
    }
    
    // Handle domain selection change
    function handleDomainChange() {
        updateAliasInputVisibility();
    }
    
    // Update alias input visibility based on selected domain
    function updateAliasInputVisibility() {
        const selectedValue = elements.shortUrlDomain.value;
        const isCustom = isCustomDomain(selectedValue);
        
        if (isCustom) {
            elements.aliasInputContainer.classList.remove('hidden');
        } else {
            elements.aliasInputContainer.classList.add('hidden');
            elements.shortUrlAlias.value = ''; // Clear alias when hiding
        }
    }
    
    function addSplitUrl() {
        const newRow = document.createElement('div');
        newRow.className = 'short-url-input-row flex items-center gap-2';
        newRow.innerHTML = `
            <input 
                type="text" 
                class="short-url-input flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lihi-blue/20 focus:border-lihi-blue outline-none transition-all"
                placeholder="https://example.com"
            >
            <button type="button" class="remove-url-btn p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;
        
        elements.shortUrlInputsList.appendChild(newRow);
        
        // Bind events
        const removeBtn = newRow.querySelector('.remove-url-btn');
        removeBtn.addEventListener('click', () => {
            newRow.remove();
            updateUtmTargetOptions();
        });
        
        const input = newRow.querySelector('.short-url-input');
        input.addEventListener('input', updateUtmTargetOptions);
        input.addEventListener('blur', autoAddHttpsToInput);
        input.focus();
        
        updateUtmTargetOptions();
    }
    
    // Auto-add https:// when user leaves the input field
    function autoAddHttpsToInput(event) {
        const input = event.target;
        let url = input.value.trim();
        
        console.log('blur triggered, url:', url); // Debug log
        
        if (url && !url.match(/^https?:\/\//i)) {
            input.value = 'https://' + url;
            console.log('added https, new value:', input.value); // Debug log
            updateUtmTargetOptions();
        }
    }
    
    function toggleUtmBuilder() {
        const inputs = elements.shortUrlInputsList.querySelectorAll('.short-url-input');
        const urls = [];
        let hasInvalidUrl = false;
        
        inputs.forEach((input) => {
            let url = input.value.trim();
            if (url) {
                // Auto-add https:// if no protocol is specified (in case blur didn't trigger)
                if (!url.match(/^https?:\/\//i)) {
                    url = 'https://' + url;
                    input.value = url; // Update the input field with the corrected URL
                }
                
                urls.push(url);
                // Check if URL is valid
                try {
                    const urlObj = new URL(url);
                    if (!urlObj.protocol.startsWith('http')) {
                        hasInvalidUrl = true;
                    }
                } catch (e) {
                    hasInvalidUrl = true;
                }
            }
        });
        
        // Check if there are no URLs entered
        if (urls.length === 0) {
            showCreateShortUrlError('請先輸入至少一個網址');
            return;
        }
        
        // Check if any URL is invalid
        if (hasInvalidUrl) {
            showCreateShortUrlError('網址格式不正確');
            return;
        }
        
        // Clear any previous error and open modal
        elements.createShortUrlError.classList.add('hidden');
        elements.utmBuilderModal.classList.remove('hidden');
        updateUtmTargetOptions();
    }
    
    function closeUtmBuilderModal() {
        elements.utmBuilderModal.classList.add('hidden');
    }
    
    function updateUtmTargetOptions() {
        const inputs = elements.shortUrlInputsList.querySelectorAll('.short-url-input');
        const urls = [];
        
        inputs.forEach((input, index) => {
            const url = input.value.trim();
            if (url) {
                urls.push({ index, url });
            }
        });
        
        elements.utmTargetUrl.innerHTML = '';
        
        if (urls.length === 0) {
            elements.utmTargetUrl.innerHTML = '<option value="">請先輸入網址</option>';
            return;
        }
        
        urls.forEach(({ index, url }) => {
            const option = document.createElement('option');
            option.value = index;
            const displayUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;
            option.textContent = `網址 ${index + 1}: ${displayUrl}`;
            elements.utmTargetUrl.appendChild(option);
        });
    }
    
    function handleUtmSourceChange() {
        if (elements.utmSourceSelect.value === 'other') {
            elements.utmSourceOther.classList.remove('hidden');
            elements.utmSourceOther.focus();
        } else {
            elements.utmSourceOther.classList.add('hidden');
            elements.utmSourceOther.value = '';
        }
    }
    
    function handleUtmMediumChange() {
        if (elements.utmMediumSelect.value === 'other') {
            elements.utmMediumOther.classList.remove('hidden');
            elements.utmMediumOther.focus();
        } else {
            elements.utmMediumOther.classList.add('hidden');
            elements.utmMediumOther.value = '';
        }
    }
    
    // Handle UTM input field changes - apply force lowercase if enabled
    function handleUtmInputChange(event) {
        if (!state.forceLower) return;
        
        const input = event.target;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        
        // Convert to lowercase
        const newValue = input.value.toLowerCase();
        
        // Only update if value changed to avoid infinite loop
        if (input.value !== newValue) {
            input.value = newValue;
            // Restore cursor position
            input.setSelectionRange(start, end);
        }
    }
    
    function applyUtmParams() {
        const targetIndex = parseInt(elements.utmTargetUrl.value);
        const inputs = elements.shortUrlInputsList.querySelectorAll('.short-url-input');
        const targetInput = inputs[targetIndex];
        
        if (!targetInput || !targetInput.value.trim()) {
            showCreateShortUrlError('請選擇要套用 UTM 的目標網址');
            return;
        }
        
        let url = targetInput.value.trim();
        
        // Get UTM values
        const source = elements.utmSourceSelect.value === 'other' 
            ? elements.utmSourceOther.value.trim() 
            : elements.utmSourceSelect.value;
        const medium = elements.utmMediumSelect.value === 'other' 
            ? elements.utmMediumOther.value.trim() 
            : elements.utmMediumSelect.value;
        const campaign = elements.utmCampaign.value.trim();
        const content = elements.utmContent.value.trim();
        const term = elements.utmTerm.value.trim();
        
        // Apply force lower case if user setting is enabled
        const processUtmValue = (value) => {
            if (!value) return value;
            return state.forceLower ? value.toLowerCase() : value;
        };
        
        const finalSource = processUtmValue(source);
        const finalMedium = processUtmValue(medium);
        const finalCampaign = processUtmValue(campaign);
        const finalContent = processUtmValue(content);
        const finalTerm = processUtmValue(term);
        
        // Build UTM params
        const utmParams = [];
        if (finalSource) utmParams.push(`utm_source=${encodeURIComponent(finalSource)}`);
        if (finalMedium) utmParams.push(`utm_medium=${encodeURIComponent(finalMedium)}`);
        if (finalCampaign) utmParams.push(`utm_campaign=${encodeURIComponent(finalCampaign)}`);
        if (finalContent) utmParams.push(`utm_content=${encodeURIComponent(finalContent)}`);
        if (finalTerm) utmParams.push(`utm_term=${encodeURIComponent(finalTerm)}`);
        
        if (utmParams.length === 0) {
            showCreateShortUrlError('請至少填寫一個 UTM 參數');
            return;
        }
        
        // Parse and update URL
        try {
            const urlObj = new URL(url);
            utmParams.forEach(param => {
                const [key, value] = param.split('=');
                urlObj.searchParams.set(key, decodeURIComponent(value));
            });
            targetInput.value = urlObj.toString();
            
            elements.createShortUrlError.classList.add('hidden');
            closeUtmBuilderModal();
            showToast('UTM 參數已套用');
        } catch (e) {
            showCreateShortUrlError('網址格式不正確，請輸入完整的網址（包含 http:// 或 https://）');
        }
    }
    
    function showCreateShortUrlError(message) {
        elements.createShortUrlErrorMessage.textContent = message;
        elements.createShortUrlError.classList.remove('hidden');
    }
    
    function setCreateShortUrlLoading(loading) {
        if (loading) {
            elements.submitCreateShortUrlBtn.disabled = true;
            elements.createShortUrlSpinner.classList.remove('hidden');
        } else {
            elements.submitCreateShortUrlBtn.disabled = false;
            elements.createShortUrlSpinner.classList.add('hidden');
        }
    }
    
    async function handleCreateShortUrlSubmit(e) {
        e.preventDefault();
        
        // Get URLs
        const inputs = elements.shortUrlInputsList.querySelectorAll('.short-url-input');
        const urls = {};
        let hasValidUrl = false;
        
        inputs.forEach((input, index) => {
            const url = input.value.trim();
            if (url) {
                // Validate URL
                try {
                    new URL(url);
                    urls[index + 1] = url;
                    hasValidUrl = true;
                    input.classList.remove('border-red-500');
                } catch (e) {
                    input.classList.add('border-red-500');
                }
            }
        });
        
        if (!hasValidUrl) {
            showCreateShortUrlError('請輸入至少一個有效的網址');
            return;
        }
        
        elements.createShortUrlError.classList.add('hidden');
        setCreateShortUrlLoading(true);
        
        const token = await getValidToken();
        if (!token) {
            setCreateShortUrlLoading(false);
            return;
        }
        
        try {
            const requestBody = {
                urls: urls,
                domain: elements.shortUrlDomain.value
            };
            
            // Add alias if provided (only for custom domains)
            const alias = elements.shortUrlAlias.value.trim();
            if (alias && isCustomDomain(elements.shortUrlDomain.value)) {
                requestBody.alias = alias;
            }
            
            // Add tag if provided
            const tag = elements.shortUrlTag.value.trim();
            if (tag) {
                requestBody.tags = tag;
            }
            
            const response = await fetch(API_BASE + '/api/site', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            if (data.result === 'success' && data.url) {
                // Success
                state.createdShortUrlResult = data.url;
                showCreateShortUrlSuccess(data.url);
            } else {
                // Handle error
                if (data.msg && (data.msg.includes('login') || data.msg.includes('Token'))) {
                    clearToken();
                    showCreateShortUrlError('登入狀態已過期，請重新登入');
                } else {
                    showCreateShortUrlError(data.msg || '建立短網址失敗，請稍後再試');
                }
            }
        } catch (error) {
            console.error('Create short URL error:', error);
            showCreateShortUrlError('建立短網址失敗，請稍後再試');
        } finally {
            setCreateShortUrlLoading(false);
        }
    }
    
    function showCreateShortUrlSuccess(shortUrl) {
        // Put the short URL into the main URL input field
        elements.urlInput.value = shortUrl;
        state.url = shortUrl;
        state.lastShortenedUrl = shortUrl;
        state.lastShortUrl = shortUrl;
        updateShortUrlButtonState();
        updatePreviewQR();
        
        // Close the modal
        closeCreateShortUrlModal();
        
        // Show toast
        showToast('短網址已產生！');
    }
    

    function setLoginLoading(loading) {
        if (loading) {
            elements.quickLoginSubmitBtn.disabled = true;
            elements.loginSpinner.classList.remove('hidden');
        } else {
            elements.quickLoginSubmitBtn.disabled = false;
            elements.loginSpinner.classList.add('hidden');
        }
    }

    // ==================== API Calls ====================
    async function apiLogin(email, password) {
        const response = await fetch(API_BASE + '/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        return data;
    }

    async function createShortUrlAPI(url, token) {
        const response = await fetch(API_BASE + '/api/site', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + token,
            },
            body: JSON.stringify({ urls: { 1: url } }),
        });
        
        const data = await response.json();
        return data;
    }

    // ==================== Short URL Button Handler ====================
    async function handleCreateShortUrlClick() {
        const token = await getValidToken();
        
        if (!token) return;
        
        // 已登入：打開 Create Short URL Modal
        showCreateShortUrlModal();
    }

    async function handleQuickLoginSubmit(e) {
        e.preventDefault();
        
        const email = elements.loginEmail.value.trim();
        const password = elements.loginPassword.value;
        
        if (!email || !password) {
            showLoginError('請輸入 Email 和密碼');
            return;
        }
        
        setLoginLoading(true);
        elements.loginError.classList.add('hidden');
        
        try {
            const result = await apiLogin(email, password);
            
            if (result.result === true && result.token) {
                // 登入成功
                closeQuickLoginModal({ success: true, token: result.token });
            } else {
                // 登入失敗
                showLoginError(result.msg || '登入失敗，請檢查 Email 和密碼');
            }
        } catch (error) {
            console.error('Login error:', error);
            showLoginError('登入失敗，請稍後再試');
        } finally {
            setLoginLoading(false);
        }
    }

    // ==================== Event Binding ====================
    function bindEvents() {
        // Tab switching
        elements.qrTypeTabs.forEach(tab => {
            tab.addEventListener('click', handleTabSwitch);
        });
        
        // URL input
        elements.urlInput.addEventListener('input', handleUrlInput);
        elements.urlInput.addEventListener('input', () => clearAllInputErrors());
        elements.urlInput.addEventListener('blur', handleUrlInputBlur);
        
        // WiFi inputs
        elements.wifiSsidInput.addEventListener('input', handleWifiSsidInput);
        elements.wifiSsidInput.addEventListener('input', () => clearAllInputErrors());
        elements.wifiPasswordInput.addEventListener('input', handleWifiPasswordInput);
        elements.wifiPasswordInput.addEventListener('input', () => clearAllInputErrors());
        elements.wifiEncryption.addEventListener('change', handleWifiEncryptionChange);
        elements.toggleWifiPassword.addEventListener('click', handleToggleWifiPassword);
        
        // Phone input
        elements.phoneCountryCode.addEventListener('change', handlePhoneCountryCodeChange);
        elements.phoneInput.addEventListener('input', handlePhoneInput);
        elements.phoneInput.addEventListener('input', () => clearAllInputErrors());
        
        // Email inputs
        elements.emailInput.addEventListener('input', handleEmailInput);
        elements.emailInput.addEventListener('input', () => clearAllInputErrors());
        elements.emailSubject.addEventListener('input', handleEmailSubjectInput);
        elements.emailSubject.addEventListener('input', () => clearAllInputErrors());
        elements.emailBody.addEventListener('input', handleEmailBodyInput);
        elements.emailBody.addEventListener('input', () => clearAllInputErrors());
        
        // SMS inputs
        elements.smsCountryCode.addEventListener('change', handleSmsCountryCodeChange);
        elements.smsPhoneInput.addEventListener('input', handleSmsPhoneInput);
        elements.smsPhoneInput.addEventListener('input', () => clearAllInputErrors());
        elements.smsBodyInput.addEventListener('input', handleSmsBodyInput);
        elements.smsBodyInput.addEventListener('input', () => clearAllInputErrors());
        
        // Step navigation
        elements.nextStepBtn.addEventListener('click', handleNextStep);
        elements.prevStepBtn.addEventListener('click', handlePrevStep);
        elements.clearBtn.addEventListener('click', handleClear);
        
        // File uploads
        if (elements.bgUpload) {
            elements.bgUpload.addEventListener('change', handleBgUpload);
        }
        if (elements.clearBgBtn) {
            elements.clearBgBtn.addEventListener('click', handleClearBg);
        }
        elements.logoUpload.addEventListener('change', handleLogoUpload);
        elements.clearLogoBtn.addEventListener('click', handleClearLogo);
        
        // Generate button
        elements.generateBtn.addEventListener('click', handleGenerate);
        
        // Download buttons
        elements.downloadPngBtn.addEventListener('click', handleDownloadPng);
        elements.downloadSvgBtn.addEventListener('click', handleDownloadSvg);
        
        // Modal
        elements.modalBackdrop.addEventListener('click', closeModal);
        elements.closeModalBtn.addEventListener('click', closeModal);
        if (elements.closeModalBtnInApp) {
            elements.closeModalBtnInApp.addEventListener('click', closeModal);
        }
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !elements.downloadModal.classList.contains('hidden')) {
                closeModal();
            }
            if (e.key === 'Escape' && !elements.quickLoginModal.classList.contains('hidden')) {
                closeQuickLoginModal();
            }
            if (e.key === 'Escape' && elements.createShortUrlModal && !elements.createShortUrlModal.classList.contains('hidden')) {
                closeCreateShortUrlModal();
            }
            if (e.key === 'Escape' && elements.goToDashboardModal && !elements.goToDashboardModal.classList.contains('hidden')) {
                closeGoToDashboardModal();
            }
        });
        
        // Hash change event (瀏覽器前進/後退按鈕)
        window.addEventListener('hashchange', handleHashChange);
        
        // Short URL Button
        if (elements.createShortUrlBtn) {
            elements.createShortUrlBtn.addEventListener('click', handleCreateShortUrlClick);
        }
        
        // Quick Login Modal
        if (elements.quickLoginForm) {
            elements.quickLoginForm.addEventListener('submit', handleQuickLoginSubmit);
        }
        if (elements.quickLoginBackdrop) {
            elements.quickLoginBackdrop.addEventListener('click', () => closeQuickLoginModal());
        }
        if (elements.closeQuickLoginBtn) {
            elements.closeQuickLoginBtn.addEventListener('click', () => closeQuickLoginModal());
        }
        if (elements.goToRegisterBtn) {
            elements.goToRegisterBtn.addEventListener('click', () => {
                closeQuickLoginModal({ success: false, action: 'register' });
            });
        }
        
        // Token Expired Modal
        if (elements.goToDashboardBackdrop) {
            elements.goToDashboardBackdrop.addEventListener('click', closeGoToDashboardModal);
        }
        if (elements.closeGoToDashboardBtn) {
            elements.closeGoToDashboardBtn.addEventListener('click', closeGoToDashboardModal);
        }
        
        // Create Short URL Modal
        if (elements.createShortUrlBackdrop) {
            elements.createShortUrlBackdrop.addEventListener('click', closeCreateShortUrlModal);
        }
        if (elements.closeCreateShortUrlBtn) {
            elements.closeCreateShortUrlBtn.addEventListener('click', closeCreateShortUrlModal);
        }
        if (elements.createShortUrlForm) {
            elements.createShortUrlForm.addEventListener('submit', handleCreateShortUrlSubmit);
        }
        if (elements.shortUrlDomain) {
            elements.shortUrlDomain.addEventListener('change', handleDomainChange);
        }
        if (elements.addSplitUrlBtn) {
            elements.addSplitUrlBtn.addEventListener('click', addSplitUrl);
        }
        if (elements.toggleUtmBuilderBtn) {
            elements.toggleUtmBuilderBtn.addEventListener('click', toggleUtmBuilder);
        }
        if (elements.closeUtmBuilderBtn) {
            elements.closeUtmBuilderBtn.addEventListener('click', closeUtmBuilderModal);
        }
        if (elements.utmBuilderBackdrop) {
            elements.utmBuilderBackdrop.addEventListener('click', closeUtmBuilderModal);
        }
        if (elements.utmSourceSelect) {
            elements.utmSourceSelect.addEventListener('change', handleUtmSourceChange);
        }
        if (elements.utmMediumSelect) {
            elements.utmMediumSelect.addEventListener('change', handleUtmMediumChange);
        }
        if (elements.applyUtmBtn) {
            elements.applyUtmBtn.addEventListener('click', applyUtmParams);
        }
        
        // Add input event listeners for force lowercase
        if (elements.utmSourceOther) {
            elements.utmSourceOther.addEventListener('input', handleUtmInputChange);
        }
        if (elements.utmMediumOther) {
            elements.utmMediumOther.addEventListener('input', handleUtmInputChange);
        }
        if (elements.utmCampaign) {
            elements.utmCampaign.addEventListener('input', handleUtmInputChange);
        }
        if (elements.utmContent) {
            elements.utmContent.addEventListener('input', handleUtmInputChange);
        }
        if (elements.utmTerm) {
            elements.utmTerm.addEventListener('input', handleUtmInputChange);
        }

        // SSID Warning Modal
        if (elements.ssidWarningContinueBtn) {
            elements.ssidWarningContinueBtn.addEventListener('click', () => {
                closeSsidWarningModal();
                goToStep(2);
            });
        }
        if (elements.ssidWarningBackBtn) {
            elements.ssidWarningBackBtn.addEventListener('click', closeSsidWarningModal);
        }
    }

    // ==================== SSID Warning Modal ====================
    function showSsidWarningModal() {
        if (elements.ssidWarningModal) {
            elements.ssidWarningModal.classList.remove('hidden');
        }
    }

    function closeSsidWarningModal() {
        if (elements.ssidWarningModal) {
            elements.ssidWarningModal.classList.add('hidden');
        }
    }

    // ==================== FAQ Accordion ====================
    function initFaqAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');
        if (!faqItems.length) return;

        faqItems.forEach(item => {
            item.addEventListener('toggle', () => {
                if (!item.open) return;

                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.open = false;
                    }
                });
            });
        });
    }

    // ==================== Mobile Navigation ====================
    function initMobileNavigation() {
        const hamburger = document.getElementById('hamburger');
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileOverlay = document.getElementById('mobileOverlay');

        if (!hamburger || !mobileMenu || !mobileOverlay) return;

        function toggleMenu() {
            const isOpen = mobileMenu.classList.toggle('open');
            mobileOverlay.classList.toggle('open', isOpen);
            hamburger.classList.toggle('active', isOpen);
            hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            document.body.classList.toggle('menu-open', isOpen);
        }

        function closeMenu() {
            mobileMenu.classList.remove('open');
            mobileOverlay.classList.remove('open');
            hamburger.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('menu-open');
        }

        hamburger.addEventListener('click', toggleMenu);
        mobileOverlay.addEventListener('click', closeMenu);
        mobileMenu.querySelectorAll('a:not(.mobile-submenu-toggle)').forEach(function(link) {
            link.addEventListener('click', closeMenu);
        });

        const submenuToggle = mobileMenu.querySelector('.mobile-submenu-toggle');
        if (submenuToggle) {
            submenuToggle.addEventListener('click', function() {
                this.nextElementSibling.classList.toggle('open');
            });
        }

        window.addEventListener('resize', function() {
            if (window.innerWidth > 640) {
                closeMenu();
            }
        });
    }

    // ==================== IP Geolocation ====================
    async function detectCountryByIP() {
        const DEFAULT_COUNTRY_CODE = '+886'; // 預設台灣
        
        try {
            // 使用 ipapi.co 免費 API 偵測使用者所在地區
            const response = await fetch('https://ipapi.co/json/', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            // 處理 API 額度用盡或其他錯誤 (429 = Too Many Requests, 403 = Forbidden)
            if (!response.ok) {
                if (response.status === 429 || response.status === 403) {
                    console.log('IP geolocation API quota exceeded, using default country code (+886)');
                } else {
                    console.log(`IP geolocation request failed with status: ${response.status}`);
                }
                return; // 保持預設值
            }
            
            const data = await response.json();
            
            // 檢查是否有錯誤訊息（有些 API 會在 response body 回傳錯誤）
            if (data.error || data.reason) {
                console.log('IP geolocation API error:', data.reason || data.error);
                return; // 保持預設值
            }
            
            const countryCode = data.country_code; // e.g., "TW", "US", "JP"
            
            if (countryCode && countryCallingCodes[countryCode]) {
                const callingCode = countryCallingCodes[countryCode];
                state.detectedCountryCode = callingCode;
                
                // 更新 state 和 UI
                state.phone.countryCode = callingCode;
                state.sms.countryCode = callingCode;
                
                if (elements.phoneCountryCode) {
                    elements.phoneCountryCode.value = callingCode;
                }
                if (elements.smsCountryCode) {
                    elements.smsCountryCode.value = callingCode;
                }
                
                console.log(`Detected country: ${countryCode}, calling code: ${callingCode}`);
            } else {
                // 國家碼不在支援清單中，保持預設值
                console.log(`Country ${countryCode} not in supported list, using default (+886)`);
            }
        } catch (error) {
            // 網路錯誤或其他例外，保持預設值（台灣 +886）
            console.log('IP geolocation failed, using default country code (+886):', error.message);
        }
    }

    // ==================== Load Default Logo ====================
    function loadDefaultLogo() {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                // 將圖片轉換為 data URL
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                
                state.logo = dataUrl;
                state.logoFileName = 'lihi Logo (預設)';
                state.isDefaultLogo = true;
                
                // 更新 UI
                if (elements.logoFileName) {
                    elements.logoFileName.textContent = 'lihi Logo (預設)';
                }
                if (elements.clearLogoBtn) {
                    elements.clearLogoBtn.classList.remove('hidden');
                }
                
                // Show logo preview
                if (elements.logoPreviewArea && elements.logoPreviewImg) {
                    elements.logoPreviewImg.src = dataUrl;
                    elements.logoPreviewArea.classList.remove('hidden');
                }
                
                resolve(true);
            };
            img.onerror = () => {
                console.log('Failed to load default logo, continuing without it');
                resolve(false);
            };
            img.src = DEFAULT_LOGO_PATH;
        });
    }

    // ==================== Auto Login via Session (iframe + postMessage) ====================
    function handleSessionAuth() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 5000); // 5秒超時

            function handleMessage(event) {
                if (event.origin !== API_BASE) return;

                var data = event.data;
                clearTimeout(timeout);
                window.removeEventListener('message', handleMessage);
                if (data.result === 'success' && data.token) {
                    storeToken(data.token);
                    showToast('已自動登入');
                    updateLogoRemoveHint();
                    if (elements.registerPrompt) {
                        elements.registerPrompt.classList.add('hidden');
                    }
                    resolve(data.token);
                } else {
                    resolve(null);
                }
            }

            window.addEventListener('message', handleMessage);
            document.getElementById('qrcodeAuth').src = API_BASE + '/qrcode/auth';
        });
    }

    // ==================== Initialize ====================
    async function init() {
        initElements();
        
        // 立即根據 URL hash 切換到對應的 tab，不等待認證完成
        handleHashChange();
        
        // 沒有 token 或 token 過期就嘗試透過 session 取得新 token
        const storedToken = getStoredToken();
        if (!storedToken || isTokenExpired(storedToken)) {
            if (storedToken) {
                // 清除過期 token
                clearToken();
            }
            await handleSessionAuth();
        }
        
        bindEvents();
        initFaqAccordion();
        initMobileNavigation();
        
        // Set initial state
        elements.currentType.textContent = typeNames[state.qrType];
        elements.currentTypePreview.textContent = typeNames[state.qrType];
        // 只有當欄位有值時才更新 state，否則保持空字串以確保驗證能正常運作
        if (elements.urlInput.value.trim()) {
            state.url = elements.urlInput.value;
        } else {
            state.url = '';
        }
        
        // 載入預設 logo
        await loadDefaultLogo();
        
        // 更新 logo 移除提示
        updateLogoRemoveHint();
        
        // 偵測使用者所在地區並自動設定國家碼
        detectCountryByIP();
        
        // 如果有登入過則隱藏註冊提示（不管 token 是否過期）
        if (localStorage.getItem(JWT_STORAGE_KEY)) {
            elements.registerPrompt.classList.add('hidden');
        }
    }

    // Start the app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
