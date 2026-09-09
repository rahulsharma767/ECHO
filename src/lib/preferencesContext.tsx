"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Language = "en" | "hi" | "bn" | "ta" | "te" | "mr";
type Theme = "dark" | "light";

type TranslationKey =
  | "theme" | "language" | "light" | "dark" | "scriptIntake" | "videoUpload" | "scenes"
  | "continuityLedger" | "commandSurface" | "live" | "increaseText" | "decreaseText"
  | "highContrast" | "colorBlind" | "dyslexiaFont" | "reduceMotion" | "textToSpeech" | "speechToText"
  | "accessibility" | "close" | "speechNotSupported" | "listening" | "production"
  | "postAudit" | "analysis" | "masterSlate" | "videoInput" | "scene" | "takeAnalysis"
  | "liveContinuitySlate";

const translations: Record<Language, Partial<Record<TranslationKey, string>>> = {
  en: { theme: "Theme", language: "Language", light: "Light", dark: "Dark", scriptIntake: "Script intake", videoUpload: "Video upload", scenes: "Scenes", continuityLedger: "Continuity ledger", commandSurface: "Command surface", live: "LIVE", increaseText: "Increase text size", decreaseText: "Decrease text size", highContrast: "High contrast", colorBlind: "Color blind friendly", dyslexiaFont: "Dyslexia-friendly font", reduceMotion: "Reduce motion", textToSpeech: "Read page aloud", speechToText: "Speech to text", accessibility: "Accessibility options", close: "Close", speechNotSupported: "Speech recognition is not supported in this browser.", listening: "Listening…", production: "Production", postAudit: "Post / Audit terminal", analysis: "Analysis", masterSlate: "Master slate", videoInput: "Video input", scene: "Scene", takeAnalysis: "Take analysis", liveContinuitySlate: "Live continuity slate" },
  hi: { theme: "थीम", language: "भाषा", light: "लाइट", dark: "डार्क", scriptIntake: "स्क्रिप्ट इनटेक", videoUpload: "वीडियो अपलोड", scenes: "दृश्य", continuityLedger: "कंटिन्यूटी लेजर", commandSurface: "कमांड सतह", live: "लाइव", increaseText: "टेक्स्ट बड़ा करें", decreaseText: "टेक्स्ट छोटा करें", highContrast: "हाई कॉन्ट्रास्ट", dyslexiaFont: "डिस्लेक्सिया-अनुकूल फ़ॉन्ट", reduceMotion: "मोशन कम करें", textToSpeech: "पेज पढ़कर सुनाएं", speechToText: "स्पीच से टेक्स्ट", accessibility: "एक्सेसिबिलिटी विकल्प", close: "बंद करें", speechNotSupported: "इस ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है।", listening: "सुन रहे हैं…", production: "प्रोडक्शन", postAudit: "पोस्ट / ऑडिट टर्मिनल", analysis: "विश्लेषण", masterSlate: "मास्टर स्लेट", videoInput: "वीडियो इनपुट", scene: "दृश्य", takeAnalysis: "टेक विश्लेषण", liveContinuitySlate: "लाइव कंटिन्यूटी स्लेट" },
  bn: { theme: "থিম", language: "ভাষা", light: "লাইট", dark: "ডার্ক", scriptIntake: "স্ক্রিপ্ট ইনটেক", videoUpload: "ভিডিও আপলোড", scenes: "দৃশ্য", continuityLedger: "কন্টিনিউটি লেজার", commandSurface: "কমান্ড সারফেস", live: "লাইভ", increaseText: "টেক্সট বড় করুন", decreaseText: "টেক্সট ছোট করুন", highContrast: "হাই কনট্রাস্ট", dyslexiaFont: "ডিসলেক্সিয়া-বান্ধব ফন্ট", reduceMotion: "মোশন কমান", textToSpeech: "পাতা পড়ে শোনান", speechToText: "স্পিচ থেকে টেক্সট", accessibility: "অ্যাক্সেসিবিলিটি বিকল্প", close: "বন্ধ করুন", speechNotSupported: "এই ব্রাউজারে স্পিচ রিকগনিশন সমর্থিত নয়।", listening: "শুনছি…", production: "প্রোডাকশন", postAudit: "পোস্ট / অডিট টার্মিনাল", analysis: "বিশ্লেষণ", masterSlate: "মাস্টার স্লেট", videoInput: "ভিডিও ইনপুট", scene: "দৃশ্য", takeAnalysis: "টেক বিশ্লেষণ", liveContinuitySlate: "লাইভ কন্টিনিউটি স্লেট" },
  ta: { theme: "தீம்", language: "மொழி", light: "லைட்", dark: "டார்க்", scriptIntake: "ஸ்கிரிப்ட் இன்டேக்", videoUpload: "வீடியோ பதிவேற்றம்", scenes: "காட்சிகள்", continuityLedger: "தொடர்ச்சி லெட்ஜர்", commandSurface: "கமாண்ட் மேற்பரப்பு", live: "நேரலை", increaseText: "உரை அளவை அதிகரிக்க", decreaseText: "உரை அளவை குறைக்க", highContrast: "உயர் மாறுபாடு", dyslexiaFont: "டிஸ்லெக்ஸியா நட்பு எழுத்துரு", reduceMotion: "அசைவைக் குறைக்க", textToSpeech: "பக்கத்தைப் படிக்க", speechToText: "பேச்சிலிருந்து உரை", accessibility: "அணுகல்தன்மை விருப்பங்கள்", close: "மூடு", speechNotSupported: "இந்த உலாவியில் பேச்சு அங்கீகாரம் ஆதரிக்கப்படவில்லை.", listening: "கேட்கிறது…", production: "தயாரிப்பு", postAudit: "பிந்தைய / தணிக்கை முனையம்", analysis: "பகுப்பாய்வு", masterSlate: "மாஸ்டர் ஸ்லேட்", videoInput: "வீடியோ உள்ளீடு", scene: "காட்சி", takeAnalysis: "டேக் பகுப்பாய்வு", liveContinuitySlate: "நேரலை தொடர்ச்சி ஸ்லேட்" },
  te: { theme: "థీమ్", language: "భాష", light: "లైట్", dark: "డార్క్", scriptIntake: "స్క్రిప్ట్ ఇన్‌టేక్", videoUpload: "వీడియో అప్‌లోడ్", scenes: "సన్నివేశాలు", continuityLedger: "కంటిన్యుటీ లెడ్జర్", commandSurface: "కమాండ్ ఉపరితలం", live: "లైవ్", increaseText: "వచనం పెద్దది చేయండి", decreaseText: "వచనం చిన్నది చేయండి", highContrast: "అధిక కాంట్రాస్ట్", dyslexiaFont: "డిస్లెక్సియా అనుకూల ఫాంట్", reduceMotion: "మోషన్ తగ్గించండి", textToSpeech: "పేజీని చదివి వినిపించండి", speechToText: "స్పీచ్ నుండి టెక్స్ట్", accessibility: "యాక్సెసిబిలిటీ ఎంపికలు", close: "మూసివేయి", speechNotSupported: "ఈ బ్రౌజర్‌లో స్పీచ్ రికగ్నిషన్‌కు మద్దతు లేదు.", listening: "వింటోంది…", production: "ప్రొడక్షన్", postAudit: "పోస్ట్ / ఆడిట్ టెర్మినల్", analysis: "విశ్లేషణ", masterSlate: "మాస్టర్ స్లేట్", videoInput: "వీడియో ఇన్‌పుట్", scene: "సన్నివేశం", takeAnalysis: "టేక్ విశ్లేషణ", liveContinuitySlate: "లైవ్ కంటిన్యుటీ స్లేట్" },
  mr: { theme: "थीम", language: "भाषा", light: "लाइट", dark: "डार्क", scriptIntake: "स्क्रिप्ट इनटेक", videoUpload: "व्हिडिओ अपलोड", scenes: "दृश्ये", continuityLedger: "कंटिन्यूटी लेजर", commandSurface: "कमांड पृष्ठभाग", live: "लाइव्ह", increaseText: "मजकूर मोठा करा", decreaseText: "मजकूर लहान करा", highContrast: "हाय कॉन्ट्रास्ट", dyslexiaFont: "डिस्लेक्सिया-अनुकूल फॉन्ट", reduceMotion: "मोशन कमी करा", textToSpeech: "पेज वाचून ऐकवा", speechToText: "स्पीच ते टेक्स्ट", accessibility: "अॅक्सेसिबिलिटी पर्याय", close: "बंद करा", speechNotSupported: "या ब्राउझरमध्ये स्पीच रिकग्निशन समर्थित नाही.", listening: "ऐकत आहे…", production: "प्रॉडक्शन", postAudit: "पोस्ट / ऑडिट टर्मिनल", analysis: "विश्लेषण", masterSlate: "मास्टर स्लेट", videoInput: "व्हिडिओ इनपुट", scene: "दृश्य", takeAnalysis: "टेक विश्लेषण", liveContinuitySlate: "लाइव्ह कंटिन्यूटी स्लेट" },
};

