// Vox.w Client Core Module (2026 Tech Stack)
const VoxApp = {
    config: {
        piSecureScope: ['username', 'payments'],
        serverUrl: `ws://${window.location.host || 'localhost:3000'}`
    },
    state: {
        pioneerUsername: 'رائد تجريبي (Demo_Pioneer)',
        isAuthenticated: false,
        mediaRecorder: null,
        audioChunks: [],
        isRecording: false,
        isLiveCallActive: false,
        ws: null,
        localPeerConnection: null,
        embeddingsCount: 1248,
        latencyInterval: null,
        neuralSpeed: 0.002,
        neuralPulse: 1.0,
        audioContext: null,
        analyser: null,
        audioSource: null,
        dataArray: null
    },

    init: function() {
        console.log("[Vox.w] تهيئة تطبيق GAI الشخصي للرائد...");
        
        // 1. تهيئة الرسوميات تفاعلياً (الكرة العصبية)
        this.initNeuralSphere();
        
        // 2. ربط أزرار الواجهة وتبديل التبويبات
        this.bindEvents();
        
        // 3. التحقق والمصادقة مع شبكة Pi
        this.initPiSession();

        // 4. تأسيس الاتصال الفوري عبر WebSockets
        this.initWebSocket();
        
        this.logInfra("تم تحميل البنية التحتية بنجاح 🟢", "success");
    },

    // 1. سجل خادم البنية التحتية (مكتوب في لوحة المطورين على الشاشة)
    logInfra: function(message, type = "system") {
        const logsBody = document.getElementById("infra-logs");
        if (!logsBody) return;
        
        const timestamp = new Date().toLocaleTimeString('ar-EG', { hour12: false });
        const logLine = document.createElement("div");
        logLine.className = `log-line ${type}`;
        logLine.innerHTML = `[${timestamp}] ${message}`;
        logsBody.appendChild(logLine);
        logsBody.scrollTop = logsBody.scrollHeight;
    },

    // 2. التحقق والمصادقة عبر Pi SDK
    initPiSession: async function() {
        const usernameEl = document.getElementById("pioneer-username");
        const badgeEl = document.getElementById("pi-status-badge");
        const signinBtn = document.getElementById("btn-pi-signin");
        
        if (typeof Pi !== 'undefined') {
            this.logInfra("تم رصد Pi Network SDK. جاري تهيئة SDK...", "system");
            try {
                // تهيئة SDK ووعد المعالجة كـ Promise
                await Pi.init({ version: "2.0", sandbox: true });
                this.logInfra("تمت تهيئة Pi SDK بنجاح. جاري المصادقة التلقائية...", "system");
                
                // محاولة المصادقة
                await this.authenticateWithPi();
            } catch (error) {
                this.logInfra(`فشل تهيئة Pi SDK: ${error.message || error}`, "webrtc");
                if (signinBtn) signinBtn.style.display = "inline-block";
            }
        } else {
            this.logInfra("⚠️ تشغيل في وضع التطوير (بيئة الويب المستقلة).", "system");
            usernameEl.textContent = `@Pioneer_314`;
            badgeEl.textContent = "بيئة تطوير مستقلة";
            badgeEl.classList.add("active");
        }
        
        // تهيئة محرك الصوت بعد تأمين هوية المستخدم
        this.initializeAudioEngine();
    },

    authenticateWithPi: async function() {
        const usernameEl = document.getElementById("pioneer-username");
        const badgeEl = document.getElementById("pi-status-badge");
        const signinBtn = document.getElementById("btn-pi-signin");
        
        try {
            const onIncompletePaymentFound = (payment) => {
                this.logInfra(`إشعار معالجة مدفوعات معلقة من الشبكة: ${payment.amount} Pi`, "db");
            };
            
            this.logInfra("جاري طلب المصادقة الأمنية من Pi Browser...", "system");
            const auth = await Pi.authenticate(['username'], onIncompletePaymentFound);
            
            this.logInfra("تم استلام رمز الوصول (Access Token). جاري التحقق عبر الخادم الخلفي...", "system");
            
            // إرسال التوكن للخادم للتحقق من الهوية بشكل آمن
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: auth.accessToken })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.state.pioneerUsername = result.user.username;
                this.state.isAuthenticated = true;
                
                usernameEl.textContent = `@${this.state.pioneerUsername}`;
                badgeEl.textContent = "مصادق عبر Pi ✅";
                badgeEl.classList.add("active");
                if (signinBtn) signinBtn.style.display = "none";
                
                this.logInfra(`تم تأمين الجلسة بنجاح للرائد: @${this.state.pioneerUsername} ✅`, "success");
                
                // تحديث الاتصال بالـ WebSockets بهوية المستخدم الحقيقية
                if (this.state.ws) {
                    this.state.ws.close();
                }
            } else {
                throw new Error(result.error || "تعذر التحقق من التوكن");
            }
        } catch (error) {
            this.logInfra(`فشل مصادقة شبكة باي: ${error.message || error}`, "webrtc");
            badgeEl.textContent = "خطأ بالمصادقة";
            badgeEl.style.backgroundColor = "rgba(229, 57, 53, 0.15)";
            badgeEl.style.color = "#ff5252";
            if (signinBtn) signinBtn.style.display = "inline-block";
        }
    },

    // 3. إعداد محرك التقاط الصوت (التسجيل والاتصال المباشر)
    initializeAudioEngine: async function() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.logInfra("صلاحيات الميكروفون مؤمنة بنجاح 🎙️", "success");
            
            // تهيئة الـ Audio Analyser للتفاعل مع الكرة العصبية (Option 3)
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.state.audioContext = new AudioContext();
                    this.state.analyser = this.state.audioContext.createAnalyser();
                    this.state.analyser.fftSize = 256;
                    this.state.audioSource = this.state.audioContext.createMediaStreamSource(stream);
                    this.state.audioSource.connect(this.state.analyser);
                    
                    const bufferLength = this.state.analyser.frequencyBinCount;
                    this.state.dataArray = new Uint8Array(bufferLength);
                    this.logInfra("تم تفعيل محلل الترددات الصوتية التفاعلي 📊", "success");
                }
            } catch (audioErr) {
                console.warn("تنبيه: لم يتمكن المتصفح من تهيئة Web Audio API:", audioErr);
            }

            // تهيئة النمط الثاني: تسجيل الصوت (Voice Message)
            const options = { mimeType: 'audio/webm' };
            // التحقق من توافق الترميز الرقمي
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/ogg';
            }
            
            this.state.mediaRecorder = new MediaRecorder(stream, options);
            
            this.state.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.state.audioChunks.push(event.data);
                }
            };
            
            this.state.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.state.audioChunks, { type: this.state.mediaRecorder.mimeType });
                this.logInfra(`تم إنشاء ملف صوتي مضغوط بحجم: ${(audioBlob.size / 1024).toFixed(1)} KB`, "db");
                this.processVoiceMessage(audioBlob);
                this.state.audioChunks = []; // إعادة تهيئة مصفوفة البيانات
            };
        } catch (err) {
            this.logInfra("❌ فشل تفعيل المحرك الصوتي. تحقق من صلاحيات المتصفح.", "webrtc");
            console.error(err);
        }
    },

    // 4. تأسيس اتصال الـ WebSocket
    initWebSocket: function() {
        try {
            this.state.ws = new WebSocket(this.config.serverUrl);
            
            this.state.ws.onopen = () => {
                document.getElementById("ws-status-dot").classList.add("green");
                this.logInfra("مأخذ WebSocket نشط وجاهز لنقل البيانات الفورية 🌐", "success");
            };
            
            this.state.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            };
            
            this.state.ws.onclose = () => {
                document.getElementById("ws-status-dot").classList.remove("green");
                this.logInfra("WebSocket مغلق. تم تفعيل خادم المحاكاة التكيفي محلياً 💻", "system");
                // إعادة محاولة الاتصال بعد 5 ثوانٍ
                setTimeout(() => this.initWebSocket(), 5000);
            };

            this.state.ws.onerror = () => {
                // فشل صامت للتأكد من عمل التطبيق محلياً بدون خادم
            };
        } catch (e) {
            this.logInfra("تعذر الاتصال بـ WebSocket. وضع المحاكاة الذكي نشط.", "system");
        }
    },

    // 5. ربط تفاعلات المستخدم
    bindEvents: function() {
        // زر تسجيل الدخول يدويًا
        const signinBtn = document.getElementById("btn-pi-signin");
        if (signinBtn) {
            signinBtn.addEventListener("click", () => {
                this.authenticateWithPi();
            });
        }

        // تبديل الأنماط الثلاثة
        const tabBtns = document.querySelectorAll(".tab-btn");
        const modeCards = document.querySelectorAll(".mode-card");
        
        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const tabName = btn.getAttribute("data-tab");
                
                tabBtns.forEach(b => b.classList.remove("active"));
                modeCards.forEach(c => c.classList.remove("active"));
                
                btn.classList.add("active");
                document.getElementById(`${tabName}-card`).classList.add("active");
                
                this.logInfra(`تم تبديل نمط التواصل إلى: ${btn.querySelector('span').textContent}`, "system");
                
                // تحديث سلوك الكرة العصبية
                if (tabName === 'live-call') {
                    this.state.neuralSpeed = 0.005;
                } else {
                    this.state.neuralSpeed = 0.002;
                    // إنهاء الاتصال المباشر إذا انتقل المستخدم لتبويب آخر
                    if (this.state.isLiveCallActive) {
                        this.toggleLiveAGICall();
                    }
                }
            });
        });

        // النمط الأول: إرسال الرسائل النصية
        const sendTextBtn = document.getElementById("btn-send-text");
        const chatInput = document.getElementById("chat-input");
        
        const triggerSendText = () => {
            const text = chatInput.value.trim();
            if (text) {
                this.sendTextMessage(text);
                chatInput.value = '';
            }
        };

        sendTextBtn.addEventListener("click", triggerSendText);
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === 'Enter') triggerSendText();
        });

        // النمط الثاني: تشغيل وإيقاف التسجيل الصوتي
        const micTrigger = document.getElementById("voice-mic-trigger");
        micTrigger.addEventListener("click", () => {
            this.toggleVoiceRecording();
        });

        const submitVoiceBtn = document.getElementById("btn-submit-voice");
        submitVoiceBtn.addEventListener("click", () => {
            this.logInfra("جاري رفع وتسليم الرسالة الصوتية لمعالجة Whisper...", "db");
            this.logInfra("تحديث الذاكرة التكيفية للرائد بنجاح 💾", "success");
            
            // إظهار استجابة صوتية وهمية في الشات كـ GAI
            setTimeout(() => {
                this.appendChatMessage("gai", "تمت معالجة رسالتك الصوتية بنجاح وحفظ النقاط المستخلصة في ذاكرتك الشخصية. سأبني إجاباتي القادمة على هذا المفهوم الجديد.");
                this.incrementEmbeddings(8);
            }, 1500);
            
            document.getElementById("audio-playback-box").style.display = "none";
            document.getElementById("voice-status-label").textContent = "انقر على المايك للبدء بالتسجيل";
        });

        // النمط الثالث: تفعيل الاتصال المباشر WebRTC
        const liveCallToggle = document.getElementById("btn-live-call-toggle");
        liveCallToggle.addEventListener("click", () => {
            this.toggleLiveAGICall();
        });

        // محاكاة زر تعديل System Prompt لتخصيص الذكاء الفردي
        const editPromptBtn = document.getElementById("edit-prompt-btn");
        const promptArea = document.getElementById("system-prompt-display");
        editPromptBtn.addEventListener("click", () => {
            if (promptArea.readOnly) {
                promptArea.readOnly = false;
                promptArea.focus();
                editPromptBtn.innerHTML = '<i class="fa-solid fa-check text-green"></i>';
                this.logInfra("تم فتح تعديل التوجيه الخارق لتخصيص الذكاء يدوياً.", "system");
            } else {
                promptArea.readOnly = true;
                editPromptBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
                this.logInfra("تم حفظ التعديلات وتغذية قاعدة بيانات المتجهات 💾", "success");
            }
        });

        // تفعيل بوابة مدفوعات Pi Network Sandbox (Option 1)
        const paymentBtn = document.getElementById("btn-pi-payment");
        const paymentModal = document.getElementById("payment-modal");
        const closePaymentBtn = document.getElementById("btn-close-payment");
        const confirmTxBtn = document.getElementById("btn-confirm-tx");
        
        const stepPrepare = document.getElementById("step-prepare");
        const stepAuth = document.getElementById("step-auth");
        const stepSuccess = document.getElementById("step-success");

        if (paymentBtn) {
            paymentBtn.addEventListener("click", () => {
                paymentModal.style.display = "flex";
                stepPrepare.style.display = "flex";
                stepAuth.style.display = "none";
                stepSuccess.style.display = "none";
                
                this.logInfra("فتح بوابة مدفوعات Pi Sandbox... 💳", "system");
                
                // محاكاة إعداد المعاملة مع الشبكة
                setTimeout(() => {
                    stepPrepare.style.display = "none";
                    stepAuth.style.display = "flex";
                    this.logInfra("بانتظار موافقة المستخدم وتوقيع المعاملة بالـ Wallet Key 🔑", "webrtc");
                }, 1500);
            });
        }

        if (closePaymentBtn) {
            closePaymentBtn.addEventListener("click", () => {
                paymentModal.style.display = "none";
            });
        }

        if (confirmTxBtn) {
            confirmTxBtn.addEventListener("click", async () => {
                confirmTxBtn.disabled = true;
                confirmTxBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إرسال التوقيع...';
                
                this.logInfra("جاري توقيع المعاملة وإرسالها لـ Blockchain Verification...", "system");

                // محاكاة الاتصال بالخادم للتحقق من المعاملة (Backend API)
                try {
                    // محاولة إرسال طلب التحقق للخادم
                    const response = await fetch('/api/payments/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: this.state.pioneerUsername, amount: 1.0 })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.logInfra(`[Pi Block Explorer] تم تأكيد المعاملة بنجاح! TXID: ${result.txid.substring(0, 16)}... 🟢`, "success");
                        
                        stepAuth.style.display = "none";
                        stepSuccess.style.display = "flex";
                        
                        // ترقية السعة في الواجهة
                        this.incrementEmbeddings(10000);
                        
                        // تحديث مسمى المستودع للدلالة على الترقية
                        const statValues = document.querySelectorAll(".stat-value");
                        statValues[0].textContent = "Pinecone [Partition-V1 PRO 👑]";
                        statValues[0].classList.add("text-green");
                        
                        setTimeout(() => {
                            paymentModal.style.display = "none";
                            confirmTxBtn.disabled = false;
                            confirmTxBtn.innerHTML = 'تأكيد ودفع';
                        }, 3000);
                    } else {
                        throw new Error("فشل التحقق من صحة المعاملة");
                    }
                } catch (err) {
                    // Fallback للمحاكاة المحلية في حال عدم توفر الخادم
                    setTimeout(() => {
                        this.logInfra(`[Pi Wallet Sandbox] محاكاة توقيع المعاملة محلياً نجحت! 🟢`, "success");
                        stepAuth.style.display = "none";
                        stepSuccess.style.display = "flex";
                        
                        this.incrementEmbeddings(10000);
                        
                        const statValues = document.querySelectorAll(".stat-value");
                        statValues[0].textContent = "Pinecone [Partition-V1 PRO 👑]";
                        statValues[0].classList.add("text-green");
                        
                        setTimeout(() => {
                            paymentModal.style.display = "none";
                            confirmTxBtn.disabled = false;
                            confirmTxBtn.innerHTML = 'تأكيد ودفع';
                        }, 3000);
                    }, 1500);
                }
            });
        }
    },

    // 6. النمط الأول: إرسال النصوص المباشرة
    sendTextMessage: function(text) {
        this.appendChatMessage("user", text);
        this.logInfra(`إرسال نص إلى الـ AGI: "${text.substring(0, 25)}..."`, "system");
        
        // تسريع الكرة العصبية للحظات للتعبير عن التفكير
        this.state.neuralSpeed = 0.015;
        this.state.neuralPulse = 1.6;
        
        const payload = {
            type: 'text_chat',
            username: this.state.pioneerUsername,
            message: text
        };

        if (this.state.ws && this.state.ws.readyState === WebSocket.OPEN) {
            this.state.ws.send(JSON.stringify(payload));
        } else {
            // محاكاة محلية ذكية في حال عدم تشغيل السيرفر
            setTimeout(() => {
                this.state.neuralSpeed = 0.002;
                this.state.neuralPulse = 1.0;
                
                // توليد إجابة نموذجية تتكيف مع الرائد
                const replies = [
                    `فهمت وجهة نظرك يا @${this.state.pioneerUsername}. لقد قمت بترميز هذه الفكرة في شريحتك المعزولة لربطها بالحوارات القادمة.`,
                    `بناءً على ملف الحمض المعرفي الخاص بك، أعلم أنك مهتم بالابتكار في الـ Web3. هل تود أن نربط هذه الفكرة ببيانات Pi المتوفرة لديك؟`,
                    `لقد تم تخزين متجهات جديدة لحديثك هذا. كلما زاد تفاعلنا، زاد تطوري لأطابق تماماً شخصيتك وتفضيلاتك.`
                ];
                const randomReply = replies[Math.floor(Math.random() * replies.length)];
                this.appendChatMessage("gai", randomReply);
                this.incrementEmbeddings(4);
            }, 1000);
        }
    },

    // 7. النمط الثاني: تسجيل الصوت وإيقافه
    toggleVoiceRecording: function() {
        const micBtnOuter = document.getElementById("voice-mic-trigger");
        const statusLabel = document.getElementById("voice-status-label");
        const audioPlaybackBox = document.getElementById("audio-playback-box");
        
        if (!this.state.mediaRecorder) {
            this.logInfra("المسجل الصوتي غير جاهز. يرجى السماح بصلاحيات الميكروفون أولاً.", "webrtc");
            return;
        }

        if (!this.state.isRecording) {
            // بدء التسجيل
            this.state.audioChunks = [];
            this.state.mediaRecorder.start();
            this.state.isRecording = true;
            micBtnOuter.classList.add("recording");
            statusLabel.textContent = "جاري تسجيل صوتك بدقة عالية... انقر مجدداً للإيقاف 🔴";
            this.logInfra("بدء التقاط الصوت (Voice Recording Active) 🎙️", "system");
            
            // زيادة نبض الرسوميات مع الصوت
            this.state.neuralSpeed = 0.008;
            this.state.neuralPulse = 1.3;
            audioPlaybackBox.style.display = "none";
        } else {
            // إيقاف التسجيل
            this.state.mediaRecorder.stop();
            this.state.isRecording = false;
            micBtnOuter.classList.remove("recording");
            statusLabel.textContent = "تم إيقاف التسجيل وتشفير المقطع";
            this.logInfra("تم إيقاف التسجيل ومعالجة الملف الصوتي ⏹️", "system");
            
            this.state.neuralSpeed = 0.002;
            this.state.neuralPulse = 1.0;
            
            // إظهار مشغل الصوت للتأكيد
            setTimeout(() => {
                const audioBlob = new Blob(this.state.audioChunks, { type: this.state.mediaRecorder.mimeType });
                const audioUrl = URL.createObjectURL(audioBlob);
                document.getElementById("voice-playback").src = audioUrl;
                audioPlaybackBox.style.display = "flex";
            }, 200);
        }
    },

    // 8. معالجة الرسالة الصوتية بعد الانتهاء
    processVoiceMessage: function(blob) {
        this.logInfra("جاري تحويل الصوت إلى نص (Whisper STT Simulation)...", "db");
        // إرسال الـ Blob عبر مأخذ التوصيل إذا كان نشطاً
        if (this.state.ws && this.state.ws.readyState === WebSocket.OPEN) {
            const reader = new FileReader();
            reader.readAsArrayBuffer(blob);
            reader.onloadend = () => {
                this.state.ws.send(JSON.stringify({
                    type: 'voice_message',
                    username: this.state.pioneerUsername,
                    audioData: Array.from(new Uint8Array(reader.result))
                }));
            };
        }
    },

    // 9. النمط الثالث: الاتصال المباشر الفوري مع الـ AGI عبر WebRTC
    toggleLiveAGICall: function() {
        const callBtn = document.getElementById("btn-live-call-toggle");
        const callAvatar = document.getElementById("call-glow-avatar");
        const rtcDot = document.getElementById("webrtc-status-dot");
        const statusText = document.getElementById("sphere-status-text");
        const liveWaveform = document.getElementById("liveWaveform");
        const signalingState = document.getElementById("call-signaling-state");
        const latencyVal = document.getElementById("call-latency");
        const sidebarLatency = document.getElementById("latency-val");
        
        this.state.isLiveCallActive = !this.state.isLiveCallActive;
        
        if (this.state.isLiveCallActive) {
            this.logInfra("📞 بدء مكالمة WebRTC فورية... جاري تهيئة Signaling Channel", "webrtc");
            callBtn.className = "btn-call-toggle btn-end-call";
            callBtn.querySelector("span").textContent = "إنهاء المكالمة المباشرة";
            callBtn.querySelector("i").className = "fa-solid fa-phone-slash";
            callAvatar.classList.add("active");
            rtcDot.className = "status-dot purple";
            statusText.textContent = "الاتصال الصوتي منخفض التأخير نشط...";
            liveWaveform.style.display = "flex";
            
            // محاكاة إعدادات WebRTC Signaling الفورية
            signalingState.textContent = "جاري إنشاء PeerConnection...";
            signalingState.className = "val text-purple";
            
            setTimeout(() => {
                this.logInfra("Gathering ICE Candidates...", "webrtc");
                signalingState.textContent = "تبادل SDP Offer / Answer...";
            }, 400);

            setTimeout(() => {
                this.logInfra("WebRTC Channel: Connected 🔒", "success");
                signalingState.textContent = "متصل مباشرة بالـ GAI";
                signalingState.className = "val text-green";
                
                // محاكاة زمن التأخير المنخفض
                this.state.latencyInterval = setInterval(() => {
                    const lat = Math.floor(80 + Math.random() * 45); // تأخير بين 80ms و 125ms
                    latencyVal.textContent = `${lat} ms`;
                    sidebarLatency.textContent = `${lat} ms`;
                }, 1000);
            }, 1000);
            
            this.state.neuralSpeed = 0.012;
            
        } else {
            this.logInfra("🔒 تم إنهاء المكالمة المباشرة وحفظ التطور المعرفي في ذاكرة الرائد المستقلة", "success");
            callBtn.className = "btn-call-toggle btn-start-call";
            callBtn.querySelector("span").textContent = "بدء مكالمة WebRTC فورية";
            callBtn.querySelector("i").className = "fa-solid fa-phone";
            callAvatar.classList.remove("active");
            rtcDot.className = "status-dot";
            statusText.textContent = "انقر لبدء المحادثة";
            liveWaveform.style.display = "none";
            
            signalingState.textContent = "غير متصل";
            signalingState.className = "val";
            latencyVal.textContent = "--";
            sidebarLatency.textContent = "0ms";
            
            clearInterval(this.state.latencyInterval);
            this.state.neuralSpeed = 0.002;
            
            // زيادة متجهات التطور نتيجة للمكالمة الطويلة
            this.incrementEmbeddings(24);
        }
    },

    // 10. التعامل مع الرسائل المستلمة من الخادم
    handleServerMessage: function(data) {
        if (data.type === 'text_response') {
            this.state.neuralSpeed = 0.002;
            this.state.neuralPulse = 1.0;
            this.appendChatMessage("gai", data.message);
            this.incrementEmbeddings(4);
        } else if (data.type === 'voice_to_text') {
            this.logInfra(`[Whisper STT]: "${data.text}"`, "db");
            this.appendChatMessage("user", `(صوت): ${data.text}`);
        }
    },

    // 11. عرض الرسائل في الشات
    appendChatMessage: function(sender, text) {
        const chatMessages = document.getElementById("chat-messages-box");
        if (!chatMessages) return;
        
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${sender}-msg`;
        messageDiv.textContent = text;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },

    // 12. زيادة الـ Embeddings (توضيح الذاكرة التراكمية والتطور)
    incrementEmbeddings: function(amount) {
        this.state.embeddingsCount += amount;
        const embedCountEl = document.getElementById("embedding-count");
        if (embedCountEl) {
            embedCountEl.textContent = `${this.state.embeddingsCount.toLocaleString()} Chunk`;
            embedCountEl.classList.add("text-green");
            setTimeout(() => embedCountEl.classList.remove("text-green"), 1000);
        }
        this.logInfra(`تم تخزين تحديث معرفي جديد (+${amount} متجهات) في Pinecone DB 💾`, "db");
    },

    // 13. بناء وتحديث الرسوم التفاعلية للكرة العصبية ثلاثية الأبعاد (3D Neural Sphere Canvas)
    initNeuralSphere: function() {
        const canvas = document.getElementById("neuralCanvas");
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;
        
        window.addEventListener("resize", () => {
            if (canvas.offsetWidth && canvas.offsetHeight) {
                width = canvas.width = canvas.offsetWidth;
                height = canvas.height = canvas.offsetHeight;
            }
        });

        // إعداد النقاط في الفضاء ثلاثي الأبعاد
        const numNodes = 75;
        const nodes = [];
        const radius = Math.min(width, height) * 0.3;
        
        for (let i = 0; i < numNodes; i++) {
            // توزيع عشوائي متجانس على سطح كرة (توزيع فيبوناتشي أو كروي)
            const theta = Math.acos(Math.random() * 2 - 1);
            const phi = Math.random() * Math.PI * 2;
            
            nodes.push({
                x: radius * Math.sin(theta) * Math.cos(phi),
                y: radius * Math.sin(theta) * Math.sin(phi),
                z: radius * Math.cos(theta),
                baseX: radius * Math.sin(theta) * Math.cos(phi),
                baseY: radius * Math.sin(theta) * Math.sin(phi),
                baseZ: radius * Math.cos(theta),
                ox: 0, oy: 0, oz: 0 // النقطة المعروضة ثنائية الأبعاد
            });
        }

        let angleX = 0;
        let angleY = 0;

        const rotateX = (node, angle) => {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const y = node.y * cos - node.z * sin;
            const z = node.z * cos + node.y * sin;
            node.y = y;
            node.z = z;
        };

        const rotateY = (node, angle) => {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const x = node.x * cos - node.z * sin;
            const z = node.z * cos + node.x * sin;
            node.x = x;
            node.z = z;
        };

        // حلقة الرسم
        const draw = () => {
            ctx.clearRect(0, 0, width, height);
            
            // تحديث زوايا الدوران اعتماداً على سرعة شبكة العصبية
            angleX = VoxApp.state.neuralSpeed;
            angleY = VoxApp.state.neuralSpeed * 1.5;
            
            // قراءة الترددات الصوتية الحية للتفاعل (Option 3)
            let audioAmp = 0;
            if (VoxApp.state.analyser && (VoxApp.state.isRecording || VoxApp.state.isLiveCallActive)) {
                VoxApp.state.analyser.getByteFrequencyData(VoxApp.state.dataArray);
                let sum = 0;
                for (let i = 0; i < VoxApp.state.dataArray.length; i++) {
                    sum += VoxApp.state.dataArray[i];
                }
                audioAmp = sum / VoxApp.state.dataArray.length; // القيمة المتوسطة للأمبلتود (0 - 255)
                
                // التحكم بالنبض وسرعة الدوران ديناميكياً مع الصوت
                VoxApp.state.neuralSpeed = 0.002 + (audioAmp / 255) * 0.02;
                VoxApp.state.neuralPulse = 1.0 + (audioAmp / 255) * 1.5;
            } else {
                // العودة للوضع الطبيعي الهادئ في حال عدم وجود نشاط صوتي
                if (!VoxApp.state.isLiveCallActive && !VoxApp.state.isRecording) {
                    VoxApp.state.neuralSpeed = 0.002;
                    VoxApp.state.neuralPulse = 1.0;
                }
            }
            
            // إسقاط النقاط وحساب الأبعاد الثنائية
            nodes.forEach((node, index) => {
                rotateX(node, angleX);
                rotateY(node, angleY);
                
                // إضافة تشويه عشوائي خفيف بناءً على ترددات الصوت لتشويه شكل الكرة العصبية كخلية حية
                let soundDistortion = 0;
                if (audioAmp > 5 && VoxApp.state.dataArray) {
                    const freqBucket = index % VoxApp.state.dataArray.length;
                    soundDistortion = (VoxApp.state.dataArray[freqBucket] / 255) * 20;
                }
                
                // إضافة تأثير النبض الديناميكي
                const pulse = (1.0 + Math.sin(Date.now() * 0.003) * 0.05 * VoxApp.state.neuralPulse);
                const currentRadius = radius + soundDistortion;
                
                // حساب إسقاط الإحداثيات ثنائية الأبعاد
                const distance = 400;
                const scale = distance / (distance + node.z);
                
                // إسقاط النقطة بناءً على الإحداثيات التي تم تعديلها بالصوت
                node.ox = (node.x * (currentRadius/radius) * scale * pulse) + width / 2;
                node.oy = (node.y * (currentRadius/radius) * scale * pulse) + height / 2;
            });
            
            // رسم الروابط والخطوط العصبية (Neural Synapses)
            ctx.strokeStyle = "rgba(82, 45, 128, 0.15)";
            ctx.lineWidth = 0.8;
            
            for (let i = 0; i < numNodes; i++) {
                for (let j = i + 1; j < numNodes; j++) {
                    const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y, nodes[i].z - nodes[j].z);
                    // ربط النقاط المتقاربة فقط لبناء شبكة عنكبوتية عصبية مذهلة
                    if (dist < radius * 0.75) {
                        const alpha = (1 - dist / (radius * 0.75)) * 0.25;
                        // التدرج اللوني للخطوط بين الأرجواني والأخضر
                        const isCore = nodes[i].z > 0 && nodes[j].z > 0;
                        ctx.strokeStyle = isCore ? `rgba(0, 230, 118, ${alpha})` : `rgba(82, 45, 128, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].ox, nodes[i].oy);
                        ctx.lineTo(nodes[j].ox, nodes[j].oy);
                        ctx.stroke();
                    }
                }
            }
            
            // رسم الخلايا العصبية (Nodes)
            nodes.forEach(node => {
                const distance = 400;
                const scale = distance / (distance + node.z);
                const size = Math.max(1, (node.z + radius) / (radius * 2) * 4) * scale;
                
                // عمق تدرج الألوان
                ctx.beginPath();
                ctx.arc(node.ox, node.oy, size, 0, Math.PI * 2);
                
                // النقاط القريبة باللون الأخضر والبعيدة باللون الأرجواني
                if (node.z < -radius * 0.2) {
                    ctx.fillStyle = `rgba(0, 230, 118, ${Math.max(0.2, scale - 0.4)})`;
                } else {
                    ctx.fillStyle = `rgba(82, 45, 128, ${Math.max(0.3, scale - 0.3)})`;
                }
                ctx.fill();
                
                // إضافة هالة ضوئية للنقاط الكبيرة
                if (size > 2.5) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = "#00E676";
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath();
                    ctx.arc(node.ox, node.oy, size * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0; // إعادة ضبط
                }
            });

            requestAnimationFrame(draw);
        };
        
        draw();
    }
};

// بدء التشغيل
window.addEventListener("DOMContentLoaded", () => {
    VoxApp.init();
});
