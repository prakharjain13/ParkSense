/**
 * ParkSense — Global Internationalization (i18n) Engine
 * Handles full site translation between English (EN) and Hindi (HI)
 */

const i18nDict = {
  en: {
    // Navigation
    nav_home: "Home",
    nav_live_map: "Live Spot Map",
    nav_rates: "Rates & Estimator",
    nav_attendant_hub: "Attendant Hub",
    nav_sign_in: "Sign In",
    nav_logout: "Logout",

    // Welcome Hero
    hero_title_1: "Park Smarter.",
    hero_title_2: "Everyday.",
    hero_subtitle: "Welcome to ParkSense — the intelligent multi-level parking garage management system. Real-time spot availability, interactive floor maps, automated vehicle assignment, and transparent fee calculation.",
    hero_cta_hub: "Open Attendant Hub",
    hero_cta_map: "View Live Spot Map",
    hero_spots_available: "garage spots available right now",
    hero_badge: "PARKSENSE MANAGEMENT • CITY CENTRE GARAGE",

    // Navigation Portals (Welcome Page)
    portals_title: "System Navigation",
    portals_subtitle: "Direct access to every garage management module",
    portal_map_title: "Live Garage Spot Map",
    portal_map_desc: "Dedicated page for multi-level spot floor plans. Interactive Level 1, Level 2, and Level 3 layout with real-time vehicle tooltips.",
    portal_map_btn: "Go to Live Map →",
    portal_rates_title: "Rates & Fee Estimator",
    portal_rates_desc: "Interactive pricing calculator and rate schedule. Calculate exact stay fees before checkout based on tiered rates and daily caps.",
    portal_rates_btn: "Calculate Fees →",
    portal_hub_title: "Attendant Operations Hub",
    portal_hub_desc: "Single-screen operational control panel for vehicle check-in, checkout fee receipt generation, plate search, and paginated logs.",
    portal_hub_btn: "Open Attendant Hub →",

    // Live Spot Map Page
    map_page_title: "Live Garage Spot Map",
    map_page_subtitle: "Telemetry overview of all 75 parking bays across Levels 1–3",
    btn_refresh_map: "Refresh Spot Map",
    label_compact_bays: "Compact Bays",
    label_standard_bays: "Standard Bays",
    label_ev_bays: "EV Charger Bays",
    label_select_level: "Select Garage Level",
    label_hover_tooltip: "Hover occupied spots to inspect vehicle session",

    // Rates & Estimator Page
    rates_page_title: "Garage Rates & Fee Estimator",
    rates_page_subtitle: "Guaranteed transparent pricing. Tiered hourly rates with automated 24-hour daily maximum caps. Zero hidden fees.",
    calc_widget_title: "Interactive Stay Calculator",
    calc_widget_subtitle: "Select vehicle category and stay duration to compute exact fee",
    label_vehicle_category: "Vehicle Category",
    opt_compact: "Compact Car",
    opt_standard: "Standard Car / SUV",
    opt_ev: "Electric Vehicle (EV Charger Bay)",
    label_stay_duration: "Stay Duration (Hours)",
    label_calculated_fee: "Calculated Fee",
    rates_schedule_title: "Official Rate Schedule",
    rule1_title: "1. Partial Hour Rounding",
    rule1_desc: "Any portion of an hour (e.g. 15 minutes or 1 hour 10 minutes) rounds up to the next full hour block to ensure clear, predictable billing.",
    rule2_title: "2. Daily Cap Protection",
    rule2_desc: "No matter how many extra hours a vehicle stays in a 24-hour period, the total fee for that 24-hour block will never exceed the ₹200 daily cap.",
    rule3_title: "3. EV Charger Allocation",
    rule3_desc: "Electric vehicles are exclusively routed to Level 1 EV Charger bays (L1-E01 to L1-E15) to guarantee charging access upon arrival.",
    
    // Level 1 — T4 Messy Rate Card Import
    messy_rates_title: "Messy Rate Card Sanitizer (Level 1 — T4)",
    messy_rates_subtitle: "Paste raw messy rate cards containing noise symbols (e.g. ₹40/1st hr!, 20 RS extra, CAP: 200 INR). The system cleans and activates per-spot-type rates automatically.",
    btn_clean_rates: "Sanitize & Activate Rates",
    label_messy_input: "Raw Unstructured Rate Card Text",
    label_clean_diff: "Sanitization Audit Diff Log",

    // Dashboard & Operations
    dash_avail_title: "Real-Time Availability Summary",
    dash_live_map_title: "Live Garage Spot Map",
    dash_checkin_title: "Vehicle Check-In",
    dash_checkout_title: "Vehicle Check-Out",
    label_license_plate: "License Plate Number",
    btn_checkin_submit: "Assign Spot & Check In",
    label_search_active: "Search Active Vehicle by Plate",
    ph_search_plate: "Type plate to find active session...",
    dash_log_title: "Parking Session Log",
    ph_filter_plate: "Filter by plate...",
    opt_all_status: "All Status",
    opt_active_sessions: "Active Sessions",
    opt_completed_sessions: "Completed Sessions",
    opt_autoclosed_sessions: "Auto-Closed (Nightly 24h)",
    opt_all_categories: "All Categories",

    // Level 2 — T2 & Level 3 — T6
    btn_run_clock: "Run Nightly 24h Auto-Close (POST /clock)",
    btn_valet_transfer: "Valet Plate Hand-off",
    modal_transfer_title: "Valet Hand-off Plate Transfer (Level 3 — T6)",
    modal_transfer_subtitle: "Transfer an open parking session to a replacement vehicle plate. Spot bay allocation and original entry timestamp carry over intact.",
    label_new_plate: "Replacement Vehicle License Plate",
    label_transfer_reason: "Hand-off Reason / Notes",
    btn_confirm_transfer: "Confirm Valet Transfer",

    // Table Columns
    col_plate: "Plate",
    col_category: "Category",
    col_spot: "Spot Bay",
    col_checkin: "Check In",
    col_checkout: "Check Out",
    col_fee: "Fee",
    col_status: "Status",
    col_action: "Action"
  },
  hi: {
    // Navigation
    nav_home: "होम",
    nav_live_map: "लाइव स्पॉट मैप",
    nav_rates: "दरें और अनुमानक",
    nav_attendant_hub: "अटेंडेंट हब",
    nav_sign_in: "साइन इन",
    nav_logout: "लॉगआउट",

    // Welcome Hero
    hero_title_1: "पार्क स्मार्टर।",
    hero_title_2: "हर दिन।",
    hero_subtitle: "पार्कसेंस में आपका स्वागत है — बुद्धिमान बहु-स्तरीय पार्किंग गैराज प्रबंधन प्रणाली। रीयल-टाइम स्पॉट उपलब्धता, इंटरेक्टिव फ़्लोर मैप, स्वचालित वाहन असाइनमेंट और पारदर्शी शुल्क गणना।",
    hero_cta_hub: "अटेंडेंट हब खोलें",
    hero_cta_map: "लाइव स्पॉट मैप देखें",
    hero_spots_available: "गैराज स्पॉट अभी उपलब्ध हैं",
    hero_badge: "पार्कसेंस प्रबंधन • सिटी सेंटर गैराज",

    // Navigation Portals (Welcome Page)
    portals_title: "सिस्टम नेविगेशन",
    portals_subtitle: "प्रत्येक गैराज प्रबंधन मॉड्यूल तक सीधा पहुंच",
    portal_map_title: "लाइव गैराज स्पॉट मैप",
    portal_map_desc: "बहु-स्तरीय स्पॉट फ़्लोर प्लान के लिए समर्पित पृष्ठ। रीयल-टाइम वाहन विवरण के साथ लेआउट 1, लेआउट 2, लेआउट 3।",
    portal_map_btn: "लाइव मैप देखें →",
    portal_rates_title: "दरें और शुल्क अनुमानक",
    portal_rates_desc: "इंटरेक्टिव मूल्य निर्धारण कैलकुलेटर और दर तालिका। स्तरीय दरों और दैनिक सीमा के आधार पर चेकआउट से पहले सटीक शुल्क गणना करें।",
    portal_rates_btn: "शुल्क गणना करें →",
    portal_hub_title: "अटेंडेंट ऑपरेशन्स हब",
    portal_hub_desc: "वाहन चेक-इन, चेकआउट शुल्क रसीद, नंबर प्लेट खोज और लॉग के लिए एकल-स्क्रीन नियंत्रण कक्ष।",
    portal_hub_btn: "अटेंडेंट हब खोलें →",

    // Live Spot Map Page
    map_page_title: "लाइव गैराज स्पॉट मैप",
    map_page_subtitle: "स्तर 1-3 के सभी 75 पार्किंग बे का लाइव टेलीमेट्री अवलोकन",
    btn_refresh_map: "स्पॉट मैप रीफ़्रेश करें",
    label_compact_bays: "कॉम्पैक्ट बे",
    label_standard_bays: "स्टैंडर्ड बे",
    label_ev_bays: "ईवी चार्जर बे",
    label_select_level: "गैराज स्तर चुनें",
    label_hover_tooltip: "वाहन विवरण देखने के लिए ऑक्यूपाइड स्पॉट पर होवर करें",

    // Rates & Estimator Page
    rates_page_title: "गैराज दरें और शुल्क अनुमानक",
    rates_page_subtitle: "गारंटीकृत पारदर्शी मूल्य निर्धारण। 24 घंटे की स्वचालित दैनिक अधिकतम सीमा के साथ स्तरीय प्रति घंटा दरें।",
    calc_widget_title: "इंटरेक्टिव स्टे कैलकुलेटर",
    calc_widget_subtitle: "सटीक शुल्क की गणना के लिए वाहन श्रेणी और रुकने की अवधि चुनें",
    label_vehicle_category: "वाहन श्रेणी",
    opt_compact: "कॉम्पैक्ट कार",
    opt_standard: "स्टैंडर्ड कार / एसयूवी",
    opt_ev: "इलेक्ट्रिक वाहन (ईवी चार्जर बे)",
    label_stay_duration: "रुकने की अवधि (घंटे)",
    label_calculated_fee: "गणना किया गया शुल्क",
    rates_schedule_title: "आधिकारिक दर तालिका",
    rule1_title: "1. आंशिक घंटा राउंडिंग",
    rule1_desc: "घंटे का कोई भी हिस्सा (जैसे 15 मिनट या 1 घंटा 10 मिनट) स्पष्ट बिलिंग के लिए अगले पूरे घंटे के ब्लॉक में राउंड हो जाता है।",
    rule2_title: "2. दैनिक सीमा सुरक्षा",
    rule2_desc: "24 घंटे की अवधि में वाहन कितने भी अतिरिक्त घंटे रुकता है, उस 24 घंटे के ब्लॉक का कुल शुल्क कभी भी ₹200 दैनिक सीमा से अधिक नहीं होगा।",
    rule3_title: "3. ईवी चार्जर आवंटन",
    rule3_desc: "इलेक्ट्रिक वाहनों को आगमन पर चार्जिंग पहुंच की गारंटी के लिए विशेष रूप से स्तर 1 ईवी चार्जर बे (L1-E01 से L1-E15) पर भेजा जाता है।",

    // Level 1 — T4 Messy Rate Card Import
    messy_rates_title: "मेसी रेट कार्ड सैनिटाइजर (स्तर 1 — T4)",
    messy_rates_subtitle: "शोर प्रतीकों वाले कच्चे मेसी रेट कार्ड पेस्ट करें (जैसे ₹40/1st hr!, 20 RS extra, CAP: 200 INR)। सिस्टम प्रति स्पॉट-प्रकार दरों को स्वचालित रूप से साफ़ और सक्रिय करता है।",
    btn_clean_rates: "दरें साफ़ करें और सक्रिय करें",
    label_messy_input: "कच्चा असंरचित दर कार्ड पाठ",
    label_clean_diff: "सैनिटाइजेशन ऑडिट डिफ़ लॉग",

    // Dashboard & Operations
    dash_avail_title: "रीयल-टाइम उपलब्धता सारांश",
    dash_live_map_title: "लाइव गैराज स्पॉट मैप",
    dash_checkin_title: "वाहन चेक-इन",
    dash_checkout_title: "वाहन चेक-आउट",
    label_license_plate: "लाइसेंस प्लेट नंबर",
    btn_checkin_submit: "स्पॉट असाइन करें और चेक इन करें",
    label_search_active: "नंबर प्लेट द्वारा सक्रिय वाहन खोजें",
    ph_search_plate: "सक्रिय सत्र खोजने के लिए प्लेट टाइप करें...",
    dash_log_title: "पार्किंग सत्र लॉग",
    ph_filter_plate: "प्लेट द्वारा फ़िल्टर करें...",
    opt_all_status: "सभी स्थिति",
    opt_active_sessions: "सक्रिय सत्र",
    opt_completed_sessions: "पूरे हुए सत्र",
    opt_autoclosed_sessions: "ऑटो-क्लोज़्ड (नाइटली 24h)",
    opt_all_categories: "सभी श्रेणियां",

    // Level 2 — T2 & Level 3 — T6
    btn_run_clock: "नाइटली 24h ऑटो-क्लोज़ चलाएं (POST /clock)",
    btn_valet_transfer: "वैले प्लेट ट्रांसफर",
    modal_transfer_title: "वैले प्लेट ट्रांसफर (स्तर 3 — T6)",
    modal_transfer_subtitle: "एक सक्रिय पार्किंग सत्र को प्रतिस्थापन वाहन प्लेट पर स्थानांतरित करें। स्पॉट बे और मूल आगमन समय बरकरार रहता है।",
    label_new_plate: "नया वाहन लाइसेंस प्लेट नंबर",
    label_transfer_reason: "हैंड-ऑफ कारण / विवरण",
    btn_confirm_transfer: "वैले ट्रांसफर की पुष्टि करें",

    // Table Columns
    col_plate: "नंबर प्लेट",
    col_category: "श्रेणी",
    col_spot: "स्पॉट बे",
    col_checkin: "चेक इन",
    col_checkout: "चेक आउट",
    col_fee: "शुल्क",
    col_status: "स्थिति",
    col_action: "कार्रवाई"
  }
};

