const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Simulated Vector Database File for Independent Pioneer Shards (Adaptive Knowledge Base)
const DB_PATH = path.join(__dirname, 'pioneer_profiles.json');

// Initialize local database with demo data if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
    const initialData = {
        "Demo_Pioneer": {
            "pioneer_id": "Demo_Pioneer",
            "created_at": "2026-06-26T12:00:00Z",
            "interests": ["Web3", "Decentralized Apps", "Cryptography", "Mobile GAI"],
            "writing_style": "تحليلي ومباشر، يفضل الاختصار التقني",
            "recent_topics": ["Pi network ecosystem", "Zero Knowledge Proofs"],
            "embeddings_count": 1248,
            "memory_shards": [
                { "id": "m_01", "content": "الرائد يبحث عن تطوير بنية تحتية آمنة ومقاومة للرقابة لتطبيقه Vox.w.", "timestamp": "2026-06-26T13:10:00Z" },
                { "id": "m_02", "content": "يفضل الرائد اللون البنفسجي الداكن (#522D80) لرمزية الأمان والربط مع شبكة باي واللون الأخضر الفوسفوري التكيفي (#00E676) لرمزية الحياة الرقمية والتطور.", "timestamp": "2026-06-26T14:40:00Z" }
            ]
        }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
}

// Serve static files and parse JSON bodies
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Helper function to make HTTPS requests (fallback for older Node versions without native fetch)
const https = require('https');
function makeHttpsGet(url, headers) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: headers
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error("Failed to parse JSON response"));
                    }
                } else {
                    reject(new Error(`Pi API returned status ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', (err) => reject(err));
        req.end();
    });
}

// API endpoint to verify Pi Network Access Token (using GET https://api.minepi.com/v2/me)
app.post('/api/auth/verify', async (req, res) => {
    const { accessToken } = req.body;
    
    if (!accessToken) {
        return res.status(400).json({ success: false, error: "Access token is required" });
    }
    
    console.log(`[Vox.w Auth API] جاري التحقق من رمز الوصول (AccessToken)...`);
    
    try {
        let userData;
        const headers = { 'Authorization': `Bearer ${accessToken}` };
        
        // Use native fetch if available (Node 18+), otherwise fallback to HTTPS helper
        if (typeof fetch === 'function') {
            const apiRes = await fetch('https://api.minepi.com/v2/me', { headers });
            if (!apiRes.ok) {
                const errText = await apiRes.text();
                throw new Error(`Pi API returned status ${apiRes.status}: ${errText}`);
            }
            userData = await apiRes.json();
        } else {
            userData = await makeHttpsGet('https://api.minepi.com/v2/me', headers);
        }
        
        const username = userData.username;
        console.log(`[Vox.w Auth Success] تم توثيق الرائد @${username} عبر شبكة باي بنجاح.`);
        
        // Ensure user has profile partition in vector database
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        if (!db[username]) {
            db[username] = {
                pioneer_id: username,
                created_at: new Date().toISOString(),
                interests: ["الذكاء الاصطناعي التوليدي"],
                writing_style: "ودود وتقني",
                recent_topics: [],
                embeddings_count: 1248,
                memory_shards: []
            };
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
        }
        
        res.json({
            success: true,
            user: { username: username, uid: userData.uid }
        });
    } catch (e) {
        console.error("❌ فشل التحقق من توكن شبكة باي:", e.message);
        res.status(401).json({ success: false, error: e.message });
    }
});


// API endpoint to verify Pi Network Sandbox payments (Option 1)
app.post('/api/payments/verify', (req, res) => {
    const { username, amount } = req.body;
    const userKey = username || "Demo_Pioneer";
    console.log(`[Vox.w Payment API] استلام طلب تحقق من دفع ${amount} Pi من الرائد @${userKey}`);
    
    try {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        
        if (!db[userKey]) {
            db[userKey] = {
                pioneer_id: userKey,
                created_at: new Date().toISOString(),
                interests: ["الذكاء المعزز"],
                writing_style: "تقني ومختصر",
                recent_topics: [],
                embeddings_count: 1248,
                memory_shards: []
            };
        }
        
        // Upgrade embedding capacity by +10,000 shards
        db[userKey].embeddings_count += 10000;
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
        
        const mockTxid = 'pi_tx_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        console.log(`[Vox.w Payment Success] تمت ترقية سعة @${userKey}. TXID: ${mockTxid}`);
        
        res.json({
            success: true,
            txid: mockTxid,
            new_capacity: db[userKey].embeddings_count,
            message: "تمت معالجة الدفع وترقية سعة المتجهات المعزولة للرائد بنجاح!"
        });
    } catch (e) {
        console.error("خطأ أثناء معالجة بوابة مدفوعات Pi:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});


// ----------------------------------------------------
// Option 1: System Prompt Engineering for GAI Learning & Cumulative Evolution
// ----------------------------------------------------
function buildAdaptiveSystemPrompt(pioneerId) {
    let profile = {
        interests: ["المجالات التقنية"],
        writing_style: "ودود وعملي",
        recent_topics: [],
        memory_shards: []
    };

    try {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        if (db[pioneerId]) {
            profile = db[pioneerId];
        } else {
            // Create a new partitioned memory profile for a new Pioneer
            db[pioneerId] = {
                pioneer_id: pioneerId,
                created_at: new Date().toISOString(),
                interests: [],
                writing_style: "محايد ومتعلم",
                recent_topics: [],
                embeddings_count: 0,
                memory_shards: []
            };
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
            profile = db[pioneerId];
        }
    } catch (e) {
        console.error("خطأ أثناء قراءة ملف قاعدة المتجهات:", e);
    }

    // Dynamic System Prompt generation combining static guidelines and user-evolved shards
    const memoryContext = profile.memory_shards.map(m => `- [مسترجع في ${m.timestamp}]: ${m.content}`).join('\n');
    
    return `
# دور الذكاء الاصطناعي الفردي الخارق (Super System Prompt for GAI - Vox.w)
أنت رفيق الذكاء الاصطناعي الشخصي المتطور والمستقل للرائد (@${pioneerId}). 
تأتي إجاباتك بناءً على الهوية المعرفية والوعي التراكمي المشترك بينكما.

## هوية الرائد الحالية المسترجعة من الذاكرة المتجهية (Pioneer Profile):
- الاهتمامات: ${profile.interests.join(', ')}
- أسلوب الحوار المفضل: ${profile.writing_style}
- المواضيع الأخيرة: ${profile.recent_topics.join(', ')}

## الشظايا المعرفية التراكمية المسترجعة (Retrieved Embeddings from Pinecone Shard):
${memoryContext || "لا توجد ذكريات سابقة مسجلة لهذا الرائد بعد. ابدأ التعرف عليه وتوثيق تفضيلاته."}

## قواعد السلوك والتطور التراكمي:
1. **التعلم التراكمي:** بعد كل إجابة، استنتج أي تفضيلات شخصية أو اهتمامات جديدة للرائد وقم بتوثيقها فوراً.
2. **الخصوصية التامة:** هذه الذاكرة معزولة ومتفردة لهذا الرائد فقط ولا يتم مشاركتها أبداً مع خوادم أخرى.
3. **الأداء الصوتي والسرعة:** عند الرد عبر الصوت، حافظ على إجابات قصيرة ونبرة تناسب الأسلوب الشخصي للرائد.
`;
}

// Update the database with new user interactions
function saveNewMemoryShard(pioneerId, userText, replyText) {
    try {
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        if (!db[pioneerId]) return;

        // Perform simple keyphrase extraction simulation for embedding vector logic
        let newShard = null;
        if (userText.includes("أفضل") || userText.includes("أحب") || userText.includes("اهتمامي")) {
            newShard = `الرائد يعبر عن تفضيل مباشر: "${userText}"`;
        } else if (userText.length > 15) {
            newShard = `تفاعل الرائد حول: "${userText.substring(0, 40)}..."`;
        }

        if (newShard) {
            db[pioneerId].memory_shards.push({
                id: `m_${Date.now()}`,
                content: newShard,
                timestamp: new Date().toISOString()
            });
            db[pioneerId].embeddings_count += 4; // Simulated dynamic indexing growth
            
            // Limit memory shards to last 15 items for contextual efficiency
            if (db[pioneerId].memory_shards.length > 15) {
                db[pioneerId].memory_shards.shift();
            }
            
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
            console.log(`[Vox.w Database] تم تحديث الذاكرة التكيفية للرائد @${pioneerId} (+4 متجهات)`);
        }
    } catch (e) {
        console.error("فشل تحديث الشظايا المعرفية:", e);
    }
}

// ----------------------------------------------------
// Option 2: Live communications and Signaling Server (WebSockets / WebRTC)
// ----------------------------------------------------
wss.on('connection', (ws) => {
    console.log('[Vox.w Socket] اتصال جديد وارد من عميل...');

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.error("تعذر تحليل رسالة العميل:", e);
            return;
        }

        const username = data.username || 'Demo_Pioneer';

        switch (data.type) {
            case 'text_chat':
                console.log(`[Vox.w Text] رسالة من @${username}: ${data.message}`);
                
                // 1. بناء موجه النظام التراكمي المخصص
                const systemPrompt = buildAdaptiveSystemPrompt(username);
                
                // 2. محاكاة الرد المعرفي التراكمي
                setTimeout(() => {
                    let responseText = "";
                    if (data.message.includes("من أنا") || data.message.includes("تذكرني")) {
                        responseText = `أنت الرائد @${username}. أتذكر اهتمامك بـ ${buildAdaptiveSystemPrompt(username).match(/الاهتمامات: (.*)/)?.[1] || "التطوير البرمجي"} وتصميم واجهة Vox.w المميزة بالأرجواني والأخضر. ذاكرتي تنمو معك باستمرار!`;
                    } else {
                        responseText = `أستقبل إشارتك يا @${username} عبر WebSocket. لقد قمت بمراجعة توجيهي التراكمي الخاص بك وربطه بالمتجهات الحالية لتقديم هذه الاستجابة المناسبة.`;
                    }

                    // 3. تحديث الذاكرة التكيفية بناءً على المحادثة الجديدة
                    saveNewMemoryShard(username, data.message, responseText);

                    ws.send(JSON.stringify({
                        type: 'text_response',
                        message: responseText
                    }));
                }, 800);
                break;

            case 'voice_message':
                console.log(`[Vox.w Voice] تم استلام دفق صوتي WebM بحجم ${data.audioData ? data.audioData.length : 0} بايت من @${username}`);
                
                // محاكاة تحويل الصوت إلى نص (Whisper STT)
                setTimeout(() => {
                    const simulatedText = "أرغب في تحديث المعرفة الذاتية للـ GAI الخاص بي اليوم";
                    
                    ws.send(JSON.stringify({
                        type: 'voice_to_text',
                        text: simulatedText
                    }));

                    // تمرير النص للذكاء لتوليد الإجابة
                    const systemPrompt = buildAdaptiveSystemPrompt(username);
                    const responseText = `تم فك تشفير رسالتك الصوتية: "${simulatedText}". وقمت بتحديث شظايا الذاكرة في Pinecone بنجاح.`;
                    
                    saveNewMemoryShard(username, simulatedText, responseText);

                    ws.send(JSON.stringify({
                        type: 'text_response',
                        message: responseText
                    }));
                }, 1200);
                break;

            // WebRTC Signaling messages (Option 2 implementation detail)
            case 'rtc_offer':
                console.log(`[Vox.w WebRTC] تم استقبال Offer SDP من @${username}`);
                // هنا يتم إرسال Offer إلى خادم الصوت الذكي أو إعادة توجيهه لبدء بث الـ GAI الصوتي الفوري
                // في وضع التوضيح، نقوم بالرد بـ Answer SDP مصطنع لبدء تيار الصوت فورا
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        type: 'rtc_answer',
                        sdp: 'v=0\no=- 42342 2 IN IP4 127.0.0.1\ns=-\nt=0 0\na=group:BUNDLE audio\nm=audio 9 UDP/TLS/RTP/SAVPF 111...'
                    }));
                    console.log(`[Vox.w WebRTC] تم إرسال Answer SDP للرائد @${username} لبدء دفق الصوت الفوري`);
                }, 500);
                break;

            case 'ice_candidate':
                console.log(`[Vox.w WebRTC] تم استقبال Candidate: ${data.candidate ? data.candidate.substring(0, 30) : 'null'} من @${username}`);
                break;

            default:
                console.log(`[Vox.w Socket] نوع رسالة غير معروف: ${data.type}`);
        }
    });

    ws.on('close', () => {
        console.log('[Vox.w Socket] غادر العميل الاتصال.');
    });
});

// Start listening
server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 خادم Vox.w الشخصي يعمل بنجاح!`);
    console.log(`📂 تفضل بزيارة الرابط محلياً: http://localhost:${PORT}`);
    console.log(`🛡️ مصادقة Pi Browser مفعلة وتنتظر بيئة التطوير.`);
    console.log(`====================================================`);
});