const languageNames: Record<Language, string> = { en: "English", hi: "हिन्दी", bn: "বাংলা", ta: "தமிழ்", te: "తెలుగు", mr: "मराठी" };
const pageTranslations: Record<string, Partial<Record<Language, string>>> = {
  "Dialogue continuity / AD": { hi: "डायलॉग कंटिन्यूटी / AD", bn: "ডায়ালগ কন্টিনিউটি / AD", ta: "உரையாடல் தொடர்ச்சி / AD", te: "డైలాగ్ కంటిన్యుటీ / AD", mr: "डायलॉग कंटिन्यूटी / AD" },
  "Command surface": { hi: "कमांड सतह", bn: "কমান্ড সারফেস", ta: "கமாண்ட் மேற்பரப்பு", te: "కమాండ్ ఉపరితలం", mr: "कमांड पृष्ठभाग" },
  "ACTIVE PROJECT": { hi: "सक्रिय प्रोजेक्ट", bn: "সক্রিয় প্রজেক্ট", ta: "செயலில் உள்ள திட்டம்", te: "యాక్టివ్ ప్రాజెక్ట్", mr: "सक्रिय प्रकल्प" },
  "ENGINE PIPELINE": { hi: "इंजन पाइपलाइन", bn: "ইঞ্জিন পাইপলাইন", ta: "எஞ்சின் பைப்லைன்", te: "ఇంజిన్ పైప్‌లైన్", mr: "इंजिन पाइपलाइन" },
  "FRAME DRIFT": { hi: "फ्रेम ड्रिफ्ट", bn: "ফ্রেম ড্রিফট", ta: "ஃபிரேம் டிரிஃப்ட்", te: "ఫ్రేమ్ డ్రిఫ్ట్", mr: "फ्रेम ड्रिफ्ट" },
  "AUDIO LATENCY": { hi: "ऑडियो विलंब", bn: "অডিও লেটেন্সি", ta: "ஆடியோ தாமதம்", te: "ఆడియో ఆలస్యం", mr: "ऑडिओ विलंब" },
  "Dialogue continuity analysis": { hi: "डायलॉग कंटिन्यूटी विश्लेषण", bn: "ডায়ালগ কন্টিনিউটি বিশ্লেষণ", ta: "உரையாடல் தொடர்ச்சி பகுப்பாய்வு", te: "డైలాగ్ కంటిన్యుటీ విశ్లేషణ", mr: "डायलॉग कंटिन्यूटी विश्लेषण" },
  "Comparing the uploaded take against the script reference and prior takes.": { hi: "अपलोड किए गए टेक की तुलना स्क्रिप्ट संदर्भ और पिछले टेक से की जा रही है।", bn: "আপলোড করা টেকটি স্ক্রিপ্ট রেফারেন্স ও আগের টেকের সঙ্গে তুলনা করা হচ্ছে।", ta: "பதிவேற்றிய டேக் ஸ்கிரிப்ட் குறிப்புடன் மற்றும் முந்தைய டேக்குகளுடன் ஒப்பிடப்படுகிறது.", te: "అప్‌లోడ్ చేసిన టేక్‌ను స్క్రిప్ట్ రిఫరెన్స్ మరియు మునుపటి టేక్‌లతో పోలుస్తున్నాము.", mr: "अपलोड केलेल्या टेकची स्क्रिप्ट संदर्भ आणि मागील टेकशी तुलना केली जात आहे." },
  "Upload another take": { hi: "दूसरा टेक अपलोड करें", bn: "আরেকটি টেক আপলোড করুন", ta: "மற்றொரு டேக்கை பதிவேற்றவும்", te: "మరొక టేక్ అప్‌లోడ్ చేయండి", mr: "दुसरा टेक अपलोड करा" },
  "Pipeline status": { hi: "पाइपलाइन स्थिति", bn: "পাইপলাইন স্ট্যাটাস", ta: "பைப்லைன் நிலை", te: "పైప్‌లైన్ స్థితి", mr: "पाइपलाइन स्थिती" },
  "Classification result": { hi: "वर्गीकरण परिणाम", bn: "শ্রেণিবিন্যাস ফলাফল", ta: "வகைப்படுத்தல் முடிவு", te: "వర్గీకరణ ఫలితం", mr: "वर्गीकरण निकाल" },
  "Camera media intake": { hi: "कैमरा मीडिया इनटेक", bn: "ক্যামেরা মিডিয়া ইনটেক", ta: "கேமரா மீடியா இன்டேக்", te: "కెమెరా మీడియా ఇన్‌టేక్", mr: "कॅमेरा मीडिया इनटेक" },
  "Scenes explorer": { hi: "दृश्य एक्सप्लोरर", bn: "দৃশ্য এক্সপ্লোরার", ta: "காட்சிகள் எக்ஸ்ப்ளோரர்", te: "సన్నివేశాల ఎక్స్‌ప్లోరర్", mr: "दृश्य एक्सप्लोरर" },
  "Continuity at a glance": { hi: "एक नज़र में कंटिन्यूटी", bn: "এক নজরে কন্টিনিউটি", ta: "ஒரு பார்வையில் தொடர்ச்சி", te: "ఒక చూపులో కంటిన్యుటీ", mr: "एका नजरेत कंटिन्यूटी" },
  "MASTER PRODUCTION SLATE": { hi: "मास्टर प्रोडक्शन स्लेट", bn: "মাস্টার প্রোডাকশন স্লেট", ta: "மாஸ்டர் தயாரிப்பு ஸ்லேட்", te: "మాస్టర్ ప్రొడక్షన్ స్లేట్", mr: "मास्टर प्रॉडक्शन स्लेट" },
  "Every scene, take and unresolved discrepancy in one operational surface.": { hi: "हर दृश्य, टेक और अनसुलझी विसंगति एक ही ऑपरेशनल सतह पर।", bn: "প্রতিটি দৃশ্য, টেক এবং অমীমাংসিত অসঙ্গতি এক অপারেশনাল সারফেসে।", ta: "ஒவ்வொரு காட்சியும் டேக்கும் தீராத முரண்பாடும் ஒரே செயல்பாட்டு மேற்பரப்பில்.", te: "ప్రతి సన్నివేశం, టేక్ మరియు పరిష్కరించని వ్యత్యాసం ఒకే ఆపరేషనల్ ఉపరితలంలో.", mr: "प्रत्येक दृश्य, टेक आणि न सुटलेली विसंगती एकाच ऑपरेशनल पृष्ठभागावर." },
  "Script intake": { hi: "स्क्रिप्ट इनटेक", bn: "স্ক্রিপ্ট ইনটেক", ta: "ஸ்கிரிப்ட் இன்டேக்", te: "స్క్రిప్ట్ ఇన్‌టేక్", mr: "स्क्रिप्ट इनटेक" },
  "Video upload": { hi: "वीडियो अपलोड", bn: "ভিডিও আপলোড", ta: "வீடியோ பதிவேற்றம்", te: "వీడియో అప్‌లోడ్", mr: "व्हिडिओ अपलोड" },
  "Scenes": { hi: "दृश्य", bn: "দৃশ্য", ta: "காட்சிகள்", te: "సన్నివేశాలు", mr: "दृश्ये" },
  "Continuity ledger": { hi: "कंटिन्यूटी लेजर", bn: "কন্টিনিউটি লেজার", ta: "தொடர்ச்சி லெட்ஜர்", te: "కంటిన్యుటీ లెడ్జర్", mr: "कंटिन्यूटी लेजर" },
  "READABILITY": { hi: "पठनीयता", bn: "পাঠযোগ্যতা", ta: "வாசிப்புத்திறன்", te: "చదవగలిగే సామర్థ్యం", mr: "वाचनीयता" },
  "VOICE": { hi: "आवाज़", bn: "ভয়েস", ta: "குரல்", te: "వాయిస్", mr: "आवाज" },
  "VISUAL": { hi: "दृश्य", bn: "ভিজ্যুয়াল", ta: "காட்சி", te: "విజువల్", mr: "दृश्य" },
  "RESET SETTINGS": { hi: "सेटिंग रीसेट करें", bn: "সেটিংস রিসেট করুন", ta: "அமைப்புகளை மீட்டமைக்கவும்", te: "సెట్టింగ్‌లను రీసెట్ చేయండి", mr: "सेटिंग रीसेट करा" },
  "READY": { hi: "तैयार", bn: "প্রস্তুত", ta: "தயார்", te: "సిద్ధంగా ఉంది", mr: "तयार" },
  "No records match current filter": { hi: "वर्तमान फ़िल्टर से कोई रिकॉर्ड नहीं मिला", bn: "বর্তমান ফিল্টারের সঙ্গে কোনো রেকর্ড মেলেনি", ta: "தற்போதைய வடிப்பானுடன் பதிவுகள் எதுவும் பொருந்தவில்லை", te: "ప్రస్తుత ఫిల్టర్‌కు రికార్డులు సరిపోలలేదు", mr: "सध्याच्या फिल्टरशी कोणतेही रेकॉर्ड जुळले नाहीत" },
};
function savedPreferences() { if (typeof window === "undefined") return {}; try { return JSON.parse(localStorage.getItem("echo-preferences") || "{}") as Record<string, unknown>; } catch { return {}; } }