class LanguageManager {
  constructor() {
    this.currentLang = localStorage.getItem('parksense_lang') || 'en';
  }

  getLang() {
    return this.currentLang;
  }

  setLang(lang) {
    if (!i18nDict[lang]) return;
    this.currentLang = lang;
    localStorage.setItem('parksense_lang', lang);
    this.applyTranslations();
    this.updateSwitcherUI();
  }

  t(key) {
    return (i18nDict[this.currentLang] && i18nDict[this.currentLang][key]) || 
           (i18nDict['en'] && i18nDict['en'][key]) || key;
  }

  applyTranslations() {
    // Translate text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    // Translate placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.placeholder = this.t(key);
      }
    });
  }

  updateSwitcherUI() {
    const enBtn = document.getElementById('langEnBtn');
    const hiBtn = document.getElementById('langHiBtn');
    if (enBtn && hiBtn) {
      if (this.currentLang === 'hi') {
        enBtn.classList.remove('active');
        hiBtn.classList.add('active');
      } else {
        hiBtn.classList.remove('active');
        enBtn.classList.add('active');
      }
    }
  }

  init() {
    this.applyTranslations();
    this.updateSwitcherUI();

    // Attach click handlers to language buttons
    const enBtn = document.getElementById('langEnBtn');
    const hiBtn = document.getElementById('langHiBtn');

    if (enBtn) {
      enBtn.addEventListener('click', () => this.setLang('en'));
    }
    if (hiBtn) {
      hiBtn.addEventListener('click', () => this.setLang('hi'));
    }
  }
}

const i18n = new LanguageManager();

document.addEventListener('DOMContentLoaded', () => {
  i18n.init();
});
