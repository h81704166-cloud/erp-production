import React, { useState } from 'react';
import {
  Presentation,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Zap,
  Calculator,
  DollarSign,
  Smartphone,
  FileSpreadsheet,
  Award,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  Printer,
  ShoppingBag,
  Users,
  Building,
  ArrowRight,
  ShieldAlert,
  Flame,
  Star,
  Target,
  Clock,
  Briefcase
} from 'lucide-react';

export function SalesPitchModule() {
  const [activeTab, setActiveTab] = useState<'slides' | 'roi' | 'objections' | 'pricing' | 'script'>('slides');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copiedScript, setCopiedScript] = useState(false);

  // ROI Calculator state
  const [monthlySales, setMonthlySales] = useState<number>(300000); // 3 Lakhs
  const [udharAmount, setUdharAmount] = useState<number>(50000); // 50k Udhar
  const [caMonthlyFee, setCaMonthlyFee] = useState<number>(2500); // 2.5k CA fee
  const [billingTimeMinutes, setBillingTimeMinutes] = useState<number>(4); // min per customer

  // ROI Calculations
  const timeSavedValue = Math.round((billingTimeMinutes * 0.75 * (monthlySales / 500)) * 2); // Value of time saved in Rs
  const udharBadDebtPrevented = Math.round(udharAmount * 0.15); // 15% bad debt prevented via auto SMS
  const stockLeakageSaved = Math.round(monthlySales * 0.03); // 3% stock leakage saved
  const caCostSavings = Math.round(caMonthlyFee * 0.6); // 60% CA cost saved
  const totalMonthlySavings = timeSavedValue + udharBadDebtPrevented + stockLeakageSaved + caCostSavings;
  const yearlySavings = totalMonthlySavings * 12;

  const slides = [
    {
      id: 1,
      tag: 'SLIDE 1: HOOK & PAIN POINT',
      titleEn: 'Why Traditional Shopkeepers Lose ₹15,000 to ₹30,000 Every Month',
      titleHi: 'दुकानदार हर महीने ₹15,000 से ₹30,000 का नुकसान क्यों झेलते हैं?',
      badge: 'The Problem',
      color: 'from-amber-500 to-rose-600',
      points: [
        {
          headEn: '1. Slow Paper/Manual Billing',
          headHi: '1. धीमी कागजी बिलिंग और लंबी लाइनें',
          descEn: 'Rush hours result in lost customers because manual bill calculation takes 3-5 minutes per customer.',
          descHi: 'रश ऑवर्स में ग्राहक कतार देखकर लौट जाते हैं, क्योंकि हाथ से बिल बनाने में 3-5 मिनट लगते हैं।'
        },
        {
          headEn: '2. Bad Udhar Recoveries & Forgotten Khata',
          headHi: '2. उधार का फंसा हुआ पैसा और भूलने का नुकसान',
          descEn: 'Over 15-20% of customer udhar is forgotten or delayed without automated SMS & WhatsApp reminders.',
          descHi: 'बिना ऑटोमैटिक रिमाइंडर्स के 15-20% उधार डूब जाता है या महीनों तक फंसा रहता है।'
        },
        {
          headEn: '3. Stock Leakage & Expiry Losses',
          headHi: '3. स्टॉक की चोरी, वेस्टेज और एक्सपायरी का नुकसान',
          descEn: 'Without real-time stock alerts, expired products and un-tracked inventory cause silent losses.',
          descHi: 'बिना अलर्ट्स के सामान की एक्सपायरी और बिना एंट्री का माल दुकान में बड़ा घाटा देता है।'
        },
        {
          headEn: '4. Heavy CA Fees for GST Filing',
          headHi: '4. GST फाइलिंग पर CA को भारी फीस',
          descEn: 'Shopkeepers pay thousands per month to CAs to compile invoices and file GSTR-1 & 3B.',
          descHi: 'मैन्युअल बिलों को जमा करके GSTR-1 और 3B बनवाने के लिए सीए को हर महीने हज़ारों देने पड़ते हैं।'
        }
      ],
      speakerNotes: `🗣️ **Pitch Script for Slide 1 (Hinglish/Hindi):**
"नमस्ते सेठ जी! आपने नोट किया होगा कि दुकान में सारा दिन मेहनत करने के बाद भी महीने के आखिर में हिसाब पूरा नहीं बैठता? 
कारण बहुत सिंपल है: 
1. रश टाइम में ग्राहक को 5 मिनट बिलिंग में लगते हैं, जिससे ग्राहक दूसरी दुकान चला जाता है।
2. कॉपी-डायरी में लिखा उधार याद ही नहीं रहता या मांगते वक्त झिझक होती है।
3. कौन सा माल एक्सपायर हो रहा है या खत्म हो गया, पता ही नहीं चलता।
BillKart ERP इन चारों समस्याओं का परमानेंट समाधान है!"`
    },
    {
      id: 2,
      tag: 'SLIDE 2: THE SOLUTION',
      titleEn: 'Introducing BillKart ERP: 10-in-1 Complete Business Management Engine',
      titleHi: 'पेश है BillKart ERP: आपकी दुकान का 10-इन-1 डिजिटल सुपर-पावर',
      badge: 'The Solution',
      color: 'from-emerald-600 to-teal-700',
      points: [
        {
          headEn: '⚡ 2-Second Superfast POS & Thermal Printing',
          headHi: '⚡ 2-सेकंड में बारकोड बिलिंग और थर्मल प्रिंटिंग',
          descEn: 'Supports barcode scanners, wireless Bluetooth/USB thermal printers, and instantly prints professional GST bills.',
          descHi: 'बारकोड स्कैनर और ब्लूटूथ/USB थर्मल प्रिंटर के साथ पलक झपकते ही पक्का GST बिल निकालें।'
        },
        {
          headEn: '📲 Direct WhatsApp & SMS Invoice Sharing',
          headHi: '📲 ग्राहक के मोबाइल पर डायरेक्ट WhatsApp बिल',
          descEn: 'Send elegant digital receipts & PDF invoices directly to customer WhatsApp without printing paper.',
          descHi: 'कागज बचाने और ग्राहकों को खुश करने के लिए सीधा उनके WhatsApp पर डिजिटल बिल भेजें।'
        },
        {
          headEn: '📶 100% Offline Engine (Works Without Internet)',
          headHi: '📶 100% ऑफलाइन मोड (इंटरनेट बंद होने पर भी काम चालू)',
          descEn: 'Built on Dexie IndexedDB fast database. Billing never stops even during complete internet blackout.',
          descHi: 'इंटरनेट बंद या वाई-फाई डाउन होने पर भी आपकी बिलिंग और दुकान का काम 1 सेकंड भी नहीं रुकेगा।'
        },
        {
          headEn: '📊 Automatic GST GSTR-1 & GSTR-3B Tax Filing',
          headHi: '📊 ऑटोमैटिक GST पोर्टल JSON और CSV रिपोर्ट',
          descEn: 'Generate official portal-ready GSTR-1 JSON files in 1 click. Save 70% of CA charges.',
          descHi: '1 क्लिक में GST पोर्टल की सीधी GSTR-1 JSON फाइल बनाएं और अपने CA के चक्कर से मुक्ति पाएं।'
        }
      ],
      speakerNotes: `🗣️ **Pitch Script for Slide 2 (Hinglish/Hindi):**
"सेठ जी, BillKart ERP केवल एक बिलिंग सॉफ्टवेयर नहीं है, यह आपकी दुकान की तिजोरी की सुरक्षा और रफ़्तार की गारंटी है।
चाहे इंटरनेट आए या जाए, आपका बिल 2 सेकंड में छपेगा। ग्राहक के फोन पर तुरंत WhatsApp बिल चला जाएगा, जिससे आपकी दुकान की छाप कॉर्पोरेट ब्रांड जैसी बनेगी!"`
    },
    {
      id: 3,
      tag: 'SLIDE 3: HIGH VALUE FEATURES',
      titleEn: 'Features That Deliver 10X Return On Investment (ROI)',
      titleHi: 'वो फीचर्स जो आपकी निवेश पर 10 गुना मुनाफा देंगे',
      badge: 'High-Impact Features',
      color: 'from-blue-600 to-indigo-700',
      points: [
        {
          headEn: '💰 Smart Khata & Automatic Udhar Reminders',
          headHi: '💰 स्मार्ट खाता और ऑटोमैटिक उधार वसूली',
          descEn: 'Tracks customer-wise pending due amounts. Send automated polite payment links & reminders.',
          descHi: 'हर ग्राहक का बैलेंस ट्रैक करें। व्हाट्सएप पर पेमेंट रिमाइंडर भेजकर उधार 3 गुना तेजी से वसूलें।'
        },
        {
          headEn: '📦 Multi-Godown & Batch Expiry Tracking',
          headHi: '📦 बैच नंबर, एक्सपायरी और मल्टी-गोदाम मैनेजमेंट',
          descEn: 'Get early warnings before items expire. Prevent sales of expired goods and clear old stock fast.',
          descHi: 'सामान खराब होने से 30 दिन पहले अलर्ट पाएं। पुराने बैच पहले बेचकर वेस्टेज ज़ीरो करें।'
        },
        {
          headEn: '👥 Staff Security & Role-Based Permissions',
          headHi: '👥 स्टाफ रोल परमिशन (कैश चोरी और डेटा प्राइवेसी सुरक्षा)',
          descEn: 'Restrict staff from editing past prices, seeing total profit, or deleting invoices.',
          descHi: 'कैशियर को पुराना बिल डिलीट करने या डिस्काउंट बदलने का हक न दें। आपका प्रॉफिट सेफ।'
        },
        {
          headEn: '📊 Live Analytics & Profit Reports',
          headHi: '📊 डेली प्रॉफिट और सेल का लाइव डैशबोर्ड',
          descEn: 'Know your exact net profit, top-selling items, and daily cash balance on your mobile/laptop.',
          descHi: 'आज दिन भर में कितना शुद्ध मुनाफा हुआ, कौन सा सामान ज्यादा बिका—सब 1 क्लिक में देखें।'
        }
      ],
      speakerNotes: `🗣️ **Pitch Script for Slide 3 (Hinglish/Hindi):**
"सेठ जी, सबसे बढ़िया बात है 'स्टाफ सिक्योरिटी'। आप दुकान पर न भी हों, तो भी कोई कर्मचारी पुराना बिल डिलीट नहीं कर सकता और न ही दुकान की कमाई बदल सकता है। 
साथ ही, आपकी उधारी का पैसा खुद-ब-खुद ग्राहकों से रिकवर होगा!"`
    },
    {
      id: 4,
      tag: 'SLIDE 4: PROOF OF VALUE',
      titleEn: 'How BillKart ERP Pays For Itself In Less Than 30 Days',
      titleHi: 'BillKart ERP सिर्फ 30 दिनों के अंदर अपना पूरा खर्च कैसे निकाल देता है?',
      badge: 'Guaranteed ROI',
      color: 'from-violet-600 to-purple-800',
      points: [
        {
          headEn: '⏱️ Billing Speed: 5 mins ➔ 15 Seconds',
          headHi: '⏱️ बिलिंग टाइम: 5 मिनट से सीधे 15 सेकंड',
          descEn: 'Serve 3X more customers during rush hours without hiring extra billing staff.',
          descHi: 'रश आवर्स में 3 गुना ज़्यादा ग्राहकों को बिना किसी अतिरिक्त कर्मचारी के तुरंत हैंडल करें।'
        },
        {
          headEn: '📈 15-20% Faster Udhar Cash Collection',
          headHi: '📈 15-20% तेज़ उधार वसूली',
          descEn: 'Professional ledger statements and instant reminders convert slow dues into fast cash.',
          descHi: 'प्रोफेशनल खाता स्टेटमेंट देने से ग्राहक तुरंत पेमेंट क्लियर करते हैं।'
        },
        {
          headEn: '🛡️ Zero Stock Leakage & Zero Hidden Losses',
          headHi: '🛡️ शून्य माल की हेराफेरी और शून्य एक्सपायरी नुकसान',
          descEn: 'Every item barcode scanned eliminates cash drawer discrepancies at end of day.',
          descHi: 'बारकोड स्कैन से बिकने पर कैश रजिस्टर और गल्ले का हिसाब ₹1-₹1 सटीक मिलता है।'
        },
        {
          headEn: '🌐 Multi-Store Centralized Control',
          headHi: '🌐 एक से अधिक दुकानों का सेंट्रल कंट्रोल',
          descEn: 'Manage multiple shop branches, godowns, and stock transfers from anywhere.',
          descHi: 'अगर आपकी 2 या 3 दुकानें हैं, तो घर बैठे सब दुकानों की बिक्री और स्टॉक देखें।'
        }
      ],
      speakerNotes: `🗣️ **Pitch Script for Slide 4 (Hinglish/Hindi):**
"आप देखिए सेठ जी! अगर इस सॉफ्टवेयर से आपका हर महीने ₹15,000 भी बचता है, तो साल भर में ₹1,80,000 की सीधी बचत होती है। 
इसके सामने सॉफ्टवेयर का सालाना खर्च चाय के खर्च से भी कम है!"`
    },
    {
      id: 5,
      tag: 'SLIDE 5: COMPETITOR ADVANTAGE',
      titleEn: 'Why BillKart ERP Superior to Generic Apps (Vyapar, Khatabook, Tally)',
      titleHi: 'BillKart ERP साधारण मोबाइल ऐप्स और टैली से बेहतर क्यों है?',
      badge: 'Unbeatable Comparison',
      color: 'from-emerald-700 to-slate-900',
      points: [
        {
          headEn: '✅ No Subscription Lockouts (100% Offline-First)',
          headHi: '✅ नो सब्सक्रिप्शन लॉकआउट (ऑफलाइन फर्स्ट आर्किटेक्चर)',
          descEn: 'Generic apps block billing if internet connection breaks. BillKart works seamlessly offline.',
          descHi: 'साधारण ऐप्स इंटरनेट कटते ही रुक जाती हैं। BillKart बिना इंटरनेट भी सुपरफास्ट चलती है।'
        },
        {
          headEn: '✅ Real Accounting: Master Ledger (Dr/Cr) & Audit Trails',
          headHi: '✅ असली डबल-एंट्री एकाउंटिंग और मास्टर लेजर',
          descEn: 'Simple apps lack true debit/credit master ledgers. BillKart provides enterprise-grade accounting.',
          descHi: 'साधारण ऐप्स सिर्फ कच्चा हिसाब रखती हैं, जबकि BillKart आपको असली बैंक-ग्रेड Dr/Cr लेजर देता है।'
        },
        {
          headEn: '✅ Built-in Service & Repair Module',
          headHi: '✅ इनबिल्ट सर्विस, रिपेयरिंग और जॉब वर्क मॉड्यूल',
          descEn: 'Ideal for shops offering repairs, tailoring, computer/mobile servicing, and custom work.',
          descHi: 'रिटेल के साथ-साथ रिपेयरिंग और सर्विसिंग का जॉब कार्ड भी 1 जगह संभालें।'
        },
        {
          headEn: '✅ Multi-User Concurrent Locks & Hardware Integration',
          headHi: '✅ मल्टी-यूजर लाइव लॉक और थर्मल प्रिंटर सपोर्ट',
          descEn: 'Connect cash drawers, weighing scales, and multiple POS counters simultaneously.',
          descHi: 'इलेक्ट्रॉनिक तराजू, गल्ला लॉक और ब्लूटूथ थर्मल प्रिंटर को सीधे कनेक्ट करें।'
        }
      ],
      speakerNotes: `🗣️ **Pitch Script for Slide 5 (Hinglish/Hindi):**
"बाकी ऐप्स मोबाइल के खिलौने जैसी हैं जो इंटरनेट न होने पर बंद हो जाती हैं या 2 दुकानदारों का हिसाब नहीं संभाल पातीं। 
BillKart एक हैवी-ड्यूटी एंटरप्राइज सिस्टम है जो सालों-साल आपकी दुकान को निर्बाध चलाएगा!"`
    }
  ];

  const copyScriptToClipboard = () => {
    const scriptText = `
🏆 BILLKART ERP - PREMIUM SHOPKEEPER SALES DEMO SCRIPT
===================================================

[INTRO - 1 MINUTE]
"नमस्ते सेठ जी! मैं आपकी दुकान के बिलिंग, स्टॉक और उधार वसूली को 100% डिजिटल और सुपरफास्ट बनाने आया हूँ।
क्या मैं आपको केवल 3 मिनट में दिखाऊँ कि आपकी दुकान से हर महीने ₹15,000 से ₹25,000 की सीधी बचत कैसे हो सकती है?"

[DEMO STEPS - 3 MINUTES]
1. POS Billing: Show barcode scan / quick product add & click print (2 seconds).
2. WhatsApp Invoice: Enter customer phone number, show instant digital receipt on phone.
3. Udhar Reminder: Open Udhar Khata, click 'Send Reminder' via SMS/WhatsApp.
4. Offline Test: Turn off Wi-Fi/Internet -> Create bill -> Show that it works flawlessly!
5. GST Report: Open GST Module, show 1-click GSTR-1 JSON export for CA.

[CLOSING - 1 MINUTE]
"सेठ जी! आज ही अपने बिज़नेस को अपग्रेड करें। हम आपको 1 साल की ऑन-साइट सपोर्ट, ट्रेनिंग और डेटा माइग्रेशन बिल्कुल फ्री दे रहे हैं।
क्या आप क्रेडिट कार्ड या UPI से बिलिंग स्टार्ट करेंगे?"
    `;
    navigator.clipboard.writeText(scriptText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 rounded-3xl border border-emerald-500/30 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-400 shrink-0">
            <Presentation className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-tight">
                Sales Demo & Pitch Deck Hub
              </h1>
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs rounded-full">
                विक्रेता पिच डेक (Hindi & English)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Use this pitch deck, ROI calculator, and objection handling script to present BillKart ERP to shopkeepers & close high-margin sales deals.
            </p>
          </div>
        </div>

        <button
          onClick={copyScriptToClipboard}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          {copiedScript ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
          <span>{copiedScript ? 'Script Copied!' : 'Copy Demo Pitch Script'}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('slides')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'slides'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Presentation className="w-4 h-4" />
          <span>1. Presentation Slides ({slides.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roi')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'roi'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>2. Live ROI & Savings Calculator</span>
        </button>

        <button
          onClick={() => setActiveTab('objections')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'objections'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>3. Shopkeeper Objections Script</span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'pricing'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>4. Premium Pricing Model</span>
        </button>

        <button
          onClick={() => setActiveTab('script')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'script'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>5. 5-Minute Live Demo Pitch</span>
        </button>
      </div>

      {/* ================= TAB 1: PRESENTATION SLIDES ================= */}
      {activeTab === 'slides' && (
        <div className="space-y-6">
          {/* Active Slide Display */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg">
            {/* Slide Header */}
            <div className={`p-6 bg-gradient-to-r ${slides[currentSlide].color} text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
              <div>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full font-black text-[11px] uppercase tracking-wider text-white">
                  {slides[currentSlide].tag}
                </span>
                <h2 className="text-xl md:text-2xl font-black mt-2 leading-tight">
                  {slides[currentSlide].titleEn}
                </h2>
                <h3 className="text-sm md:text-base font-bold text-amber-200 mt-1">
                  {slides[currentSlide].titleHi}
                </h3>
              </div>

              {/* Slide Counter Controls */}
              <div className="flex items-center gap-2 shrink-0 bg-black/20 p-2 rounded-2xl backdrop-blur-sm">
                <button
                  onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
                  disabled={currentSlide === 0}
                  className="p-2 bg-white/20 hover:bg-white/30 disabled:opacity-30 rounded-xl text-white transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-black text-sm px-2 text-white">
                  {currentSlide + 1} / {slides.length}
                </span>
                <button
                  onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
                  disabled={currentSlide === slides.length - 1}
                  className="p-2 bg-white/20 hover:bg-white/30 disabled:opacity-30 rounded-xl text-white transition-all cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Slide Points Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {slides[currentSlide].points.map((pt, idx) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <h4 className="text-sm font-black text-slate-900 dark:text-emerald-300">
                    {pt.headEn}
                  </h4>
                  <h5 className="text-xs font-extrabold text-emerald-700 dark:text-amber-300">
                    {pt.headHi}
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {pt.descEn}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {pt.descHi}
                  </p>
                </div>
              ))}
            </div>

            {/* Speaker Notes */}
            <div className="p-5 bg-amber-500/10 border-t border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
              <div className="flex items-center gap-2 font-black uppercase tracking-wide text-[11px] text-amber-800 dark:text-amber-300 mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Presenter Speaker Note / स्पीच स्क्रिप्ट (Hindi):</span>
              </div>
              <pre className="whitespace-pre-wrap font-sans leading-relaxed text-xs">
                {slides[currentSlide].speakerNotes}
              </pre>
            </div>
          </div>

          {/* Slide Thumbnails Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlide(idx)}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  currentSlide === idx
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md font-black'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-80">
                  Slide {s.id}
                </span>
                <span className="text-xs font-bold line-clamp-2 mt-1">
                  {s.titleEn}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 2: LIVE ROI CALCULATOR ================= */}
      {activeTab === 'roi' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-emerald-300 flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-emerald-500" />
                  <span>Shopkeeper ROI & Profit Calculator (मुनाफा कैलकुलेटर)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Show this calculator to shopkeepers during demo. Adjust parameters to prove how much money BillKart ERP saves them every month!
                </p>
              </div>
              <span className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-xs rounded-xl">
                Live Savings Estimator
              </span>
            </div>

            {/* Calculator Sliders & Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Sliders */}
              <div className="space-y-5 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                  Dukan Business Metrics (दुकान के आंकड़े)
                </h3>

                {/* Slider 1: Monthly Sales */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Monthly Sales Volume (मासिक बिक्री):</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{monthlySales.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min={50000}
                    max={2000000}
                    step={25000}
                    value={monthlySales}
                    onChange={(e) => setMonthlySales(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>₹50,000</span>
                    <span>₹20 Lakhs</span>
                  </div>
                </div>

                {/* Slider 2: Udhar Dues */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Average Udhar/Khata Outstanding (उधार बाकी):</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{udharAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min={5000}
                    max={500000}
                    step={5000}
                    value={udharAmount}
                    onChange={(e) => setUdharAmount(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>₹5,000</span>
                    <span>₹5 Lakhs</span>
                  </div>
                </div>

                {/* Slider 3: CA GST Fee */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Monthly CA / Tax Advocate Fee (सीए फीस):</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{caMonthlyFee.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={10000}
                    step={500}
                    value={caMonthlyFee}
                    onChange={(e) => setCaMonthlyFee(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>₹500</span>
                    <span>₹10,000</span>
                  </div>
                </div>

                {/* Slider 4: Time per bill */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Current Manual Bill Time (हाथ से बिलिंग समय):</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">{billingTimeMinutes} Minutes / Bill</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={1}
                    value={billingTimeMinutes}
                    onChange={(e) => setBillingTimeMinutes(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>1 Min (Fast)</span>
                    <span>8 Mins (Slow Paper)</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Calculated Savings Output */}
              <div className="p-6 bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950 rounded-2xl border border-emerald-500/30 text-white space-y-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                      ESTIMATED SHOPKEEPER SAVINGS
                    </span>
                    <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  </div>

                  <div className="mt-4">
                    <span className="text-xs text-slate-300 font-semibold block">Total Estimated Savings per Month:</span>
                    <span className="text-4xl font-black text-emerald-400 tracking-tight">
                      ₹{totalMonthlySavings.toLocaleString('en-IN')} <span className="text-xs text-emerald-300 font-bold">/ Month</span>
                    </span>
                    <span className="text-sm font-extrabold text-amber-300 block mt-1">
                      ₹{yearlySavings.toLocaleString('en-IN')} saved every year! (साल की कुल बचत)
                    </span>
                  </div>
                </div>

                {/* Detailed Savings Breakdown */}
                <div className="space-y-2.5 bg-black/30 p-4 rounded-xl border border-emerald-500/20 text-xs">
                  <div className="flex justify-between text-slate-200">
                    <span>⏱️ Billing Time Efficiency (समय की बचत):</span>
                    <span className="font-bold text-emerald-300">₹{timeSavedValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-200">
                    <span>💰 Udhar Bad Debt Prevention (उधार रिकवरी):</span>
                    <span className="font-bold text-emerald-300">₹{udharBadDebtPrevented.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-200">
                    <span>📦 Expiry & Stock Leakage Saved (स्टॉक लीकेज):</span>
                    <span className="font-bold text-emerald-300">₹{stockLeakageSaved.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-200">
                    <span>📊 CA GST Filing Expense Reduction (सीए फीस):</span>
                    <span className="font-bold text-emerald-300">₹{caCostSavings.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Closing Pitch Trigger */}
                <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/40 text-[11px] text-emerald-200 font-semibold">
                  💡 <strong>Sales Pitch Line:</strong> "सेठ जी, आप BillKart ERP के लिए सिर्फ ₹499/महीना देंगे और यह सॉफ्टवेयर आपकी दुकान में ₹{totalMonthlySavings.toLocaleString('en-IN')} हर महीने बचाएगा! यह खर्चा नहीं, 100% फायदा है!"
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: SHOPKEEPER OBJECTIONS SCRIPT ================= */}
      {activeTab === 'objections' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-emerald-300 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-emerald-500" />
                <span>Shopkeeper Objection Handling Scripts (दुकानदार के सवालों के सही जवाब)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Read these exact field-tested scripts to respond to common shopkeeper hesitations and close the sale easily.
              </p>
            </div>

            <div className="space-y-4">
              {/* Objection 1 */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>Objection 1: "मुझे कंप्यूटर या नया सॉफ्टवेयर चलाना नहीं आता, यह कठिन होगा!"</span>
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-slate-800 dark:text-emerald-200 space-y-1.5 font-medium">
                  <p className="font-black text-emerald-700 dark:text-emerald-400">
                    🎯 Winning Response Script (हिन्दी उत्तर):
                  </p>
                  <p>
                    "सेठ जी! बिल्कुल सही बात है। लेकिन BillKart ERP को स्मार्टफोन चलाने से भी आसान बनाया गया है। अगर आपको WhatsApp पर मैसेज भेजना आता है, तो आप 5 मिनट में बिलिंग सीख जाएंगे!
                  </p>
                  <p>
                    आपको सिर्फ प्रोडक्ट का नाम या बारकोड टच करना है और 1 बटन दबाना है—बिल छप जाएगा। साथ ही, हमारी टीम आपके काउंटर पर आकर आपके स्टाफ को पूरी ट्रेनिंग फ्री में देगी!"
                  </p>
                </div>
              </div>

              {/* Objection 2 */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>Objection 2: "हमारे यहाँ अक्सर इंटरनेट बंद रहता है या वाई-फाई चला जाता है!"</span>
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-slate-800 dark:text-emerald-200 space-y-1.5 font-medium">
                  <p className="font-black text-emerald-700 dark:text-emerald-400">
                    🎯 Winning Response Script (हिन्दी उत्तर):
                  </p>
                  <p>
                    "यही तो BillKart ERP का सबसे बड़ा जादू है सेठ जी! बाकी साधारण ऐप्स इंटरनेट कटते ही बंद हो जाती हैं। लेकिन हमारा सॉफ्टवेयर 100% ऑफलाइन काम करता है।
                  </p>
                  <p>
                    इंटरनेट हो या न हो, आपकी दुकान की बिलिंग, प्रिंटिंग और स्टॉक चेकिंग बिना रुकावट चलेगी। जब इंटरनेट वापस आएगा, तो सारा डेटा बैकग्राउंड में अपने आप सिंक हो जाएगा!"
                  </p>
                </div>
              </div>

              {/* Objection 3 */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>Objection 3: "सॉफ्टवेयर थोड़ा महंगा लग रहा है, बाज़ार में कुछ फ्री/सस्ते ऐप्स भी हैं!"</span>
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-slate-800 dark:text-emerald-200 space-y-1.5 font-medium">
                  <p className="font-black text-emerald-700 dark:text-emerald-400">
                    🎯 Winning Response Script (हिन्दी उत्तर):
                  </p>
                  <p>
                    "सेठ जी! सस्ती ऐप्स शुरुआत में फ्री दिखती हैं, लेकिन बाद में डेटा लॉक कर देती हैं या रश टाइम में क्रैश हो जाती हैं। उनसे एक भी बिल छूटा या स्टॉक का नुकसान हुआ, तो हज़ारों डूब जाते हैं।
                  </p>
                  <p>
                    BillKart ERP कोई खर्चा नहीं है, यह एक निवेश है। जो सॉफ्टवेयर आपकी दुकान में हर महीने ₹15,000 की चोरी, एक्सपायरी और उधार रिकवरी से बचाए, क्या उसके लिए ₹15-₹20 प्रतिदिन देना महंगा है?"
                  </p>
                </div>
              </div>

              {/* Objection 4 */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>Objection 4: "क्या मेरा दुकान का डेटा और कमाई की जानकारी सुरक्षित रहेगी?"</span>
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-slate-800 dark:text-emerald-200 space-y-1.5 font-medium">
                  <p className="font-black text-emerald-700 dark:text-emerald-400">
                    🎯 Winning Response Script (हिन्दी उत्तर):
                  </p>
                  <p>
                    "100% सुरक्षित! आपका सारा डेटा आपके लोकल डिवाइस (कंप्यूटर/मोबाइल) पर 256-bit बैंक स्तर के एन्क्रिप्शन से स्टोर रहता है। 
                  </p>
                  <p>
                    इसके अलावा, कोई भी स्टाफ मेंबर आपकी कुल कमाई या लाभ नहीं देख सकता। आप जब चाहें 1-क्लिक में गूगल ड्राइव या एक्सेल में बैकअप ले सकते हैं।"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: PREMIUM PRICING MODEL ================= */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="px-3.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs rounded-full uppercase">
                Premium Pricing Strategy
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-emerald-300">
                BillKart ERP Pricing Plans for Retailers
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Offer these 3 flexible pricing tiers to shopkeepers. Position the Pro Growth Plan as the most popular choice!
              </p>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Plan 1: Starter Retail */}
              <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6 flex flex-col justify-between">
                <div>
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-slate-500">Starter Pack</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Basic Retailer</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ideal for small kirana & retail counters</p>
                  </div>

                  <div className="mt-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-3xl font-black text-slate-900 dark:text-emerald-400">₹4,999</span>
                    <span className="text-xs text-slate-500 font-bold"> / Year</span>
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      Lifetime License: ₹9,999 (One-time)
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Single Counter POS Billing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Thermal Printer & Barcode Support</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>WhatsApp Digital Invoices</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>100% Offline Mode Billing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Customer Udhar Khata Ledger</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2">
                  <span className="block text-center p-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-black text-xs">
                    Basic Solution
                  </span>
                </div>
              </div>

              {/* Plan 2: Pro Growth (Popular) */}
              <div className="p-6 bg-gradient-to-b from-slate-900 to-emerald-950 rounded-3xl border-2 border-emerald-500 shadow-xl space-y-6 flex flex-col justify-between text-white relative overflow-hidden">
                <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500 text-slate-950 font-black text-[10px] uppercase rounded-full tracking-wider">
                  MOST POPULAR
                </div>

                <div>
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-emerald-400">Pro Business</span>
                    <h3 className="text-xl font-black text-white">Growth Retailer ERP</h3>
                    <p className="text-xs text-emerald-200">For supermarkets, apparel & high volume shops</p>
                  </div>

                  <div className="mt-4 pb-4 border-b border-emerald-500/30">
                    <span className="text-3xl font-black text-emerald-400">₹8,999</span>
                    <span className="text-xs text-emerald-200 font-bold"> / Year</span>
                    <div className="text-[11px] font-bold text-amber-300 mt-1">
                      Lifetime License: ₹17,999 (One-time)
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2.5 text-xs text-emerald-100 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Everything in Basic Pack +</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Automatic GST Filing (GSTR-1 & 3B JSON)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Batch Expiry & Low Stock Alerts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Staff Role Permissions & Audit Shield</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Automated WhatsApp Payment Reminders</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>1-Click Google Sheets Auto Sync</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2">
                  <span className="block text-center p-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black text-xs shadow-md">
                    Recommended Deal ⭐
                  </span>
                </div>
              </div>

              {/* Plan 3: Multi-Store Enterprise */}
              <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6 flex flex-col justify-between">
                <div>
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-purple-600 dark:text-purple-400">Multi-Branch</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Enterprise Network</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">For multi-store chains & godown networks</p>
                  </div>

                  <div className="mt-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-3xl font-black text-slate-900 dark:text-emerald-400">₹24,999</span>
                    <span className="text-xs text-slate-500 font-bold"> Lifetime</span>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                      + ₹4,999 Annual Cloud Server Maintenance
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>Multi-Store Stock Transfer Management</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>Unlimited POS Counters & Devices</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>Dedicated Master Ledger (Dr/Cr) Accounting</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>Custom Thermal Invoice Logo Setup</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>Priority On-Site Support & Onboarding</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2">
                  <span className="block text-center p-2.5 bg-purple-600 text-white rounded-2xl font-black text-xs">
                    Multi-Branch Pack
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: 5-MINUTE LIVE DEMO PITCH ================= */}
      {activeTab === 'script' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-emerald-300 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-emerald-500" />
                  <span>5-Minute On-Counter Live Demo Script (लाइव डेमो गाइड)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Follow these exact 5 steps when demonstrating the ERP to a shopkeeper on their counter.
                </p>
              </div>

              <button
                onClick={copyScriptToClipboard}
                className="px-4 py-2 bg-emerald-600 text-white font-black text-xs rounded-xl flex items-center gap-2 hover:bg-emerald-500 transition-all cursor-pointer shrink-0"
              >
                {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedScript ? 'Copied!' : 'Copy Demo Script'}</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] rounded-full uppercase">
                    Step 1 (Minute 1) - The Speed Test
                  </span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  ⚡ Demonstrate 2-Second Superfast POS Billing
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  <strong>Action:</strong> Open POS Module on laptop/mobile. Add 2 products, click "Pay & Print" with Thermal Printer or Instant Preview. Show how the total, GST breakup, and discount are calculated instantly.
                  <br />
                  <span className="text-emerald-600 dark:text-emerald-400 italic">Say this: "सेठ जी! देखिए 2 सेकंड में आपका पक्का बिल तैयार। रश टाइम में 100 ग्राहक भी आएंगे, तो कतार नहीं लगेगी!"</span>
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] rounded-full uppercase">
                    Step 2 (Minute 2) - WhatsApp Digital Invoice
                  </span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  📲 Show Direct WhatsApp Bill Sharing
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  <strong>Action:</strong> Put the shopkeeper's mobile number into the customer field and click "Send WhatsApp Invoice".
                  <br />
                  <span className="text-emerald-600 dark:text-emerald-400 italic">Say this: "देखिए सेठ जी, ग्राहक के फोन पर तुरंत आपकी दुकान के नाम से सुंदर डिजिटल रसीद पहुँच गई! इससे कागज भी बचेगा और ग्राहक भी इम्प्रेस होगा।"</span>
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] rounded-full uppercase">
                    Step 3 (Minute 3) - Udhar Khata Recovery
                  </span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  💰 Udhar Recovery & Auto Payment Reminder
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  <strong>Action:</strong> Open Udhar & Recovery module. Show customer balance and click "Send Reminders".
                  <br />
                  <span className="text-emerald-600 dark:text-emerald-400 italic">Say this: "आपको किसी ग्राहक से हाथ जोड़कर उधार मांगने की जरूरत नहीं। सॉफ्टवेयर खुद-ब-खुद ऑटोमैटिक मैसेज भेजकर आपका फंसा हुआ पैसा निकालेगा!"</span>
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] rounded-full uppercase">
                    Step 4 (Minute 4) - The Internet Blackout Test
                  </span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  📶 Turn Off Wi-Fi & Demonstrate 100% Offline Mode
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  <strong>Action:</strong> Turn off Wi-Fi/Mobile Data on your device. Show the top status bar saying "Offline Mode Active". Create a bill. Show that it bills & saves with zero lag.
                  <br />
                  <span className="text-emerald-600 dark:text-emerald-400 italic">Say this: "देखिए सेठ जी! इंटरनेट बंद है, फिर भी सॉफ्टवेयर 1 सेकंड में चल रहा है। आपकी दुकान कभी बंद नहीं होगी!"</span>
                </p>
              </div>

              {/* Step 5 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] rounded-full uppercase">
                    Step 5 (Minute 5) - The Close
                  </span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  🤝 1-Click GST Export & Deal Closing
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  <strong>Action:</strong> Open GST Module, show 1-click GSTR-1 JSON Portal Download. Present the Pro Growth Plan (₹8,999/year or ₹17,999 Lifetime).
                  <br />
                  <span className="text-emerald-600 dark:text-emerald-400 italic">Say this: "सेठ जी! आज ही अपनी दुकान को डिजिटल बनाइए। हम आज ही आपका सारा पुराना डेटा फ्री में कंप्यूटर में ट्रांसफर करके देंगे। कैश देंगे या UPI करेंगे?"</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