type PreferencesContextValue = { theme: Theme; language: Language; t: (key: TranslationKey) => string; translateText: (text: string) => string; setTheme: (theme: Theme) => void; setLanguage: (language: Language) => void; textScale: number; setTextScale: (scale: number) => void; highContrast: boolean; setHighContrast: (value: boolean) => void; colorBlind: boolean; setColorBlind: (value: boolean) => void; dyslexiaFont: boolean; setDyslexiaFont: (value: boolean) => void; reduceMotion: boolean; setReduceMotion: (value: boolean) => void; languageNames: typeof languageNames };
const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const saved = savedPreferences();
  const [theme, setTheme] = useState<Theme>(saved.theme === "light" || saved.theme === "dark" ? saved.theme : "dark");
  const [language, setLanguage] = useState<Language>(typeof saved.language === "string" && saved.language in translations ? saved.language as Language : "en");
  const [textScale, setTextScale] = useState(typeof saved.textScale === "number" ? Math.min(1.25, Math.max(.9, saved.textScale)) : 1);
  const [highContrast, setHighContrast] = useState(Boolean(saved.highContrast));
  const [colorBlind, setColorBlind] = useState(Boolean(saved.colorBlind));
  const [dyslexiaFont, setDyslexiaFont] = useState(Boolean(saved.dyslexiaFont));
  const [reduceMotion, setReduceMotion] = useState(Boolean(saved.reduceMotion));
  const sourceNodes = useRef(new Map<Node, string>());

  const translateText = useCallback((text: string) => {
    const trimmed = text.trim();
    const translated = pageTranslations[trimmed]?.[language];
    return translated ? text.replace(trimmed, translated) : text;
  }, [language]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-light", theme === "light"); root.classList.toggle("a11y-high-contrast", highContrast); root.classList.toggle("a11y-color-blind", colorBlind); root.classList.toggle("a11y-dyslexia", dyslexiaFont); root.classList.toggle("a11y-reduce-motion", reduceMotion); root.style.setProperty("--a11y-text-scale", String(textScale)); root.lang = language;
    localStorage.setItem("echo-preferences", JSON.stringify({ theme, language, textScale, highContrast, colorBlind, dyslexiaFont, reduceMotion }));
    const translateTree = (parent: Node) => parent.childNodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) { const source = sourceNodes.current.get(node) ?? node.textContent; sourceNodes.current.set(node, source); node.textContent = translateText(source); } else if (node.nodeType === Node.ELEMENT_NODE && !(node as HTMLElement).matches("script,style")) translateTree(node); });
    translateTree(document.body);
    const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => translateTree(node))));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [theme, language, textScale, highContrast, colorBlind, dyslexiaFont, reduceMotion, translateText]);

  return <PreferencesContext.Provider value={{ theme, language, t: key => translations[language][key] ?? translations.en[key] ?? key, translateText, setTheme, setLanguage, textScale, setTextScale, highContrast, setHighContrast, colorBlind, setColorBlind, dyslexiaFont, setDyslexiaFont, reduceMotion, setReduceMotion, languageNames }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() { const value = useContext(PreferencesContext); if (!value) throw new Error("PreferencesProvider missing"); return value; }
export type { Language, TranslationKey };
